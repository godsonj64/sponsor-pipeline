"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Chevron } from "./icons";

export type Option = { value: string; label: string; hint?: string; swatch?: string };

/** Compact popover select used across the composer and studio controls. */
export function Dropdown({
  value,
  options,
  onChange,
  leading,
  align = "left",
  width = 216,
  label,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  leading?: ReactNode;
  align?: "left" | "right";
  width?: number;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="chip hover:border-[var(--line-strong)] hover:text-ink"
        data-active={open}
      >
        {leading}
        <span className="text-ink">{current?.label}</span>
        <Chevron className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{ width }}
          className={`absolute z-40 mt-2 max-h-72 overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-lg)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((o) => (
            <button
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-surface-2 ${
                o.value === value ? "bg-surface-2" : ""
              }`}
            >
              {o.swatch && (
                <span className="h-5 w-5 shrink-0 rounded-full" style={{ background: o.swatch }} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{o.label}</span>
                {o.hint && <span className="block truncate text-[11px] text-ink-faint">{o.hint}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
