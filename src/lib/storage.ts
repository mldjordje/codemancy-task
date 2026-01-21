import { kv } from "@vercel/kv";
import { defaultSettings } from "./settings";
import { AuditLog, FlowRun, Settings } from "./types";

type MemoryState = {
  settings: Settings;
  runs: FlowRun[];
  logs: AuditLog[];
  processed: Record<string, string>;
};

const KV_ENABLED = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

const globalForStore = globalThis as typeof globalThis & {
  __raffleStore?: MemoryState;
};

const memoryState: MemoryState =
  globalForStore.__raffleStore ?? {
    settings: { ...defaultSettings },
    runs: [],
    logs: [],
    processed: {},
  };

globalForStore.__raffleStore = memoryState;

const KV_KEYS = {
  settings: "raffle:settings",
  runs: "raffle:runs",
  logs: "raffle:logs",
  processed: "raffle:processed",
};

const getKv = async <T>(key: string, fallback: T): Promise<T> => {
  const value = await kv.get<T>(key);
  return value ?? fallback;
};

const setKv = async <T>(key: string, value: T) => {
  await kv.set(key, value);
};

const memoryStore = {
  async getSettings() {
    return memoryState.settings;
  },
  async saveSettings(settings: Settings) {
    memoryState.settings = settings;
  },
  async listRuns() {
    return memoryState.runs;
  },
  async getRun(runId: string) {
    return memoryState.runs.find((run) => run.runId === runId) ?? null;
  },
  async saveRun(run: FlowRun) {
    const index = memoryState.runs.findIndex((item) => item.runId === run.runId);
    if (index >= 0) {
      memoryState.runs[index] = run;
      return;
    }
    memoryState.runs.unshift(run);
  },
  async listLogs() {
    return memoryState.logs;
  },
  async appendLog(entry: AuditLog) {
    memoryState.logs.unshift(entry);
  },
  async getProcessedCustomer(customerId: string) {
    return memoryState.processed[customerId] ?? null;
  },
  async markCustomerProcessed(customerId: string, timestamp: string) {
    memoryState.processed[customerId] = timestamp;
  },
};

const kvStore = {
  async getSettings() {
    return getKv(KV_KEYS.settings, { ...defaultSettings });
  },
  async saveSettings(settings: Settings) {
    await setKv(KV_KEYS.settings, settings);
  },
  async listRuns() {
    return getKv(KV_KEYS.runs, []);
  },
  async getRun(runId: string) {
    const runs = await getKv<FlowRun[]>(KV_KEYS.runs, []);
    return runs.find((run) => run.runId === runId) ?? null;
  },
  async saveRun(run: FlowRun) {
    const runs = await getKv<FlowRun[]>(KV_KEYS.runs, []);
    const index = runs.findIndex((item) => item.runId === run.runId);
    if (index >= 0) {
      runs[index] = run;
    } else {
      runs.unshift(run);
    }
    await setKv(KV_KEYS.runs, runs);
  },
  async listLogs() {
    return getKv(KV_KEYS.logs, []);
  },
  async appendLog(entry: AuditLog) {
    const logs = await getKv<AuditLog[]>(KV_KEYS.logs, []);
    logs.unshift(entry);
    await setKv(KV_KEYS.logs, logs);
  },
  async getProcessedCustomer(customerId: string) {
    const processed = await getKv<Record<string, string>>(KV_KEYS.processed, {});
    return processed[customerId] ?? null;
  },
  async markCustomerProcessed(customerId: string, timestamp: string) {
    const processed = await getKv<Record<string, string>>(KV_KEYS.processed, {});
    processed[customerId] = timestamp;
    await setKv(KV_KEYS.processed, processed);
  },
};

export const getStorage = () => (KV_ENABLED ? kvStore : memoryStore);
