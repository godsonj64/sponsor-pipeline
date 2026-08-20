/**
 * Every read the app performs. Mirrors the queries the existing Flask UI and
 * `sponsor` CLI use, so both front ends agree on what the numbers mean.
 */
import { all, count, one, today } from "./db";

export type BatchRow = {
  seq: number;
  id: number;
  name: string;
  town: string | null;
  industry: string | null;
  country: string | null;
  persona: string | null;
  priority: number | null;
  status: string | null;
  role_target: string | null;
  website: string | null;
  careers_url: string | null;
  size: string | null;
  ch_status: string | null;
  geo: number | null;
  group_key: string | null;
  group_n: number;
  n_roles: number;
};

export type SponsorDetail = {
  sponsor_id: number;
  org_name: string;
  org_name_raw: string;
  town: string | null;
  county: string | null;
  country: string | null;
  industry: string | null;
  industry_conf: string | null;
  industry_evidence: string | null;
  company_type: string | null;
  is_franchise: number;
  has_skilled_worker: number;
  best_rating: string | null;
  n_routes: number;
  ch_official_name: string | null;
  ch_company_number: string | null;
  ch_status: string | null;
  ch_sic_desc: string | null;
  ch_size_band: string | null;
  ch_age_years: number | null;
  ch_address: string | null;
  website: string | null;
  careers_url: string | null;
  ats_type: string | null;
  ats_slug: string | null;
  geo_verified: number | null;
  web_confidence: number | null;
  pstatus: string | null;
  ppersona: string | null;
  batch_date: string | null;
  role_target: string | null;
  notes: string | null;
  application_url: string | null;
  applied_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
};

export type Vacancy = {
  title: string;
  url: string | null;
  location: string | null;
  source: string | null;
  persona: string | null;
  match_score: number | null;
  in_uk: number | null;
};

export function stats() {
  const s = {
    sponsors: count("SELECT COUNT(*) n FROM sponsors"),
    classified: count("SELECT COUNT(*) n FROM sponsors WHERE industry<>'unclassified'"),
    verified: count("SELECT COUNT(*) n FROM enrichment WHERE ch_company_number IS NOT NULL"),
    active: count("SELECT COUNT(*) n FROM enrichment WHERE ch_status='Active'"),
    websites: count("SELECT COUNT(*) n FROM enrichment WHERE website IS NOT NULL"),
    queued: count("SELECT COUNT(*) n FROM pipeline WHERE status='queued'"),
    applied: count("SELECT COUNT(*) n FROM pipeline WHERE status='applied'"),
    roles: count("SELECT COUNT(*) n FROM vacancies WHERE persona IS NOT NULL AND in_uk IS NOT 0"),
    skilled: count("SELECT COUNT(*) n FROM sponsors WHERE has_skilled_worker=1"),
  };
  const by_status = all<{ status: string; n: number }>(
    "SELECT status, COUNT(*) n FROM pipeline WHERE status IS NOT NULL GROUP BY status",
  );
  return { ...s, by_status, today: today() };
}

export function batchDates() {
  return all<{ d: string; n: number; applied: number; skipped: number }>(
    `SELECT batch_date d, COUNT(*) n, SUM(status='applied') applied, SUM(status='skipped') skipped
       FROM pipeline WHERE batch_date IS NOT NULL GROUP BY batch_date ORDER BY batch_date DESC`,
  );
}

export function batch(date: string) {
  return all<BatchRow>(
    `SELECT p.batch_seq seq, s.sponsor_id id, s.org_name name, s.town, s.industry, s.country,
            p.persona, ROUND(p.priority,1) priority, p.status, p.role_target,
            e.website, e.careers_url, e.ch_size_band size, e.ch_status, e.geo_verified geo, e.group_key,
            (SELECT COUNT(*) FROM pipeline p2 JOIN enrichment e2 USING(sponsor_id)
               WHERE p2.batch_date=p.batch_date AND e2.group_key=e.group_key) group_n,
            (SELECT COUNT(*) FROM vacancies v WHERE v.sponsor_id=s.sponsor_id
               AND v.persona IS NOT NULL AND v.in_uk IS NOT 0) n_roles
       FROM pipeline p JOIN sponsors s USING(sponsor_id)
       LEFT JOIN enrichment e USING(sponsor_id)
      WHERE p.batch_date=? ORDER BY p.batch_seq`,
    [date],
  );
}

