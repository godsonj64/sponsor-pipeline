import { NextResponse } from "next/server";
import { frag, logEvent, tx, ymd } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

/** Add one employer to a batch date without disturbing the rest of it. */
export async function POST(req: Request) {
  let body: { id?: unknown; date?: unknown; persona?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "A numeric sponsor id is required." }, { status: 400 });
  }
  const date = ymd(body.date) ?? tomorrow();

  try {
    const seq = await tx(async (q) => {
      const row = (await q.one<{ n: number }>(
        "SELECT COALESCE(MAX(batch_seq),0)+1 n FROM pipeline WHERE batch_date=?",
        [date],
      ))!;
      let persona = typeof body.persona === "string" && body.persona ? body.persona : null;
      if (!persona) {
        const best = await q.one<{ persona: string }>(
          "SELECT persona FROM fit WHERE sponsor_id=? ORDER BY score DESC LIMIT 1",
          [id],
        );
        persona = best?.persona ?? null;
      }
      await q.run(frag.insertIgnorePipeline(), [id]);
      await q.run(
        `UPDATE pipeline SET batch_date=?, batch_seq=?, persona=COALESCE(persona,?),
                status=COALESCE(NULLIF(status,''),'queued') WHERE sponsor_id=?`,
        [date, Number(row.n), persona, id],
      );
      await logEvent(q, id, "queue", date);
      return Number(row.n);
    });
    return NextResponse.json({ ok: true, id, date, seq });
  } catch (err) {
    console.error("[queue]", err);
    return NextResponse.json({ error: "The database rejected that write." }, { status: 500 });
  }
}
