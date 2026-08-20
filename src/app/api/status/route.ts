import { NextResponse } from "next/server";
import { frag, isStatus, logEvent, today, tx, STATUSES } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { id?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "A numeric sponsor id is required." }, { status: 400 });
  }
  if (!isStatus(body.status)) {
    return NextResponse.json({ error: `Status must be one of ${STATUSES.join(", ")}.` }, { status: 400 });
  }
  const status = body.status;

  try {
    await tx(async (q) => {
      await q.run(frag.insertIgnorePipeline(), [id]);
      if (status === "applied") {
        await q.run("UPDATE pipeline SET status=?, applied_at=COALESCE(applied_at,?) WHERE sponsor_id=?", [
          status,
          today(),
          id,
        ]);
      } else if (status === "queued" || status === "researched" || status === "drafted") {
        // Moving back before "sent" clears the sent date, or the follow-up
        // tracker chases an application that was never actually made.
        await q.run("UPDATE pipeline SET status=?, applied_at=NULL WHERE sponsor_id=?", [status, id]);
      } else {
        await q.run("UPDATE pipeline SET status=? WHERE sponsor_id=?", [status, id]);
      }
      await logEvent(q, id, "status", status);
    });
  } catch (err) {
    console.error("[status]", err);
    return NextResponse.json({ error: "The database rejected that write." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, status });
}
