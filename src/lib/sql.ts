/**
 * One query interface over two engines.
 *
 *   postgres — used whenever DATABASE_URL / POSTGRES_URL is set. This is the
 *              hosted path (Vercel + Neon), where there is no local disk.
 *   sqlite   — the pipeline's own sponsors.db, used for local development so
 *              this app and the Python tooling keep sharing one file.
 *
 * Queries are written once with `?` placeholders; the driver rewrites them to
 * $1..$n for Postgres. Where the dialects genuinely differ, use the `frag`
 * helpers below rather than branching at every call site.
 */
import type { Database as SqliteDb } from "better-sqlite3";
import fs from "fs";
import path from "path";

export type Dialect = "sqlite" | "postgres";

const CONN =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";

export const dialect = (): Dialect => (CONN ? "postgres" : "sqlite");
export const isPostgres = () => dialect() === "postgres";

/* ------------------------------------------------------------- dialect bits */

/**
 * SQL fragments that differ between the two engines. Everything else in
 * queries.ts is portable as written.
 */
export const frag = {
  /** Count rows matching a condition: SQLite sums a boolean, Postgres filters. */
  sumIf: (cond: string) => (isPostgres() ? `COUNT(*) FILTER (WHERE ${cond})` : `SUM(${cond})`),

  /** Whole days between a stored YYYY-MM-DD text column and now. */
  daysSince: (col: string) =>
    isPostgres()
      ? `EXTRACT(EPOCH FROM (now() - (${col})::timestamptz)) / 86400`
      : `julianday('now') - julianday(${col})`,

  /** SQLite's `IS NOT 0` also matches NULL; Postgres needs IS DISTINCT FROM. */
  notZero: (col: string) => (isPostgres() ? `${col} IS DISTINCT FROM 0` : `${col} IS NOT 0`),

  /** Postgres has no round(double precision, int). */
  round1: (col: string) => (isPostgres() ? `ROUND((${col})::numeric, 1)` : `ROUND(${col}, 1)`),

  /** SQLite LIKE is case-insensitive for ASCII; Postgres needs ILIKE. */
  like: (col: string) => (isPostgres() ? `${col} ILIKE ?` : `${col} LIKE ?`),

  /** The stable shuffle used to break fit-score ties; int4 would overflow. */
  shuffle: (col: string) =>
    isPostgres() ? `((${col})::bigint * 2654435761) % 1000003` : `(${col} * 2654435761) % 1000003`,

  /** Insert-if-absent. */
  insertIgnorePipeline: () =>
    isPostgres()
      ? "INSERT INTO pipeline (sponsor_id) VALUES (?) ON CONFLICT (sponsor_id) DO NOTHING"
      : "INSERT OR IGNORE INTO pipeline (sponsor_id) VALUES (?)",

  /** Event timestamps stay TEXT in both engines so the Python side can read them. */
  now: () => (isPostgres() ? `to_char(now(), 'YYYY-MM-DD HH24:MI:SS')` : `datetime('now')`),
};

/* ------------------------------------------------------------------ sqlite */

type G = typeof globalThis & {
  __sponsor_sqlite?: SqliteDb;
  __sponsor_pg?: import("pg").Pool;
};
const g = globalThis as G;

const SQLITE_CANDIDATES = [
  process.env.SPONSORS_DB,
  path.join(process.cwd(), "..", "resumes", "sponsors.db"),
  path.join(process.cwd(), "sponsors.db"),
].filter(Boolean) as string[];

