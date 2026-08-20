"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/icons";

/** Adds one employer to a batch date without disturbing the rest of it. */
export function QueueButton({
  id,
  date,
  persona,
  label = "Queue",
}: {
  id: number;
  date: string;
  persona?: string | null;
  label?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function queue() {
    setState("saving");
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, date, persona }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "failed");
      setState("done");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  if (state === "done") return <span className="text-[11.5px] text-[var(--st-replied)]">queued</span>;

  return (
    <button onClick={queue} disabled={state === "saving"} className="btn btn-light px-2.5 py-1 text-[11.5px]">
      {state === "saving" && <Spinner className="h-3 w-3" />}
      {state === "error" ? "retry" : label}
    </button>
  );
}
