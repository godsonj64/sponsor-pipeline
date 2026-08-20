import { all, frag, today, ymd } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC-4180 quoting: wrap anything containing a delimiter, quote, or newline. */
function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const what = url.searchParams.get("what") || "batch";

  let rows: Record<string, unknown>[];
  let filename: string;

  if (what === "applications") {
    rows = await all(
      `SELECT s.sponsor_id, s.org_name, s.town, s.industry, e.ch_company_number, e.website,
              p.persona, p.status, p.role_target, p.application_url, p.contact_email,
              p.applied_at, p.notes
         FROM pipeline p JOIN sponsors s USING(sponsor_id)
         LEFT JOIN enrichment e USING(sponsor_id)
        WHERE p.status NOT IN ('queued') ORDER BY p.applied_at DESC, s.org_name`,
    );
    filename = "applications.csv";
  } else if (what === "roles") {
    rows = await all(
      `SELECT s.org_name, v.title, v.persona, v.match_score, v.location, v.in_uk, v.source, v.url
         FROM vacancies v JOIN sponsors s USING(sponsor_id)
        WHERE v.persona IS NOT NULL ORDER BY v.match_score DESC, s.org_name`,
    );
    filename = "roles.csv";
  } else if (what === "batch") {
    const date = ymd(url.searchParams.get("date")) ?? today();
    rows = await all(
      `SELECT p.batch_seq, s.sponsor_id, s.org_name, s.town, s.industry, e.ch_size_band,
              e.website, e.careers_url, p.persona, p.priority, p.status
         FROM pipeline p JOIN sponsors s USING(sponsor_id)
         LEFT JOIN enrichment e USING(sponsor_id)
        WHERE p.batch_date=? ORDER BY p.batch_seq`,
      [date],
    );
    filename = `batch-${date}.csv`;
  } else {
    return Response.json({ error: "what must be batch, applications or roles." }, { status: 400 });
  }

  return new Response(csv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
