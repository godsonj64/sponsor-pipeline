import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/page-head";
import { StatusControl } from "@/components/status-control";
import { Empty, PersonaChip, SponsorLink, StatusPill } from "@/components/ui/bits";
import { domain, num } from "@/lib/format";
import { followups } from "@/lib/queries";

export const metadata: Metadata = { title: "Follow-ups" };
export const dynamic = "force-dynamic";

export default async function FollowupsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const days = Math.min(90, Math.max(1, Number(params.days) || 10));
  const rows = followups(days);

  return (
    <>
      <PageHead
        title="Follow-ups"
        sub={`Applications sent ${days}+ days ago with no reply, and drafts that stalled for 3+ days.`}
      >
        {[7, 10, 14, 21].map((d) => (
          <Link
            key={d}
            href={`/followups?days=${d}`}
            className="chip"
            data-active={d === days}
          >
            {d} days
          </Link>
        ))}
      </PageHead>

      {rows.length === 0 ? (
        <Empty
          title="Nothing needs chasing"
          hint="Applications older than the threshold with no reply will show up here."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th className="w-16 text-right">Age</th>
                <th>Employer</th>
                <th>Role target</th>
                <th>Persona</th>
                <th>Status</th>
                <th>Link</th>
                <th className="w-44">Move to</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="num text-right font-medium">{r.age}d</td>
                  <td className="max-w-[16rem] truncate">
                    <SponsorLink id={r.id} name={r.name} />
                    {r.town && <span className="ml-1.5 text-[11px] text-ink-faint">{r.town}</span>}
                  </td>
                  <td className="max-w-[12rem] truncate text-ink-soft">{r.role_target || "—"}</td>
                  <td>
                    <PersonaChip persona={r.persona} />
                  </td>
                  <td>
                    <StatusPill status={r.status} />
                  </td>
                  <td className="max-w-[10rem] truncate">
                    {r.application_url || r.careers_url || r.website ? (
                      <a
                        href={(r.application_url || r.careers_url || r.website)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link text-[12px]"
                      >
                        {r.application_url ? "application" : domain(r.careers_url || r.website)}
                      </a>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td>
                    <StatusControl id={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11.5px] text-ink-faint">{num(rows.length)} needing attention.</p>
    </>
  );
}
