"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/icons";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/batch", label: "Batch" },
  { href: "/pool", label: "Pool" },
  { href: "/roles", label: "Roles" },
  { href: "/followups", label: "Follow-ups" },
  { href: "/search", label: "Search" },
];

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 pr-2">
          <Logo className="h-[18px] w-[18px]" />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Sponsor</span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                active(l.href) ? "bg-surface-2 font-medium text-ink" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <a href="/api/export?what=applications" className="btn btn-light ml-auto shrink-0">
          Export CSV
        </a>
      </div>
    </header>
  );
}
