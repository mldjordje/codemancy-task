import { randomUUID } from "crypto";

export const createId = () => randomUUID();

export const nowIso = () => new Date().toISOString();

export const durationMs = (start: string, end: string) =>
  new Date(end).getTime() - new Date(start).getTime();

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
