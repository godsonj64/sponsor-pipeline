import Link from "next/link";
import { PageHead } from "@/components/page-head";
import { Bar, Empty, PersonaChip, Stat, StatusPill } from "@/components/ui/bits";
import { ArrowRight } from "@/components/ui/icons";
import { STATUSES } from "@/lib/pipeline";
import { ago, num, pct, personaColor, prettyDate, titleize } from "@/lib/format";
import { batchDates, progress, recentEvents, stats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [s, p, dates, events] = await Promise.all([stats(), progress(), batchDates(), recentEvents(14)]);
  const funnelMax = Math.max(1, ...STATUSES.map((k) => p.funnel[k] ?? 0));

  return (
    <>
      <PageHead
        title="Pipeline"
        sub={`${num(s.sponsors)} licensed sponsors on the register · ${num(s.skilled)} with a Skilled Worker route`}
      >
        {dates[0] && (
          <Link href={`/batch?date=${dates[0].d}`} className="btn btn-dark">
            Open latest batch <ArrowRight />
          </Link>
        )}
      </PageHead>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Verified at CH" value={num(s.verified)} hint={`${pct(s.verified, s.sponsors)}% of the register`} />
        <Stat label="Active companies" value={num(s.active)} hint={`${num(s.websites)} websites found so far`} />
        <Stat label="Queued now" value={num(s.queued)} hint="waiting to be worked" />
        <Stat label="Applications sent" value={num(p.sent)} hint={`${p.reply_rate}% reply rate`} accent />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* funnel */}
        <section className="card p-5">
          <h2 className="text-[13px] font-medium">Funnel</h2>
          <p className="mt-1 text-[12px] text-ink-soft">Where every employer that has entered the pipeline sits today.</p>
          <ul className="mt-4 space-y-3">
            {STATUSES.map((st) => {
              const n = p.funnel[st] ?? 0;
              return (
                <li key={st} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3">
                  <StatusPill status={st} />
                  <Bar value={n} max={funnelMax} />
                  <span className="num text-right text-[12.5px] text-ink-soft">{num(n)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* activity */}
        <section className="card p-5">
          <h2 className="text-[13px] font-medium">Recent activity</h2>
          {events.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-ink-soft">Nothing logged yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {events.map((e, i) => (
                <li key={`${e.ts}-${i}`} className="flex items-center gap-2.5 py-2">
                  <span className="w-[4.5rem] shrink-0 text-[11px] text-ink-faint">{ago(e.ts)}</span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">
                    {e.id && e.name ? (
                      <Link href={`/sponsor/${e.id}`} className="hover:text-pink">
                        {e.name}
                      </Link>
                    ) : (
                      <span className="text-ink-soft">system</span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11.5px] text-ink-soft">
                    {e.kind === "status" ? <StatusPill status={e.detail} /> : titleize(e.kind)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* personas */}
        <section className="card p-5">
          <h2 className="text-[13px] font-medium">By persona</h2>
          {p.by_persona.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-ink-soft">No employers have been assigned a persona yet.</p>
          ) : (
            <table className="table mt-3">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th className="w-1/3">Share</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Applied</th>
                  <th className="text-right">Replied</th>
                </tr>
              </thead>
              <tbody>
                {p.by_persona.map((r) => (
                  <tr key={r.persona}>
                    <td>
                      <PersonaChip persona={r.persona} />
                    </td>
                    <td>
                      <Bar
                        value={r.total}
                        max={Math.max(...p.by_persona.map((x) => x.total))}
                        gradient={personaColor(r.persona)}
                      />
                    </td>
                    <td className="num text-right">{num(r.total)}</td>
                    <td className="num text-right">{num(r.applied)}</td>
                    <td className="num text-right">{num(r.replied)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* batches */}
        <section className="card p-5">
          <h2 className="text-[13px] font-medium">Recent batches</h2>
          {dates.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-ink-soft">No batches scheduled yet.</p>
          ) : (
            <table className="table mt-3">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="text-right">Employers</th>
                  <th className="text-right">Worked</th>
                  <th className="text-right">Sites found</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {p.batches.map((b) => (
                  <tr key={b.d}>
                    <td>{prettyDate(b.d)}</td>
                    <td className="num text-right">{num(b.n)}</td>
                    <td className="num text-right">{num(b.worked)}</td>
                    <td className="num text-right">{num(b.sites)}</td>
                    <td className="text-right">
                      <Link href={`/batch?date=${b.d}`} className="link text-[12px]">
                        open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {p.by_industry.length > 0 && (
        <section className="card mt-4 p-5">
          <h2 className="text-[13px] font-medium">Industries in the pipeline</h2>
          <div className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {p.by_industry.map((r) => (
              <div key={r.industry} className="grid grid-cols-[1fr_5rem_2.5rem] items-center gap-3">
                <span className="truncate text-[12.5px] text-ink-soft">{titleize(r.industry)}</span>
                <Bar value={r.total} max={Math.max(...p.by_industry.map((x) => x.total))} />
                <span className="num text-right text-[12px] text-ink-faint">{num(r.total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {s.sponsors === 0 && <Empty title="The database looks empty" hint="Check that SPONSORS_DB points at your sponsors.db." />}
    </>
  );
}
