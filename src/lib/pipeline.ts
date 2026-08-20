/**
 * Pipeline vocabulary and pure helpers.
 *
 * Deliberately free of any database import: client components need these
 * constants, and pulling them from lib/db would drag the native SQLite binding
 * into the browser bundle.
 */
export const STATUSES = [
  "queued",
  "researched",
  "drafted",
  "applied",
  "replied",
  "rejected",
  "skipped",
] as const;

export type Status = (typeof STATUSES)[number];

export const isStatus = (v: unknown): v is Status =>
  typeof v === "string" && (STATUSES as readonly string[]).includes(v);

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

/** Only ever let a real date reach a query. */
export const ymd = (v: unknown): string | null =>
  typeof v === "string" && DATE_RX.test(v.trim()) ? v.trim() : null;

export const today = () => new Date().toISOString().slice(0, 10);
