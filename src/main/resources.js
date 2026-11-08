'use strict';

/**
 * Ressourcen-Manager: misst zentral alle 2 s, ordnet Prozesse zu, setzt
 * Limits durch und liefert die Daten für das Ressourcen-Panel.
 *
 * app.getAppMetrics() liefert die CPU-Last „seit dem letzten Aufruf“. Deshalb
 * misst nur dieser Manager; alle anderen lesen den letzten Schnappschuss.
 */

const HISTORY_LENGTH = 90; // 3 Minuten bei 2 s
const MAX_EVENTS = 6;

const SERVICE_NAMES = {
  'Network Service': 'Netzwerk-Dienst',
  'Audio Service': 'Audio-Dienst',
  'Storage Service': 'Speicher-Dienst',
  'Video Capture': 'Videoaufnahme',
  'Data Decoder Service': 'Daten-Decoder',
  'Utility: Network Service': 'Netzwerk-Dienst'
};

const round1 = (value) => Math.round(value * 10) / 10;

/**
 * Hintergrund-Tab mit dem höchsten Verbrauch wählen, der schlafen darf:
 * nicht aktiv/sichtbar, nicht angeheftet, spielt keinen Ton ab, schläft nicht.
 * @param {Array<object>} tabs   [{ id, active, visible, pinned, audible, sleeping }]
 * @param {Map<string, {cpu: number, memory: number}>} usage
 * @param {'cpu'|'memory'} key
 */
function pickTabToSleep(tabs, usage, key) {
  let best = null;
  let bestValue = -1;
  for (const tab of tabs) {
    if (tab.active || tab.visible || tab.pinned || tab.audible || tab.sleeping) continue;
    const value = usage.get(tab.id)?.[key] ?? 0;
    if (value > bestValue) {
      best = tab.id;
      bestValue = value;
    }
  }
  return best;
}

class ResourceManager {
  constructor({ app, os, webContents, getTabManager, getExtensions, getUiContents, jobLimiter, onEvent, intervalMs = 2000 }) {
    this.app = app;
    this.os = os;
    this.webContents = webContents;
    this.getTabManager = getTabManager;
    this.getExtensions = getExtensions;
    this.getUiContents = getUiContents;
    this.job = jobLimiter;
    this.onEvent = typeof onEvent === 'function' ? onEvent : () => {};
    this.intervalMs = intervalMs;

    this.cores = Math.max(1, os.cpus()?.length || 1);
    this.settings = { enabled: false, cpuLimit: 100, ramLimit: 0, hardCap: true, lowPriority: false };
    this.history = { cpu: [], memory: [] };
    this.events = [];
    this.latest = null;
    this.timer = null;

    this.hardCapActive = false;
    this.lowPriorityPids = new Set();
    this.overCpuSamples = 0;
    this.lastSleepAt = 0;
    this.lastRamWarningAt = 0;
  }

