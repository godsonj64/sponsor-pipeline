import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
import { QueueButton } from "@/components/queue-button";
import { SearchBox } from "@/components/search-box";
import { Empty, SponsorLink, StatusPill } from "@/components/ui/bits";
import { domain, num, titleize } from "@/lib/format";
import { search } from "@/lib/queries";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const rows = q ? await search(q) : [];

  return (
    <>
      <PageHead title="Search the register" sub="Every licensed sponsor, matched on display name or Companies House name." />
      <SearchBox initial={q} />

      {!q ? (
        <Empty title="Search 127,000+ licensed sponsors" hint="Partial names work — results are capped at 200." />
      ) : rows.length === 0 ? (
        <Empty title={`Nothing matches “${q}”`} hint="Try a shorter fragment of the name." />
      ) : (
        <div className="card overflow-hidden">
          <div className="max-h-[calc(100dvh-16rem)] overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Employer</th>
                  <th>Town</th>
                  <th>Country</th>
                  <th>Industry</th>
                  <th>CH status</th>
                  <th>Site</th>
                  <th>Pipeline</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="max-w-[20rem] truncate">
                      <SponsorLink id={r.id} name={r.name} />
                    </td>
                    <td className="max-w-[9rem] truncate text-ink-soft">{r.town || "—"}</td>
                    <td className="text-ink-soft">{r.country || "—"}</td>
                    <td className="max-w-[10rem] truncate text-ink-soft">{titleize(r.industry)}</td>
                    <td className="text-ink-soft">{r.ch_status || "—"}</td>
                    <td className="max-w-[9rem] truncate">
                      {r.website ? (
                        <a href={r.website} target="_blank" rel="noopener noreferrer" className="link text-[12px]">
                          {domain(r.website)}
                        </a>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td>
                      {r.pstatus ? (
                        <StatusPill status={r.pstatus} />
                      ) : (
                        <span className="text-[11px] text-ink-faint">not in pipeline</span>
                      )}
                    </td>
                    <td className="text-right">
                      {!r.pstatus && <QueueButton id={r.id} date={tomorrow()} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {q && rows.length > 0 && (
        <p className="mt-3 text-[11.5px] text-ink-faint">
          {num(rows.length)} matches{rows.length === 200 ? " (capped)" : ""}.
        </p>
      )}
    </>
  );
}
