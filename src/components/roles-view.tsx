"use client";

import { useRouter } from "next/navigation";
import { Empty, PersonaChip, SponsorLink, StatusPill } from "@/components/ui/bits";
import { Dropdown } from "@/components/ui/dropdown";
import { num, personaColor, titleize } from "@/lib/format";
import type { RoleRow } from "@/lib/queries";

export function RolesView({
  rows,
  personas,
  persona,
  includeNonUk,
}: {
  rows: RoleRow[];
  personas: string[];
  persona: string;
  includeNonUk: boolean;
}) {
  const router = useRouter();

  function navigate(next: Partial<{ persona: string; uk: string }>) {
    const p = new URLSearchParams();
    const chosen = next.persona ?? persona;
    if (chosen) p.set("persona", chosen);
    const uk = next.uk ?? (includeNonUk ? "all" : "");
    if (uk) p.set("uk", uk);
    router.push(`/roles?${p}`);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Dropdown
          label="Persona"
          value={persona}
          width={228}
          options={[
            { value: "", label: "All personas" },
            ...personas.map((p) => ({ value: p, label: titleize(p), swatch: personaColor(p) })),
          ]}
          onChange={(v) => navigate({ persona: v })}
        />
        <button
          onClick={() => navigate({ uk: includeNonUk ? "" : "all" })}
          className="chip"
          data-active={!includeNonUk}
        >
          {includeNonUk ? "Showing everywhere" : "UK roles only"}
        </button>
        <a href="/api/export?what=roles" className="btn btn-light ml-auto">
          Export roles
        </a>
      </div>

      {rows.length === 0 ? (
        <Empty
          title="No matching roles found yet"
          hint="Roles appear once a vacancy pull has run for a batch and matched one of your personas."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12 text-right">Fit</th>
                  <th>Role</th>
                  <th>Employer</th>
                  <th>Location</th>
                  <th>Persona</th>
                  <th>Source</th>
                  <th>Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.vid}>
                    <td className="num text-right font-medium">{r.score !== null ? r.score.toFixed(0) : "—"}</td>
                    <td className="max-w-[20rem]">
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="link block truncate">
                          {r.title}
                        </a>
                      ) : (
                        <span className="block truncate">{r.title}</span>
                      )}
                    </td>
                    <td className="max-w-[14rem] truncate">
                      <SponsorLink id={r.id} name={r.name} />
                    </td>
                    <td className="max-w-[10rem] truncate text-ink-soft">
                      {r.location || "—"}
                      {r.in_uk === 0 && <span className="ml-1.5 text-[10.5px] text-[var(--st-rejected)]">non-UK</span>}
                    </td>
                    <td>
                      <PersonaChip persona={r.persona} />
                    </td>
                    <td className="text-ink-soft">{r.source || "—"}</td>
                    <td>
                      <StatusPill status={r.pstatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11.5px] text-ink-faint">{num(rows.length)} roles, best fit first.</p>
    </>
  );
}
