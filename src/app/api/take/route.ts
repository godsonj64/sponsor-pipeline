import { NextResponse } from "next/server";
import { logEvent, write, ymd } from "@/lib/db";
import { personas } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

/** Queue the top N unworked targets for a persona onto a date. */
export async function POST(req: Request) {
  let body: { n?: unknown; persona?: unknown; date?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const n = Math.max(1, Math.min(200, Number(body.n) || 10));
  const persona = typeof body.persona === "string" ? body.persona : "";
  if (!personas().includes(persona)) {
    return NextResponse.json({ error: `Unknown persona: ${persona || "(none)"}` }, { status: 400 });
  }
  const date = ymd(body.date) ?? tomorrow();

  try {
    const added = write((conn) => {
      const candidates = conn
        .prepare(
          `SELECT s.sponsor_id id, f.score FROM sponsors s
             JOIN fit f USING(sponsor_id)
             LEFT JOIN pipeline p USING(sponsor_id)
             LEFT JOIN enrichment e USING(sponsor_id)
            WHERE f.persona=? AND s.has_skilled_worker=1 AND s.is_franchise=0
              AND s.is_canonical=1 AND p.sponsor_id IS NULL
              AND (e.ch_status IS NULL OR e.ch_status='Active')
              AND (e.ch_size_band IS NULL OR e.ch_size_band<>'dormant')
            ORDER BY f.score DESC, (s.sponsor_id*2654435761)%1000003 LIMIT ?`,
        )
        .all(persona, n) as { id: number; score: number }[];

      let seq = (
        conn.prepare("SELECT COALESCE(MAX(batch_seq),0) n FROM pipeline WHERE batch_date=?").get(date) as {
          n: number;
        }
      ).n;

      const ins = conn.prepare("INSERT OR IGNORE INTO pipeline (sponsor_id) VALUES (?)");
      const upd = conn.prepare(
        `UPDATE pipeline SET batch_date=?, batch_seq=?, persona=?, priority=?, status='queued'
          WHERE sponsor_id=?`,
      );
      for (const c of candidates) {
        seq += 1;
        ins.run(c.id);
        upd.run(date, seq, persona, c.score, c.id);
        logEvent(conn, c.id, "queue", date);
      }
      return candidates.length;
    });

    return NextResponse.json({ ok: true, added, date, persona });
  } catch (err) {
    console.error("[take]", err);
    return NextResponse.json({ error: "The database rejected that write." }, { status: 500 });
  }
}
