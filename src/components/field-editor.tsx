"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  id: number;
  field: string;
  label: string;
  value: string | null;
  placeholder?: string;
  multiline?: boolean;
};

/** Saves on blur, and only when the value actually changed. */
export function FieldEditor({ id, field, label, value, placeholder, multiline }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(value ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // A different row selected in the panel must reset the draft.
  useEffect(() => setDraft(value ?? ""), [value, id, field]);

  async function save() {
    if (draft === (value ?? "")) return;
    setState("saving");
    try {
      const res = await fetch("/api/field", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, field, value: draft }),
      });
      if (!res.ok) throw new Error("save failed");
      setState("saved");
      router.refresh();
      setTimeout(() => setState("idle"), 1400);
    } catch {
      setState("error");
    }
  }

  const Tag = multiline ? "textarea" : "input";

  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-[11.5px] text-ink-faint">
        {label}
        {state === "saving" && <span className="text-[10.5px]">saving…</span>}
        {state === "saved" && <span className="text-[10.5px] text-[var(--st-replied)]">saved</span>}
        {state === "error" && <span className="text-[10.5px] text-coral">could not save</span>}
      </span>
      <Tag
        value={draft}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value)}
        onBlur={save}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        className={`field w-full text-[12.5px] ${multiline ? "resize-none" : ""}`}
      />
    </label>
  );
}
