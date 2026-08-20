#!/usr/bin/env node
/**
 * Copies sponsors.db into Postgres.
 *
 *   DATABASE_URL=postgres://… node scripts/migrate-to-postgres.mjs [--fresh]
 *
 * --fresh drops the existing rows first. Without it, the script refuses to run
 * against a database that already holds data, so a re-run can't silently double
 * everything up.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import pg from "pg";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");

const CONN = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
if (!CONN) {
  console.error("Set DATABASE_URL to your Postgres connection string.");
  process.exit(1);
}

const SQLITE =
  process.env.SPONSORS_DB ||
  [path.join(ROOT, "..", "resumes", "sponsors.db"), path.join(ROOT, "sponsors.db")].find((p) =>
    fs.existsSync(p),
  );
if (!SQLITE || !fs.existsSync(SQLITE)) {
  console.error("sponsors.db not found. Set SPONSORS_DB to its full path.");
  process.exit(1);
}

const FRESH = process.argv.includes("--fresh");

/** Column lists are read from SQLite so the script survives schema drift. */
const TABLES = ["sponsors", "routes", "fit", "enrichment", "pipeline", "vacancies", "events"];
const CHUNK = 400;

const src = new Database(SQLITE, { readonly: true, fileMustExist: true });
const pool = new pg.Pool({
  connectionString: CONN,
  ssl: /localhost|127\.0\.0\.1/.test(CONN) ? undefined : { rejectUnauthorized: false },
  max: 1,
});

const fmt = (n) => n.toLocaleString("en-GB");

async function main() {
  const started = Date.now();
  console.log(`source  ${SQLITE}`);
  console.log(`target  ${CONN.replace(/:[^:@/]+@/, ":***@")}\n`);

  console.log("creating schema…");
  await pool.query(fs.readFileSync(path.join(HERE, "schema.sql"), "utf8"));

  const existing = Number((await pool.query("SELECT COUNT(*) n FROM sponsors")).rows[0].n);
  if (existing > 0 && !FRESH) {
    console.error(
      `\nTarget already holds ${fmt(existing)} sponsors. Re-run with --fresh to replace them.`,
    );
    process.exit(1);
  }
  if (FRESH) {
    console.log("clearing existing rows…");
    await pool.query(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY`);
  }

  let grand = 0;
  for (const table of TABLES) {
    const cols = src
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((c) => c.name);
    const total = src.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;
    if (total === 0) {
      console.log(`${table.padEnd(11)} empty`);
      continue;
    }

    const quoted = cols.map((c) => `"${c}"`).join(", ");
    const rows = src.prepare(`SELECT ${quoted} FROM ${table}`).iterate();

    let batch = [];
    let done = 0;
    const flush = async () => {
      if (batch.length === 0) return;
      const params = [];
      const tuples = batch.map((row) => {
        const slots = cols.map((c) => {
          params.push(row[c] ?? null);
          return `$${params.length}`;
        });
        return `(${slots.join(",")})`;
      });
      await pool.query(
        `INSERT INTO ${table} (${quoted}) VALUES ${tuples.join(",")} ON CONFLICT DO NOTHING`,
        params,
      );
      done += batch.length;
      batch = [];
      process.stdout.write(`\r${table.padEnd(11)} ${fmt(done)} / ${fmt(total)}`);
    };

    for (const row of rows) {
      batch.push(row);
      if (batch.length >= CHUNK) await flush();
    }
    await flush();
    process.stdout.write(`\r${table.padEnd(11)} ${fmt(done)} / ${fmt(total)}  ✓\n`);
    grand += done;
  }

  // The events id column was fed explicit values; move the sequence past them.
  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('events', 'event_id'),
      GREATEST((SELECT COALESCE(MAX(event_id), 0) FROM events), 1)
    )`);

  console.log(`\n${fmt(grand)} rows in ${Math.round((Date.now() - started) / 1000)}s`);

  const check = await pool.query(`
    SELECT (SELECT COUNT(*) FROM sponsors) sponsors,
           (SELECT COUNT(*) FROM fit) fit,
           (SELECT COUNT(*) FROM pipeline) pipeline,
           (SELECT COUNT(*) FROM vacancies) vacancies`);
  console.log("target now holds:", check.rows[0]);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error("\nmigration failed:", err.message);
    await pool.end();
    process.exit(1);
  });
