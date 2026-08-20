"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRight, Logo, Spinner } from "@/components/ui/icons";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Could not sign in.");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-sm flex-col justify-center">
      <div className="mb-7 flex items-center gap-1.5">
        <Logo className="h-[18px] w-[18px]" />
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Sponsor</span>
      </div>
      <h1 className="display text-[26px]">Sign in</h1>
      <p className="mt-2 text-[13px] text-ink-soft">This pipeline is private. Enter the password to continue.</p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          autoComplete="current-password"
          className="field w-full"
        />
        {error && <p className="text-[12px] text-coral">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-dark w-full py-2.5">
          {busy ? <Spinner className="h-3 w-3" /> : null}
          Continue
          {!busy && <ArrowRight />}
        </button>
      </form>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <Form />
    </Suspense>
  );
}
