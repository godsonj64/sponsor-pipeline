"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { STATUSES } from "@/lib/pipeline";

const OPTIONS = STATUSES.map((s) => ({ value: s, label: s }));

/** Sets pipeline status and refreshes the server-rendered data around it. */
export function StatusControl({
  id,
  status,
  onDone,
}: {
  id: number;
  status: string | null;
  onDone?: (status: string) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status ?? "queued");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function change(next: string) {
    const previous = value;
    setValue(next); // optimistic; rolled back if the write fails
    setError(null);
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Could not save.");
      onDone?.(next);
      startTransition(() => router.refresh());
    } catch (err) {
      setValue(previous);
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Dropdown label="Status" value={value} options={OPTIONS} onChange={change} width={168} />
      {error && <span className="text-[11px] text-coral">{error}</span>}
    </div>
  );
}
