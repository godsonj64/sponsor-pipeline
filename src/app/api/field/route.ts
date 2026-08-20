import { NextResponse } from "next/server";
import { frag, logEvent, tx } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whitelisted because the column name is interpolated into the statement.
const WRITABLE = new Set([
  "role_target",
  "notes",
  "application_url",
  "contact_name",
  "contact_email",
  "resume_path",
  "cover_path",
  "persona",
]);

export async function POST(req: Request) {
  let body: { id?: unknown; field?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "A numeric sponsor id is required." }, { status: 400 });
  }
  if (typeof body.field !== "string" || !WRITABLE.has(body.field)) {
    return NextResponse.json({ error: "That field is not writable." }, { status: 400 });
  }
  const field = body.field;
  const raw = body.value;
  const value = raw === null || raw === undefined || raw === "" ? null : String(raw).slice(0, 4000);

  try {
    await tx(async (q) => {
      await q.run(frag.insertIgnorePipeline(), [id]);
      await q.run(`UPDATE pipeline SET ${field}=? WHERE sponsor_id=?`, [value, id]);
      await logEvent(q, id, "field", `${field}=${(value ?? "").slice(0, 120)}`);
    });
  } catch (err) {
    console.error("[field]", err);
    return NextResponse.json({ error: "The database rejected that write." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, field, value });
}