export function sponsor(id: number) {
  const row = one<SponsorDetail>(
    `SELECT s.*, e.ch_official_name, e.ch_company_number, e.ch_status, e.ch_sic_desc,
            e.ch_size_band, e.ch_age_years, e.ch_address, e.website, e.careers_url,
            e.ats_type, e.ats_slug, e.geo_verified, e.web_confidence,
            p.status pstatus, p.persona ppersona, p.batch_date, p.role_target, p.notes,
            p.application_url, p.applied_at, p.contact_name, p.contact_email
       FROM sponsors s LEFT JOIN enrichment e USING(sponsor_id)
       LEFT JOIN pipeline p USING(sponsor_id) WHERE s.sponsor_id=?`,
    [id],
  );
  if (!row) return null;
  return {
    ...row,
    routes: all<{ route: string; tier: string | null; rating: string | null }>(
      "SELECT route, tier, rating FROM routes WHERE sponsor_id=? ORDER BY route",
      [id],
    ),
    fit: all<{ persona: string; score: number }>(
      "SELECT persona, score FROM fit WHERE sponsor_id=? ORDER BY score DESC",
      [id],
    ),
    vacancies: all<Vacancy>(
      `SELECT title, url, location, source, persona, match_score, in_uk
         FROM vacancies WHERE sponsor_id=? ORDER BY (persona IS NULL), match_score DESC, title`,
      [id],
    ),
    group: groupSiblings(id),
    events: all<{ ts: string; kind: string; detail: string | null }>(
      "SELECT ts, kind, detail FROM events WHERE sponsor_id=? ORDER BY event_id DESC LIMIT 20",
      [id],
    ),
  };
}

export function groupSiblings(id: number) {
  const key = one<{ group_key: string | null }>(
    "SELECT group_key FROM enrichment WHERE sponsor_id=?",
    [id],
  );
  if (!key?.group_key) return [];
  return all<{ id: number; name: string; status: string | null; batch_date: string | null }>(
    `SELECT s.sponsor_id id, s.org_name name, p.status, p.batch_date
       FROM sponsors s JOIN enrichment e USING(sponsor_id)
       LEFT JOIN pipeline p USING(sponsor_id)
      WHERE e.group_key=? AND s.sponsor_id<>? ORDER BY s.org_name LIMIT 40`,
    [key.group_key, id],
  );
}

export function personas() {
  return all<{ persona: string }>("SELECT DISTINCT persona FROM fit ORDER BY persona").map(
    (r) => r.persona,
  );
}

export type PoolRow = {
  id: number;
  name: string;
  town: string | null;
  country: string | null;
  industry: string | null;
  size: string | null;
  score: number;
  website: string | null;
};

/** Unworked, A-rated, active Skilled Worker sponsors ranked by persona fit. */
export function pool(persona: string, opts: { country?: string; limit?: number } = {}) {
  const params: unknown[] = [persona];
  let q = `SELECT s.sponsor_id id, s.org_name name, s.town, s.country, s.industry,
                  e.ch_size_band size, ROUND(f.score,1) score, e.website
             FROM sponsors s JOIN fit f USING(sponsor_id)
             LEFT JOIN enrichment e USING(sponsor_id)
             LEFT JOIN pipeline p USING(sponsor_id)
            WHERE f.persona=? AND s.has_skilled_worker=1 AND s.is_franchise=0
              AND s.is_canonical=1 AND p.sponsor_id IS NULL
              AND (e.ch_status IS NULL OR e.ch_status='Active')
              AND (e.ch_size_band IS NULL OR e.ch_size_band<>'dormant')`;
  if (opts.country) {
    q += " AND s.country=?";
    params.push(opts.country);
  }
  q += " ORDER BY f.score DESC, (s.sponsor_id*2654435761)%1000003 LIMIT ?";
  params.push(Math.min(500, Math.max(1, opts.limit ?? 100)));
  return all<PoolRow>(q, params);
}

export type SearchRow = {
  id: number;
  name: string;
  town: string | null;
  country: string | null;
  industry: string | null;
  ch_status: string | null;
  size: string | null;
  website: string | null;
  pstatus: string | null;
  batch_date: string | null;
};

export function search(term: string) {
  const t = term.trim();
  if (!t) return [];
  return all<SearchRow>(
    `SELECT s.sponsor_id id, s.org_name name, s.town, s.country, s.industry,
            e.ch_status, e.ch_size_band size, e.website, p.status pstatus, p.batch_date
       FROM sponsors s LEFT JOIN enrichment e USING(sponsor_id)
       LEFT JOIN pipeline p USING(sponsor_id)
      WHERE s.org_name LIKE ? OR e.ch_official_name LIKE ?
      ORDER BY s.org_name LIMIT 200`,
    [`%${t}%`, `%${t}%`],
  );
}

export type RoleRow = {
  vid: number;
  id: number;
  name: string;
  title: string;
  persona: string | null;
  score: number | null;
  source: string | null;
  url: string | null;
  in_uk: number | null;
  location: string | null;
  pstatus: string | null;
};

