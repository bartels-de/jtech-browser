'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { pickTabToSleep, ResourceManager } = require('../src/main/resources');
const { cpuRateBuffer, createJobLimiter } = require('../src/main/job-limit');
const { normalizePerformance, DEFAULT_SETTINGS } = require('../src/main/config');

test('pickTabToSleep wählt den größten Verbraucher im Hintergrund', () => {
  const tabs = [
    { id: 'aktiv', active: true },
    { id: 'musik', audible: true },
    { id: 'pin', pinned: true },
    { id: 'schlaeft', sleeping: true },
    { id: 'klein' },
    { id: 'gross' }
  ];
  const usage = new Map([
    ['aktiv', { cpu: 90, memory: 2000 }],
    ['musik', { cpu: 50, memory: 1500 }],
    ['pin', { cpu: 40, memory: 1200 }],
    ['klein', { cpu: 2, memory: 100 }],
    ['gross', { cpu: 30, memory: 900 }]
  ]);
  assert.equal(pickTabToSleep(tabs, usage, 'memory'), 'gross');
  assert.equal(pickTabToSleep(tabs, usage, 'cpu'), 'gross');
  assert.equal(pickTabToSleep([{ id: 'a', active: true }], usage, 'cpu'), null);
});

test('cpuRateBuffer kodiert das harte CPU-Limit für Windows', () => {
  const on = cpuRateBuffer(30);
  assert.equal(on.length, 8);
  assert.equal(on.readUInt32LE(0), 0x1 | 0x4);
  assert.equal(on.readUInt32LE(4), 3000);
  const off = cpuRateBuffer(null);
  assert.equal(off.readUInt32LE(0), 0);
});

test('Job-Limit fällt ohne Windows oder koffi sauber zurück', () => {
  const linux = createJobLimiter({ platform: 'linux' });
  assert.equal(linux.available(), false);
  assert.match(linux.reason(), /Windows/);
  assert.equal(linux.setCpuLimit(50), false);

  const missing = createJobLimiter({
    platform: 'win32',
    loadKoffi: () => { const error = new Error('fehlt'); error.code = 'MODULE_NOT_FOUND'; throw error; }
  });
  assert.equal(missing.available(), false);
  assert.match(missing.reason(), /koffi/);
});

test('normalizePerformance begrenzt Limits auf sinnvolle Werte', () => {
  assert.deepEqual(normalizePerformance({}), DEFAULT_SETTINGS.performance);
  const value = normalizePerformance({ enabled: true, cpuLimit: 3, ramLimit: 100, hardCap: 'ja', lowPriority: true });
  assert.equal(value.enabled, true);
  assert.equal(value.cpuLimit, 10);
  assert.equal(value.ramLimit, 512);
  assert.equal(value.hardCap, DEFAULT_SETTINGS.performance.hardCap);
  assert.equal(value.lowPriority, true);
  assert.equal(normalizePerformance({ cpuLimit: 999, ramLimit: 0 }).cpuLimit, 100);
  assert.equal(normalizePerformance({ ramLimit: -5 }).ramLimit, 0);
  assert.equal(normalizePerformance({ ramLimit: 4100 }).ramLimit, 4096);
});

function fakeEnvironment({ metrics, tabs }) {
  const slept = [];
  const manager = {
    activeId: 'aktiv',
    splitMode: false,
    tabs: new Map(tabs.map((tab) => [tab.id, { ...tab, view: { webContents: tab.contents } }])),
    findByContents(contents) {
      return [...this.tabs.values()].find((tab) => tab.view?.webContents === contents) || null;
    },
    sleep(id) { slept.push(id); this.tabs.get(id).sleeping = true; },
    close() {},
    wake() {},
    emit() {}
  };
  const resources = new ResourceManager({
    app: { getAppMetrics: () => metrics },
    os: { cpus: () => [{}, {}, {}, {}], totalmem: () => 16 * 1024 ** 3, constants: { priority: {} }, setPriority() {} },
    webContents: { getAllWebContents: () => tabs.map((tab) => tab.contents) },
    getTabManager: () => manager,
    getExtensions: () => [],
    getUiContents: () => null,
    jobLimiter: createJobLimiter({ platform: 'linux' })
  });
  return { resources, slept };
}

const contents = (pid, url = 'https://example.com') => ({
  isDestroyed: () => false,
  getOSProcessId: () => pid,
  getURL: () => url,
  getTitle: () => url,
  getType: () => 'window',
  setBackgroundThrottling() {}
});

test('Ressourcen-Manager ordnet Prozesse zu und normiert die CPU auf alle Kerne', () => {
  const { resources } = fakeEnvironment({
    metrics: [
      { pid: 1, type: 'Browser', cpu: { percentCPUUsage: 40 }, memory: { workingSetSize: 200 * 1024 } },
      { pid: 2, type: 'Tab', cpu: { percentCPUUsage: 80 }, memory: { workingSetSize: 500 * 1024 } },
      { pid: 3, type: 'GPU', cpu: { percentCPUUsage: 0 }, memory: { workingSetSize: 100 * 1024 } }
    ],
    tabs: [{ id: 'aktiv', title: 'YouTube', contents: contents(2) }]
  });
  const snapshot = resources.snapshot();
  assert.equal(snapshot.cpu, 30); // (40 + 80) / 4 Kerne
  assert.equal(snapshot.memory, 800);
  const tab = snapshot.processes.find((row) => row.pid === 2);
  assert.equal(tab.kind, 'tab');
  assert.equal(tab.name, 'YouTube');
  assert.deepEqual(tab.actions, ['close']); // aktiver Tab: nur schließen
  assert.equal(snapshot.processes.find((row) => row.pid === 1).kind, 'browser');
  assert.deepEqual(snapshot.processes.find((row) => row.pid === 3).actions, ['kill']);
});

test('RAM-Limit legt den speicherhungrigsten Hintergrund-Tab schlafen', () => {
  const { resources, slept } = fakeEnvironment({
    metrics: [
      { pid: 1, type: 'Browser', cpu: { percentCPUUsage: 0 }, memory: { workingSetSize: 300 * 1024 } },
      { pid: 2, type: 'Tab', cpu: { percentCPUUsage: 0 }, memory: { workingSetSize: 400 * 1024 } },
      { pid: 3, type: 'Tab', cpu: { percentCPUUsage: 0 }, memory: { workingSetSize: 900 * 1024 } },
      { pid: 4, type: 'Tab', cpu: { percentCPUUsage: 0 }, memory: { workingSetSize: 200 * 1024 } }
    ],
    tabs: [
      { id: 'aktiv', title: 'Aktiv', contents: contents(2) },
      { id: 'gross', title: 'Groß', contents: contents(3) },
      { id: 'klein', title: 'Klein', contents: contents(4) }
    ]
  });
  resources.applySettings({ enabled: true, cpuLimit: 100, ramLimit: 1024 });
  resources.sample();
  assert.deepEqual(slept, ['gross']);
  assert.match(resources.snapshot().events[0].text, /Groß.*RAM-Limit/);
});
