'use strict';

/**
 * Hartes CPU-Limit über ein Windows-Job-Objekt.
 *
 * Alle Prozesse des Browsers (Hauptprozess, Tabs, GPU, Dienste) werden einem
 * Job zugeordnet. Windows begrenzt dann die gemeinsame CPU-Zeit des Jobs
 * (JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP). Der Browser wird bei Volllast
 * langsamer, aber nicht instabil.
 *
 * Benötigt das Paket „koffi“ (FFI ohne Kompilieren). Fehlt es oder läuft der
 * Browser nicht unter Windows, meldet available() false und der Aufrufer
 * fällt auf die sanfte Regelung zurück.
 */

const JobObjectCpuRateControlInformation = 15;
const JOB_OBJECT_CPU_RATE_CONTROL_ENABLE = 0x1;
const JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP = 0x4;
const PROCESS_SET_QUOTA = 0x0100;
const PROCESS_TERMINATE = 0x0001;

/**
 * JOBOBJECT_CPU_RATE_CONTROL_INFORMATION als Buffer (8 Byte):
 * DWORD ControlFlags, DWORD CpuRate (Anteil der Gesamt-CPU in 1/100 %).
 * percent = null schaltet das Limit ab.
 */
function cpuRateBuffer(percent) {
  const buffer = Buffer.alloc(8);
  if (percent == null) return buffer;
  const clamped = Math.min(100, Math.max(1, Number(percent) || 0));
  buffer.writeUInt32LE(JOB_OBJECT_CPU_RATE_CONTROL_ENABLE | JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP, 0);
  buffer.writeUInt32LE(Math.round(clamped * 100), 4);
  return buffer;
}

function createJobLimiter({ platform = process.platform, loadKoffi = () => require('koffi') } = {}) {
  let api = null;
  let job = null;
  let reason = '';
  const assigned = new Set();

  function init() {
    if (api || reason) return Boolean(api);
    if (platform !== 'win32') {
      reason = 'Nur unter Windows verfügbar.';
      return false;
    }
    try {
      const koffi = loadKoffi();
      const kernel32 = koffi.load('kernel32.dll');
      api = {
        CreateJobObjectW: kernel32.func('void * __stdcall CreateJobObjectW(void *attributes, void *name)'),
        SetInformationJobObject: kernel32.func('int __stdcall SetInformationJobObject(void *job, int infoClass, void *info, uint32_t length)'),
        AssignProcessToJobObject: kernel32.func('int __stdcall AssignProcessToJobObject(void *job, void *process)'),
        OpenProcess: kernel32.func('void * __stdcall OpenProcess(uint32_t access, int inherit, uint32_t pid)'),
        CloseHandle: kernel32.func('int __stdcall CloseHandle(void *handle)')
      };
      job = api.CreateJobObjectW(null, null);
      if (!job) throw new Error('CreateJobObjectW fehlgeschlagen');
      return true;
    } catch (error) {
      api = null;
      job = null;
      reason = error?.code === 'MODULE_NOT_FOUND'
        ? 'Paket „koffi“ fehlt – im Projektordner „npm install“ ausführen.'
        : `Job-Objekt nicht verfügbar: ${error?.message || error}`;
      return false;
    }
  }

  /** Prozesse dem Job zuordnen (bereits zugeordnete werden übersprungen). */
  function assign(pids) {
    if (!init()) return 0;
    let added = 0;
    for (const pid of pids) {
      if (!Number.isInteger(pid) || pid <= 0 || assigned.has(pid)) continue;
      const handle = api.OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid);
      if (!handle) continue;
      try {
        if (api.AssignProcessToJobObject(job, handle)) {
          assigned.add(pid);
          added += 1;
        }
      } finally {
        api.CloseHandle(handle);
      }
    }
    return added;
  }

  /** Beendete Prozesse vergessen, damit die Liste nicht wächst. */
  function prune(alivePids) {
    const alive = new Set(alivePids);
    for (const pid of assigned) if (!alive.has(pid)) assigned.delete(pid);
  }

  /** percent = null oder >= 100 hebt das Limit auf. */
  function setCpuLimit(percent) {
    if (!init()) return false;
    const value = percent == null || percent >= 100 ? null : percent;
    const info = cpuRateBuffer(value);
    return Boolean(api.SetInformationJobObject(job, JobObjectCpuRateControlInformation, info, info.length));
  }

  return {
    available: () => init(),
    reason: () => (init() ? '' : reason),
    assign,
    prune,
    setCpuLimit,
    assignedCount: () => assigned.size
  };
}

module.exports = { createJobLimiter, cpuRateBuffer };
