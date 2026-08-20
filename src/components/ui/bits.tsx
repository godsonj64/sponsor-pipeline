import Link from "next/link";
import { personaColor, titleize } from "@/lib/format";

export function StatusPill({ status }: { status?: string | null }) {
  if (!status) return <span className="text-[11px] text-ink-faint">—</span>;
  return (
    <span className="status" data-s={status}>
      {status}
    </span>
  );
}

export function PersonaChip({ persona }: { persona?: string | null }) {
  if (!persona) return <span className="text-[11px] text-ink-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-ink-soft">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: personaColor(persona) }} />
      {titleize(persona)}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-[11px] uppercase tracking-[0.03em] text-ink-faint">{label}</p>
      <p className={`display mt-2 text-[26px] num ${accent ? "text-gradient" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-[11.5px] text-ink-faint">{hint}</p>}
    </div>
  );
}

/** Proportion bar used in the persona and industry breakdowns. */
export function Bar({ value, max, gradient }: { value: number; max: number; gradient?: string }) {
  // A zero must read as zero — no minimum stub.
  const w = value <= 0 || max <= 0 ? 0 : Math.max(2, Math.round((100 * value) / max));
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <span
        className="block h-full rounded-full"
        style={{ width: `${w}%`, background: gradient || "linear-gradient(90deg,#FF9D5C,#FF4FA3)" }}
      />
    </span>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card px-6 py-14 text-center">
      <p className="text-[13.5px] font-medium">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] text-ink-soft">{hint}</p>}
    </div>
  );
}

export function SponsorLink({ id, name }: { id: number; name: string }) {
  return (
    <Link href={`/sponsor/${id}`} className="font-medium text-ink hover:text-pink">
      {name}
    </Link>
  );
}

export function Ext({ href, label }: { href?: string | null; label?: string | null }) {
  if (!href) return <span className="text-ink-faint">—</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link text-[12px]">
      {label || "link"}
    </a>
  );
}
