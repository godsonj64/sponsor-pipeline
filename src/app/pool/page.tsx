import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
import { PoolView } from "@/components/pool/pool-view";
import { personas, pool } from "@/lib/queries";

export const metadata: Metadata = { title: "Pool" };
export const dynamic = "force-dynamic";

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export default async function PoolPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; country?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const list = await personas();
  const persona = params.persona && list.includes(params.persona) ? params.persona : list[0];
  const country = params.country || "";
  const limit = Math.min(500, Math.max(1, Number(params.limit) || 100));
  const rows = await pool(persona, { country: country || undefined, limit });

  return (
    <>
      <PageHead title="Target pool" sub="Employers that fit a persona and have never been worked. Queue them onto a batch date." />
      <PoolView
        rows={rows}
        personas={list}
        persona={persona}
        country={country}
        limit={limit}
        defaultDate={tomorrow()}
      />
    </>
  );
}
