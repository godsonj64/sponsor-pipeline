"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
      }}
      className="mb-4 flex gap-2"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Company name — try 'hotel', 'systems', or an exact legal name"
        aria-label="Search sponsors"
        autoFocus
        className="field w-full flex-1"
      />
      <button type="submit" className="btn btn-dark px-5">
        Search
      </button>
    </form>
  );
}
