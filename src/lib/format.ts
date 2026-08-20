/** Display helpers shared across the pipeline views. */

export const PERSONA_COLORS: Record<string, string> = {
  hospitality_digital: "linear-gradient(140deg,#FF7A3D,#FF4FA3)",
  qa_software: "linear-gradient(140deg,#8B5CF6,#5B8DEF)",
  data_analytics: "linear-gradient(140deg,#2DD4BF,#5B8DEF)",
  operations_management: "linear-gradient(140deg,#FFB05C,#FF6B6B)",
  research_health: "linear-gradient(140deg,#A8E063,#2DD4BF)",
  sales_events: "linear-gradient(140deg,#F472B6,#A78BFA)",
};

export const personaColor = (p?: string | null) =>
  (p && PERSONA_COLORS[p]) || "linear-gradient(140deg,#9b9ba4,#c4c4cc)";

/** Industry and persona keys are snake_case; these read as acronyms, not words. */
const ACRONYMS = new Set(["qa", "it", "uk", "ch", "hr", "ai", "sic", "ats", "plc", "llp"]);

export const titleize = (v?: string | null) =>
  !v
    ? "—"
    : v
        .replace(/_/g, " ")
        .split(" ")
        .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
        .join(" ");

export const num = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("en-GB");

export const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

/** Strip the scheme so a long URL reads as a domain in a dense table. */
export function domain(url?: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

export function ago(iso?: string | null) {
  if (!iso) return "—";
  const then = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso.replace(" ", "T") + "Z");
  const s = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export const shiftDate = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const prettyDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
