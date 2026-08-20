import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
import { RolesView } from "@/components/roles-view";
import { personas, roles } from "@/lib/queries";

export const metadata: Metadata = { title: "Roles" };
export const dynamic = "force-dynamic";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; uk?: string }>;
}) {
  const params = await searchParams;
  const list = personas();
  const persona = params.persona && list.includes(params.persona) ? params.persona : "";
  const includeNonUk = params.uk === "all";
  const rows = roles({ persona: persona || undefined, includeNonUk });

  return (
    <>
      <PageHead title="Live roles" sub="Vacancies found on sponsor career pages, scored against your personas." />
      <RolesView rows={rows} personas={list} persona={persona} includeNonUk={includeNonUk} />
    </>
  );
}
