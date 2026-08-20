import { NextResponse } from "next/server";
import { sponsor } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ error: "A numeric sponsor id is required." }, { status: 400 });
  }
  const row = await sponsor(n);
  if (!row) return NextResponse.json({ error: "Sponsor not found." }, { status: 404 });
  return NextResponse.json(row);
}
