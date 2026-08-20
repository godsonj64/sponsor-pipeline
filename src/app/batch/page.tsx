import type { Metadata } from "next";
import { BatchView } from "@/components/batch/batch-view";
import { PageHead } from "@/components/page-head";
import { today, ymd } from "@/lib/db";
import { batch, batchDates } from "@/lib/queries";

export const metadata: Metadata = { title: "Batch" };
export const dynamic = "force-dynamic";

export default async function BatchPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const dates = await batchDates();
  const date = ymd(params.date) ?? dates[0]?.d ?? today();
  const rows = await batch(date);

  return (
    <>
      <PageHead title="Daily batch" sub="Work the list top to bottom: research, draft, apply, log the outcome." />
      <BatchView date={date} rows={rows} />
    </>
  );
}