export function sqlitePath(): string {
  for (const p of SQLITE_CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error(
    `sponsors.db not found. Looked in:\n  ${SQLITE_CANDIDATES.join("\n  ")}\n` +
      `Set SPONSORS_DB to its full path, or set DATABASE_URL to use Postgres.`,
  );
}

function sqlite(): SqliteDb {
  if (!g.__sponsor_sqlite) {
    // Required lazily so the Postgres deployment never loads the native binding.
    const Database = require("better-sqlite3") as typeof import("better-sqlite3");
    const conn = new Database(sqlitePath(), { fileMustExist: true });
    conn.pragma("busy_timeout = 15000");
    conn.pragma("journal_mode = WAL");
    g.__sponsor_sqlite = conn;
  }
  return g.__sponsor_sqlite;
}

/* ---------------------------------------------------------------- postgres */

function pool(): import("pg").Pool {
  if (!g.__sponsor_pg) {
    const pg = require("pg") as typeof import("pg");
    // COUNT() and other int8 columns arrive as strings by default; the whole app
    // treats them as numbers.
    pg.types.setTypeParser(20, (v: string) => Number(v));
    pg.types.setTypeParser(1700, (v: string) => Number(v)); // numeric, from ROUND()
    g.__sponsor_pg = new pg.Pool({
      connectionString: CONN,
      ssl: /localhost|127\.0\.0\.1/.test(CONN) ? undefined : { rejectUnauthorized: false },
      // Serverless functions want a small pool; PG_POOL_MAX lets a constrained
      // environment (or a single-connection test server) pin it to 1.
      max: Number(process.env.PG_POOL_MAX) || 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return g.__sponsor_pg;
}

/** `?` → `$1..$n`, which is all the rewriting the shared SQL needs. */
export function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/* ------------------------------------------------------------------- api */

export async function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (isPostgres()) {
    const res = await pool().query(toPgPlaceholders(sql), params as never[]);
    return res.rows as T[];
  }
  return sqlite().prepare(sql).all(...(params as never[])) as T[];
}

export async function one<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  return (await all<T>(sql, params))[0];
}

export async function count(sql: string, params: unknown[] = []): Promise<number> {
  const row = await one<Record<string, unknown>>(sql, params);
  return row ? Number(Object.values(row)[0] ?? 0) : 0;
}

/** A statement runner handed to `tx` callbacks. */
export type Tx = {
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
};

/**
 * Runs a write transaction. SQLite takes the lock up front (BEGIN IMMEDIATE)
 * rather than upgrading a read lock later, which is what stops a background
 * discovery run from turning a UI action into SQLITE_BUSY.
 */
export async function tx<T>(fn: (q: Tx) => Promise<T>): Promise<T> {
  if (isPostgres()) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      const q: Tx = {
        run: async (sql, params = []) => {
          await client.query(toPgPlaceholders(sql), params as never[]);
        },
        all: async <T2,>(sql: string, params: unknown[] = []) =>
          (await client.query(toPgPlaceholders(sql), params as never[])).rows as T2[],
        one: async <T2,>(sql: string, params: unknown[] = []) =>
          (await client.query(toPgPlaceholders(sql), params as never[])).rows[0] as T2 | undefined,
      };
      const out = await fn(q);
      await client.query("COMMIT");
      return out;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  const conn = sqlite();
  conn.exec("BEGIN IMMEDIATE");
  const q: Tx = {
    run: async (sql, params = []) => {
      conn.prepare(sql).run(...(params as never[]));
    },
    all: async <T2,>(sql: string, params: unknown[] = []) =>
      conn.prepare(sql).all(...(params as never[])) as T2[],
    one: async <T2,>(sql: string, params: unknown[] = []) =>
      conn.prepare(sql).get(...(params as never[])) as T2 | undefined,
  };
  try {
    const out = await fn(q);
    conn.exec("COMMIT");
    return out;
  } catch (err) {
    conn.exec("ROLLBACK");
    throw err;
  }
}

/** Append to the audit trail the Python tooling also writes to. */
export async function logEvent(q: Tx, sponsorId: number | null, kind: string, detail: string) {
  await q.run(`INSERT INTO events (sponsor_id, ts, kind, detail) VALUES (?, ${frag.now()}, ?, ?)`, [
    sponsorId,
    kind,
    detail,
  ]);
}