  start() {
    if (this.timer) return;
    this.sample();
    this.timer = setInterval(() => this.sample(), this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /* ---------------------------------------------------------- Einstellungen */

  applySettings(performance = {}) {
    const previous = this.settings;
    this.settings = { ...previous, ...performance };
    const { enabled, cpuLimit, hardCap, lowPriority } = this.settings;
    const cpuActive = enabled && cpuLimit < 100;

    // Hartes Limit (Windows-Job-Objekt)
    const wantHard = cpuActive && hardCap;
    if (wantHard && this.job?.available()) {
      // Bekannte Prozesse sofort zuordnen, neue folgen beim nächsten Messen.
      this.job.assign([process.pid, ...(this.latest?.processes || []).map((row) => row.pid).filter(Boolean)]);
      this.hardCapActive = this.job.setCpuLimit(cpuLimit);
    } else if (this.hardCapActive) {
      this.job?.setCpuLimit(null);
      this.hardCapActive = false;
    }

    // Niedrige Priorität
    if (!(enabled && lowPriority)) this.restorePriority();

    if (previous.enabled !== enabled) {
      this.addEvent(enabled ? 'Limits aktiviert' : 'Limits deaktiviert');
    }
    this.overCpuSamples = 0;
  }

  /** Hintergrund-Drosselung ist jetzt Standard (tabs.js); hier nichts mehr zu tun. */
  onTabCreated() {}

  restorePriority() {
    const normal = this.os.constants?.priority?.PRIORITY_NORMAL ?? 0;
    for (const pid of this.lowPriorityPids) {
      try { this.os.setPriority(pid, normal); } catch {}
    }
    this.lowPriorityPids.clear();
  }

  applyLowPriority(pids) {
    const low = this.os.constants?.priority?.PRIORITY_BELOW_NORMAL ?? 10;
    for (const pid of pids) {
      if (this.lowPriorityPids.has(pid)) continue;
      try {
        this.os.setPriority(pid, low);
        this.lowPriorityPids.add(pid);
      } catch {}
    }
  }

  /* ---------------------------------------------------------------- Messen */

  sample() {
    let metrics;
    try {
      metrics = this.app.getAppMetrics();
    } catch {
      return;
    }

    const pids = metrics.map((metric) => metric.pid);
    if (this.hardCapActive) {
      this.job.assign(pids);
      this.job.prune(pids);
    }
    if (this.settings.enabled && this.settings.lowPriority) this.applyLowPriority(pids);

    const owners = this.mapOwners();
    const manager = this.getTabManager();
    const processes = [];
    const usageByTab = new Map();
    let totalCpu = 0;
    let totalMemory = 0;

    for (const metric of metrics) {
      const cpu = round1((metric.cpu?.percentCPUUsage || 0) / this.cores);
      const memory = Math.round((metric.memory?.workingSetSize || 0) / 1024);
      totalCpu += cpu;
      totalMemory += memory;

      const row = this.describe(metric, owners.get(metric.pid), cpu, memory);
      processes.push(row);
      for (const tabId of row.tabIds) {
        const current = usageByTab.get(tabId) || { cpu: 0, memory: 0 };
        usageByTab.set(tabId, { cpu: current.cpu + cpu, memory: current.memory + memory });
      }
    }

    // Schlafende Tabs ohne Prozess trotzdem auflisten.
    for (const tab of manager?.tabs.values() || []) {
      if (!tab.sleeping) continue;
      processes.push({
        pid: null,
        kind: 'tab',
        name: tab.title || tab.url || 'Tab',
        detail: 'Schläft',
        cpu: 0,
        memory: 0,
        tabIds: [tab.id],
        tabId: tab.id,
        sleeping: true,
        actions: ['wake', 'close']
      });
    }

    totalCpu = round1(Math.min(100, totalCpu));
    this.push(this.history.cpu, totalCpu);
    this.push(this.history.memory, totalMemory);

    this.govern({ totalCpu, totalMemory, usageByTab });

    this.latest = {
      time: Date.now(),
      cores: this.cores,
      systemMemory: Math.round(this.os.totalmem() / 1024 / 1024),
      cpu: totalCpu,
      memory: totalMemory,
      tabCount: manager?.tabs.size || 0,
      sleepingCount: [...(manager?.tabs.values() || [])].filter((tab) => tab.sleeping).length,
      history: { cpu: [...this.history.cpu], memory: [...this.history.memory] },
      processes,
      settings: { ...this.settings },
      hardCap: {
        available: Boolean(this.job?.available()),
        active: this.hardCapActive,
        reason: this.job?.reason() || ''
      },
      events: [...this.events]
    };
  }

  push(list, value) {
    list.push(value);
    if (list.length > HISTORY_LENGTH) list.shift();
  }

  /** pid -> Besitzer (Tabs, Erweiterungen, Oberfläche) aus allen WebContents. */
  mapOwners() {
    const owners = new Map();
    const manager = this.getTabManager();
    const ui = this.getUiContents();
    const extensions = this.getExtensions() || [];

    for (const contents of this.webContents.getAllWebContents()) {
      if (contents.isDestroyed()) continue;
      let pid;
      try { pid = contents.getOSProcessId(); } catch { continue; }
      if (!pid) continue;
      const entry = owners.get(pid) || { tabs: [], extensions: new Set(), ui: false, other: [] };

      const tab = manager?.findByContents(contents);
      const url = contents.getURL() || '';
      if (tab) {
        entry.tabs.push(tab);
      } else if (contents === ui) {
        entry.ui = true;
      } else if (url.startsWith('chrome-extension://')) {
        const id = url.slice('chrome-extension://'.length).split('/')[0];
        entry.extensions.add(extensions.find((item) => item.id === id)?.name || id);
      } else {
        entry.other.push(contents.getTitle() || url || contents.getType());
      }
      owners.set(pid, entry);
    }
    return owners;
  }

  describe(metric, owner, cpu, memory) {
    const base = { pid: metric.pid, cpu, memory, tabIds: [], tabId: null, sleeping: false, actions: [] };
    const manager = this.getTabManager();

    if (metric.type === 'Browser') {
      return { ...base, kind: 'browser', name: 'JTech Browser', detail: 'Hauptprozess' };
    }
    if (owner?.ui) {
      return { ...base, kind: 'ui', name: 'Browser-Oberfläche', detail: 'Tabs, Toolbar, Overlays' };
    }
    if (owner?.tabs.length) {
      const [first] = owner.tabs;
      const visible = first.id === manager?.activeId;
      return {
        ...base,
        kind: 'tab',
        name: owner.tabs.map((tab) => tab.title || tab.url || 'Tab').join(', '),
        detail: owner.tabs.length > 1 ? `${owner.tabs.length} Tabs` : (visible ? 'Aktiver Tab' : 'Tab'),
        tabIds: owner.tabs.map((tab) => tab.id),
        tabId: first.id,
        actions: visible ? ['close'] : ['sleep', 'close']
      };
    }
    if (owner?.extensions.size) {
      return { ...base, kind: 'extension', name: [...owner.extensions].join(', '), detail: 'Erweiterung', actions: ['kill'] };
    }
    if (metric.type === 'GPU') {
      return { ...base, kind: 'gpu', name: 'GPU-Prozess', detail: 'Grafik', actions: ['kill'] };
    }
    if (metric.type === 'Utility') {
      const name = SERVICE_NAMES[metric.name] || metric.name || metric.serviceName || 'Dienst';
      return { ...base, kind: 'service', name, detail: 'Dienst', actions: ['kill'] };
    }
    const other = owner?.other?.filter(Boolean).join(', ');
    return { ...base, kind: 'renderer', name: other || 'Renderer', detail: metric.type || 'Prozess', actions: ['kill'] };
  }

  /* ---------------------------------------------------------------- Regeln */

  govern({ totalCpu, totalMemory, usageByTab }) {
    const { enabled, cpuLimit, ramLimit } = this.settings;
    if (!enabled) return;
    const manager = this.getTabManager();
    if (!manager) return;
    const now = Date.now();

    const tabs = [...manager.tabs.values()].map((tab) => ({
      id: tab.id,
      title: tab.title,
      active: tab.id === manager.activeId,
      visible: manager.splitMode && (tab.id === manager.splitLeftId || tab.id === manager.splitRightId),
      pinned: tab.pinned,
      audible: tab.audible,
      sleeping: tab.sleeping || !tab.view
    }));

    // RAM: über dem Limit den speicherhungrigsten Hintergrund-Tab schlafen legen.
    if (ramLimit > 0 && totalMemory > ramLimit && now - this.lastSleepAt > 6000) {
      const id = pickTabToSleep(tabs, usageByTab, 'memory');
      if (id) {
        this.sleepTab(id, `RAM-Limit (${totalMemory} / ${ramLimit} MB)`);
      } else if (now - this.lastRamWarningAt > 60000) {
        this.lastRamWarningAt = now;
        this.addEvent(`RAM-Limit überschritten (${totalMemory} MB), keine Hintergrund-Tabs mehr zum Schlafenlegen`);
      }
      return;
    }

    // CPU: dauerhaft am Limit -> größten CPU-Verbraucher im Hintergrund schlafen legen.
    if (cpuLimit < 100) {
      const threshold = this.hardCapActive ? cpuLimit * 0.95 : cpuLimit * 1.05;
      this.overCpuSamples = totalCpu >= threshold ? this.overCpuSamples + 1 : 0;
      if (this.overCpuSamples >= 3 && now - this.lastSleepAt > 15000) {
        const id = pickTabToSleep(tabs, usageByTab, 'cpu');
        if (id && (usageByTab.get(id)?.cpu || 0) >= 1) {
          this.sleepTab(id, `CPU-Limit (${totalCpu} % / ${cpuLimit} %)`);
          this.overCpuSamples = 0;
        }
      }
    }
  }

  sleepTab(id, reason) {
    const manager = this.getTabManager();
    const tab = manager?.tabs.get(id);
    if (!tab) return;
    manager.sleep(id);
    this.lastSleepAt = Date.now();
    this.addEvent(`„${tab.title || 'Tab'}“ schlafen gelegt – ${reason}`);
  }

  addEvent(text) {
    this.events.unshift({ time: Date.now(), text });
    if (this.events.length > MAX_EVENTS) this.events.length = MAX_EVENTS;
    this.onEvent(text);
  }

  /* ---------------------------------------------------------------- Aktionen */

  snapshot() {
    if (!this.latest) this.sample();
    return this.latest;
  }

  action({ type, pid, tabId } = {}) {
    const manager = this.getTabManager();
    if (!manager) return false;

    if (type === 'close' && manager.tabs.has(tabId)) {
      manager.close(tabId);
    } else if (type === 'sleep' && manager.tabs.has(tabId) && tabId !== manager.activeId) {
      manager.sleep(tabId);
    } else if (type === 'wake' && manager.tabs.has(tabId)) {
      manager.wake(tabId);
      manager.emit();
    } else if (type === 'kill' && Number.isInteger(pid)) {
      // Nur Hilfsprozesse beenden: nie den Hauptprozess, die Oberfläche oder Tabs
      // (Tabs werden geschlossen bzw. schlafen gelegt).
      const row = this.latest?.processes.find((entry) => entry.pid === pid);
      if (!row || !row.actions.includes('kill')) return false;
      try {
        process.kill(pid);
        this.addEvent(`Prozess „${row.name}“ beendet`);
      } catch {
        return false;
      }
    } else {
      return false;
    }

    // Kein neues Messen hier: getAppMetrics() würde die CPU-Werte verfälschen.
    // Das Panel aktualisiert sich beim nächsten Takt.
    return true;
  }
}

module.exports = { ResourceManager, pickTabToSleep };