export function roles(opts: { persona?: string; includeNonUk?: boolean } = {}) {
  const params: unknown[] = [];
  let q = `SELECT v.vacancy_id vid, s.sponsor_id id, s.org_name name, v.title, v.persona,
                  v.match_score score, v.source, v.url, v.in_uk, v.location, p.status pstatus
             FROM vacancies v JOIN sponsors s USING(sponsor_id)
             LEFT JOIN pipeline p USING(sponsor_id)
            WHERE v.persona IS NOT NULL`;
  if (!opts.includeNonUk) q += " AND v.in_uk IS NOT 0";
  if (opts.persona) {
    q += " AND v.persona=?";
    params.push(opts.persona);
  }
  q += " ORDER BY v.match_score DESC, s.org_name, v.title LIMIT 400";
  return all<RoleRow>(q, params);
}

export type FollowUp = {
  id: number;
  name: string;
  town: string | null;
  status: string;
  persona: string | null;
  role_target: string | null;
  applied_at: string | null;
  batch_date: string | null;
  application_url: string | null;
  notes: string | null;
  website: string | null;
  careers_url: string | null;
  age: number;
};

/** Applications going cold, plus drafts that stalled before being sent. */
export function followups(days = 10) {
  return all<FollowUp>(
    `SELECT s.sponsor_id id, s.org_name name, s.town, p.status, p.persona, p.role_target,
            p.applied_at, p.batch_date, p.application_url, p.notes, e.website, e.careers_url,
            CAST(julianday('now') - julianday(COALESCE(p.applied_at, p.batch_date)) AS INT) age
       FROM pipeline p JOIN sponsors s USING(sponsor_id)
       LEFT JOIN enrichment e USING(sponsor_id)
      WHERE (p.status='applied' AND p.applied_at IS NOT NULL
               AND julianday('now') - julianday(p.applied_at) >= ?)
         OR (p.status='drafted' AND p.batch_date IS NOT NULL
               AND julianday('now') - julianday(p.batch_date) >= 3)
      ORDER BY age DESC`,
    [days],
  );
}

export function progress() {
  const funnel = Object.fromEntries(
    all<{ status: string; n: number }>(
      "SELECT status, COUNT(*) n FROM pipeline WHERE status IS NOT NULL GROUP BY status",
    ).map((r) => [r.status, r.n]),
  );
  const sent = (funnel.applied ?? 0) + (funnel.replied ?? 0) + (funnel.rejected ?? 0);
  return {
    funnel,
    sent,
    reply_rate: sent ? Math.round((1000 * (funnel.replied ?? 0)) / sent) / 10 : 0,
    by_persona: all<{
      persona: string;
      total: number;
      applied: number;
      replied: number;
      rejected: number;
      skipped: number;
    }>(
      `SELECT persona, COUNT(*) total, SUM(status='applied') applied, SUM(status='replied') replied,
              SUM(status='rejected') rejected, SUM(status='skipped') skipped
         FROM pipeline WHERE persona IS NOT NULL GROUP BY persona ORDER BY total DESC`,
    ),
    by_industry: all<{ industry: string; total: number; applied: number; replied: number }>(
      `SELECT s.industry, COUNT(*) total, SUM(p.status='applied') applied,
              SUM(p.status='replied') replied
         FROM pipeline p JOIN sponsors s USING(sponsor_id)
        GROUP BY s.industry ORDER BY applied DESC, total DESC LIMIT 12`,
    ),
    daily: all<{ d: string; n: number }>(
      `SELECT substr(ts,1,10) d, COUNT(*) n FROM events
        WHERE kind='status' AND detail='applied' GROUP BY d ORDER BY d DESC LIMIT 30`,
    ),
    batches: all<{ d: string; n: number; applied: number; worked: number; sites: number }>(
      `SELECT p.batch_date d, COUNT(*) n, SUM(p.status='applied') applied,
              SUM(p.status<>'queued') worked, SUM(e.website IS NOT NULL) sites
         FROM pipeline p LEFT JOIN enrichment e USING(sponsor_id)
        WHERE p.batch_date IS NOT NULL GROUP BY p.batch_date ORDER BY p.batch_date DESC LIMIT 20`,
    ),
  };
}

export function recentEvents(limit = 40) {
  return all<{ ts: string; kind: string; detail: string | null; id: number | null; name: string | null }>(
    `SELECT ev.ts, ev.kind, ev.detail, ev.sponsor_id id, s.org_name name
       FROM events ev LEFT JOIN sponsors s USING(sponsor_id)
      ORDER BY ev.event_id DESC LIMIT ?`,
    [Math.min(200, Math.max(1, limit))],
  );
}
