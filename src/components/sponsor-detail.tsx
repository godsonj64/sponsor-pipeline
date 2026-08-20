import Link from "next/link";
import { PersonaChip, StatusPill } from "@/components/ui/bits";
import { domain, num, personaColor, titleize } from "@/lib/format";
import type { SponsorFull } from "@/lib/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-1.5">
      <dt className="text-[11.5px] text-ink-faint">{label}</dt>
      <dd className="min-w-0 text-[12.5px] text-ink-2">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-4 first:border-t-0">
      <h3 className="mb-2 text-[11px] uppercase tracking-[0.04em] text-ink-faint">{title}</h3>
      {children}
    </section>
  );
}

/** Shared by the batch side panel and the full sponsor page. */
export function SponsorDetail({ s, compact = false }: { s: SponsorFull; compact?: boolean }) {
  const site = domain(s.website);
  return (
    <div>
      <Section title="Employer">
        <h2 className="text-[15px] font-medium leading-snug">{s.org_name}</h2>
        {s.ch_official_name && s.ch_official_name !== s.org_name && (
          <p className="mt-1 text-[11.5px] text-ink-faint">{s.ch_official_name}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusPill status={s.pstatus} />
          <PersonaChip persona={s.ppersona} />
          {s.has_skilled_worker === 1 && <span className="chip">Skilled Worker</span>}
          {s.is_franchise === 1 && <span className="chip">Franchise</span>}
          {s.best_rating && <span className="chip">Rating {s.best_rating}</span>}
        </div>
        <dl className="mt-3">
          <Row label="Location">
            {[s.town, s.county, s.country].filter(Boolean).join(", ") || "—"}
            {s.geo_verified === 1 && <span className="ml-1.5 text-[11px] text-ink-faint">verified</span>}
          </Row>
          <Row label="Industry">
            {titleize(s.industry)}
            {s.industry_conf && <span className="ml-1.5 text-[11px] text-ink-faint">{s.industry_conf} confidence</span>}
          </Row>
          {s.company_type && <Row label="Type">{titleize(s.company_type)}</Row>}
          {s.batch_date && (
            <Row label="Batch">
              <Link href={`/batch?date=${s.batch_date}`} className="link">
                {s.batch_date}
              </Link>
            </Row>
          )}
        </dl>
      </Section>

      <Section title="Companies House">
        {s.ch_company_number ? (
          <dl>
            <Row label="Number">
              <a
                href={`https://find-and-update.company-information.service.gov.uk/company/${s.ch_company_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                {s.ch_company_number}
              </a>
            </Row>
            <Row label="Status">
              <span className={s.ch_status === "Active" ? "text-[var(--st-replied)]" : ""}>{s.ch_status || "—"}</span>
            </Row>
            <Row label="Size">{titleize(s.ch_size_band)}</Row>
            <Row label="Age">{s.ch_age_years ? `${s.ch_age_years.toFixed(1)} years` : "—"}</Row>
            {s.ch_sic_desc && <Row label="SIC">{s.ch_sic_desc}</Row>}
            {s.ch_address && <Row label="Address">{s.ch_address}</Row>}
          </dl>
        ) : (
          <p className="text-[12.5px] text-ink-soft">Not matched to a Companies House record.</p>
        )}
      </Section>

      <Section title="Web">
        <dl>
          <Row label="Website">
            {s.website ? (
              <a href={s.website} target="_blank" rel="noopener noreferrer" className="link">
                {site}
              </a>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Careers">
            {s.careers_url ? (
              <a href={s.careers_url} target="_blank" rel="noopener noreferrer" className="link">
                careers page
              </a>
            ) : (
              "—"
            )}
          </Row>
          {s.ats_type && <Row label="ATS">{`${s.ats_type}${s.ats_slug ? ` · ${s.ats_slug}` : ""}`}</Row>}
          {s.web_confidence !== null && s.web_confidence !== undefined && (
            <Row label="Confidence">{s.web_confidence.toFixed(2)}</Row>
          )}
        </dl>
      </Section>

      {s.fit.length > 0 && (
        <Section title="Persona fit">
          <ul className="space-y-2">
            {s.fit.slice(0, compact ? 4 : 8).map((f) => (
              <li key={f.persona} className="grid grid-cols-[1fr_4.5rem_2rem] items-center gap-2.5">
                <PersonaChip persona={f.persona} />
                <span className="block h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(3, f.score))}%`,
                      background: personaColor(f.persona),
                    }}
                  />
                </span>
                <span className="num text-right text-[11.5px] text-ink-faint">{f.score.toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {s.routes.length > 0 && (
        <Section title={`Sponsor routes (${s.routes.length})`}>
          <ul className="space-y-1.5">
            {s.routes.slice(0, compact ? 4 : 20).map((r, i) => (
              <li key={`${r.route}-${i}`} className="flex items-center gap-2 text-[12.5px]">
                <span className="min-w-0 flex-1 truncate">{r.route}</span>
                {r.rating && <span className="chip shrink-0">{r.rating}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`Open roles (${s.vacancies.length})`}>
        {s.vacancies.length === 0 ? (
          <p className="text-[12.5px] text-ink-soft">No vacancies found for this employer yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {s.vacancies.slice(0, compact ? 5 : 40).map((v, i) => (
              <li key={`${v.title}-${i}`}>
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    {v.url ? (
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="link text-[12.5px]">
                        {v.title}
                      </a>
                    ) : (
                      <span className="text-[12.5px]">{v.title}</span>
                    )}
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
                      {v.location && <span>{v.location}</span>}
                      {v.source && <span>{v.source}</span>}
                      {v.in_uk === 0 && <span className="text-[var(--st-rejected)]">outside UK</span>}
                    </span>
                  </span>
                  {v.match_score !== null && (
                    <span className="num shrink-0 text-[11.5px] text-ink-faint">{v.match_score.toFixed(0)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {s.group.length > 0 && (
        <Section title={`Same group (${s.group.length})`}>
          <ul className="space-y-1.5">
            {s.group.slice(0, compact ? 5 : 40).map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-[12.5px]">
                <Link href={`/sponsor/${g.id}`} className="min-w-0 flex-1 truncate hover:text-pink">
                  {g.name}
                </Link>
                <StatusPill status={g.status} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!compact && s.events.length > 0 && (
        <Section title="History">
          <ul className="space-y-1.5">
            {s.events.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px] text-ink-soft">
                <span className="w-[8.5rem] shrink-0 text-[11px] text-ink-faint">{e.ts}</span>
                <span className="shrink-0">{e.kind}</span>
                <span className="min-w-0 flex-1 truncate">{e.detail}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!compact && (
        <Section title="Register">
          <dl>
            <Row label="Sponsor id">{num(s.sponsor_id)}</Row>
            <Row label="As published">{s.org_name_raw}</Row>
            {s.industry_evidence && <Row label="Evidence">{s.industry_evidence}</Row>}
          </dl>
        </Section>
      )}
    </div>
  );
}
