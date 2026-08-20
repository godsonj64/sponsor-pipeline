"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FieldEditor } from "@/components/field-editor";
import { SponsorDetail } from "@/components/sponsor-detail";
import { StatusControl } from "@/components/status-control";
import { Empty, PersonaChip, StatusPill } from "@/components/ui/bits";
import { Chevron, Spinner } from "@/components/ui/icons";
import { domain, num, prettyDate, shiftDate, titleize } from "@/lib/format";
import type { BatchRow } from "@/lib/queries";
import type { SponsorFull } from "@/lib/types";

export function BatchView({ date, rows }: { date: string; rows: BatchRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(rows[0]?.id ?? null);
  const [detail, setDetail] = useState<SponsorFull | null>(null);
  const [loading, setLoading] = useState(false);

  const go = useCallback((d: string) => router.push(`/batch?date=${d}`), [router]);

  useEffect(() => {
    // Keep the panel on a row that still exists after a date change.
    if (!rows.some((r) => r.id === selected)) setSelected(rows[0]?.id ?? null);
  }, [rows, selected]);

  useEffect(() => {
    if (selected === null) {
      setDetail(null);
      return;
    }
    let live = true;
    setLoading(true);
    fetch(`/api/sponsor/${selected}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setDetail(d))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [selected]);

  const worked = rows.filter((r) => r.status && r.status !== "queued").length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous day"
            onClick={() => go(shiftDate(date, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:text-ink"
          >
            <Chevron className="h-3 w-3 rotate-90" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && go(e.target.value)}
            className="field w-auto py-1.5 text-[12.5px]"
            aria-label="Batch date"
          />
          <button
            aria-label="Next day"
            onClick={() => go(shiftDate(date, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:text-ink"
          >
            <Chevron className="h-3 w-3 -rotate-90" />
          </button>
        </div>
        <span className="text-[12.5px] text-ink-soft">
          {prettyDate(date)} · {num(rows.length)} employers · {num(worked)} worked
        </span>
        <a href={`/api/export?what=batch&date=${date}`} className="btn btn-light ml-auto">
          Export this batch
        </a>
      </div>

      {rows.length === 0 ? (
        <Empty
          title={`Nothing scheduled for ${date}`}
          hint="Pick another date, or queue targets from the Pool."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="card overflow-hidden">
            <div className="max-h-[calc(100dvh-13rem)] overflow-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-8 text-right">#</th>
                    <th>Employer</th>
                    <th>Town</th>
                    <th>Industry</th>
                    <th>Persona</th>
                    <th className="text-right">Roles</th>
                    <th>Site</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      data-selected={selected === r.id}
                      onClick={() => setSelected(r.id)}
                      className="cursor-pointer"
                    >
                      <td className="num text-right text-ink-faint">{r.seq}</td>
                      <td className="max-w-[15rem]">
                        <span className="block truncate font-medium">{r.name}</span>
                        {r.group_n > 1 && (
                          <span className="text-[10.5px] text-ink-faint">{r.group_n} in group</span>
                        )}
                      </td>
                      <td className="max-w-[8rem] truncate text-ink-soft">{r.town || "—"}</td>
                      <td className="max-w-[9rem] truncate text-ink-soft">{titleize(r.industry)}</td>
                      <td>
                        <PersonaChip persona={r.persona} />
                      </td>
                      <td className="num text-right">
                        {r.n_roles > 0 ? (
                          <span className="font-medium text-pink">{r.n_roles}</span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="max-w-[9rem] truncate">
                        {r.website ? (
                          <a
                            href={r.careers_url || r.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="link text-[12px]"
                          >
                            {r.careers_url ? "careers" : domain(r.website)}
                          </a>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td>
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* detail panel */}
          <aside className="xl:sticky xl:top-[4.75rem] xl:self-start">
            <div className="card max-h-[calc(100dvh-13rem)] overflow-auto">
              {loading && !detail ? (
                <div className="flex items-center justify-center gap-2 py-16 text-[12.5px] text-ink-soft">
                  <Spinner className="h-3.5 w-3.5" /> Loading
                </div>
              ) : detail ? (
                <>
                  <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-line bg-white/90 px-5 py-3 backdrop-blur">
                    <StatusControl id={detail.sponsor_id} status={detail.pstatus} />
                    <Link href={`/sponsor/${detail.sponsor_id}`} className="btn btn-light ml-auto">
                      Full record
                    </Link>
                  </div>
                  <div className="space-y-3 border-b border-line px-5 py-4">
                    <FieldEditor
                      id={detail.sponsor_id}
                      field="role_target"
                      label="Role target"
                      value={detail.role_target}
                      placeholder="e.g. Digital Marketing Executive"
                    />
                    <FieldEditor
                      id={detail.sponsor_id}
                      field="application_url"
                      label="Application URL"
                      value={detail.application_url}
                      placeholder="https://…"
                    />
                    <FieldEditor
                      id={detail.sponsor_id}
                      field="notes"
                      label="Notes"
                      value={detail.notes}
                      placeholder="Contact, angle, what you sent…"
                      multiline
                    />
                  </div>
                  <SponsorDetail s={detail} compact />
                </>
              ) : (
                <p className="px-5 py-16 text-center text-[12.5px] text-ink-soft">
                  Select a row to see the full record.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
