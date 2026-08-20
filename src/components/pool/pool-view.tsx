"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QueueButton } from "@/components/queue-button";
import { Empty, SponsorLink } from "@/components/ui/bits";
import { Dropdown } from "@/components/ui/dropdown";
import { Spinner } from "@/components/ui/icons";
import { domain, num, personaColor, titleize } from "@/lib/format";
import type { PoolRow } from "@/lib/queries";

const COUNTRIES = [
  { value: "", label: "All of the UK" },
  { value: "England", label: "England" },
  { value: "Scotland", label: "Scotland" },
  { value: "Wales", label: "Wales" },
  { value: "Northern Ireland", label: "Northern Ireland" },
];

const LIMITS = [50, 100, 200, 500].map((n) => ({ value: String(n), label: `Top ${n}` }));

export function PoolView({
  rows,
  personas,
  persona,
  country,
  limit,
  defaultDate,
}: {
  rows: PoolRow[];
  personas: string[];
  persona: string;
  country: string;
  limit: number;
  defaultDate: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [takeN, setTakeN] = useState("10");
  const [taking, setTaking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function navigate(next: Partial<{ persona: string; country: string; limit: string }>) {
    const p = new URLSearchParams({
      persona: next.persona ?? persona,
      country: next.country ?? country,
      limit: next.limit ?? String(limit),
    });
    router.push(`/pool?${p}`);
  }

  async function take() {
    setTaking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/take", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n: Number(takeN), persona, date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not queue.");
      setMessage(`Queued ${data.added} employers onto ${data.date}.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not queue.");
    } finally {
      setTaking(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Dropdown
          label="Persona"
          value={persona}
          width={228}
          options={personas.map((p) => ({ value: p, label: titleize(p), swatch: personaColor(p) }))}
          onChange={(v) => navigate({ persona: v })}
          leading={<span className="h-4 w-4 rounded-full" style={{ background: personaColor(persona) }} />}
        />
        <Dropdown label="Country" value={country} width={196} options={COUNTRIES} onChange={(v) => navigate({ country: v })} />
        <Dropdown label="Limit" value={String(limit)} width={140} options={LIMITS} onChange={(v) => navigate({ limit: v })} />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            max={200}
            value={takeN}
            onChange={(e) => setTakeN(e.target.value)}
            aria-label="How many to queue"
            className="field w-[4.5rem] py-1.5 text-[12.5px]"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Queue onto date"
            className="field w-auto py-1.5 text-[12.5px]"
          />
          <button onClick={take} disabled={taking} className="btn btn-dark">
            {taking && <Spinner className="h-3 w-3" />}
            Queue top {takeN}
          </button>
        </div>
      </div>

      {message && <p className="mb-3 text-[12.5px] text-ink-soft">{message}</p>}

      {rows.length === 0 ? (
        <Empty
          title="No untouched targets left for this persona"
          hint="Every matching sponsor is already in the pipeline. Try another persona or country."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12 text-right">Fit</th>
                  <th>Employer</th>
                  <th>Town</th>
                  <th>Country</th>
                  <th>Industry</th>
                  <th>Size</th>
                  <th>Site</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num text-right font-medium">{r.score}</td>
                    <td className="max-w-[18rem] truncate">
                      <SponsorLink id={r.id} name={r.name} />
                    </td>
                    <td className="max-w-[9rem] truncate text-ink-soft">{r.town || "—"}</td>
                    <td className="text-ink-soft">{r.country || "—"}</td>
                    <td className="max-w-[10rem] truncate text-ink-soft">{titleize(r.industry)}</td>
                    <td className="text-ink-soft">{r.size ? titleize(r.size) : "—"}</td>
                    <td className="max-w-[9rem] truncate">
                      {r.website ? (
                        <a href={r.website} target="_blank" rel="noopener noreferrer" className="link text-[12px]">
                          {domain(r.website)}
                        </a>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <QueueButton id={r.id} date={date} persona={persona} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11.5px] text-ink-faint">
        Showing {num(rows.length)} A-rated, active Skilled Worker sponsors with no pipeline entry, ranked by persona fit.
      </p>
    </>
  );
}
