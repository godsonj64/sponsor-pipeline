/**
 * Read/write access to the sponsor pipeline's SQLite database.
 *
 * The same file is used by the existing Python CLI and Flask UI, so writes here
 * take the same care those do: a busy timeout, and an immediate transaction so
 * a long-running discovery job can't turn a UI action into SQLITE_BUSY.
 */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const CANDIDATES = [
  process.env.SPONSORS_DB,
  path.join(process.cwd(), "..", "resumes", "sponsors.db"),
  path.join(process.cwd(), "sponsors.db"),
].filter(Boolean) as string[];

function resolveDbPath(): string {
  for (const p of CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error(
    `sponsors.db not found. Looked in:\n  ${CANDIDATES.join("\n  ")}\nSet SPONSORS_DB to its full path.`,
  );
}

type G = typeof globalThis & { __sponsor_db?: Database.Database };
const g = globalThis as G;

export function db(): Database.Database {
  if (!g.__sponsor_db) {
    const conn = new Database(resolveDbPath(), { fileMustExist: true });
    conn.pragma("busy_timeout = 15000");
    conn.pragma("journal_mode = WAL");
    g.__sponsor_db = conn;
  }
  return g.__sponsor_db;
}

export const dbPath = () => resolveDbPath();

export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  return db().prepare(sql).all(...(params as never[])) as T[];
}

export function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  return db().prepare(sql).get(...(params as never[])) as T | undefined;
}

export function count(sql: string, params: unknown[] = []): number {
  const row = db().prepare(sql).get(...(params as never[])) as Record<string, number> | undefined;
  return row ? Number(Object.values(row)[0] ?? 0) : 0;
}

/** Wraps writes in BEGIN IMMEDIATE so the lock is taken up front, not upgraded. */
export function write<T>(fn: (conn: Database.Database) => T): T {
  const conn = db();
  const run = conn.transaction(fn);
  return run.immediate(conn);
}

/** Append to the shared audit trail the Python side also writes to. */
export function logEvent(
  conn: Database.Database,
  sponsorId: number | null,
  kind: string,
  detail: string,
) {
  conn
    .prepare("INSERT INTO events (sponsor_id, ts, kind, detail) VALUES (?, datetime('now'), ?, ?)")
    .run(sponsorId, kind, detail);
}

export { STATUSES, isStatus, ymd, today } from "./pipeline";
export type { Status } from "./pipeline";
