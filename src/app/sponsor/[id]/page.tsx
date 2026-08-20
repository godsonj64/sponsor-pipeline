import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FieldEditor } from "@/components/field-editor";
import { PageHead } from "@/components/page-head";
import { SponsorDetail } from "@/components/sponsor-detail";
import { StatusControl } from "@/components/status-control";
import { QueueButton } from "@/components/queue-button";
import { sponsor } from "@/lib/queries";

export const dynamic = "force-dynamic";

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const s = sponsor(Number(id));
  return { title: s?.org_name ?? "Sponsor" };
}

export default async function SponsorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const s = sponsor(n);
  if (!s) notFound();

  return (
    <>
      <PageHead title={s.org_name} sub={[s.town, s.county, s.country].filter(Boolean).join(", ") || undefined}>
        <StatusControl id={s.sponsor_id} status={s.pstatus} />
        {!s.batch_date && <QueueButton id={s.sponsor_id} date={tomorrow()} label="Queue for tomorrow" />}
        {s.batch_date && (
          <Link href={`/batch?date=${s.batch_date}`} className="btn btn-light">
            Open batch
          </Link>
        )}
      </PageHead>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="card overflow-hidden">
          <SponsorDetail s={s} />
        </div>

        <aside className="lg:sticky lg:top-[4.75rem] lg:self-start">
          <div className="card space-y-3 p-5">
            <h2 className="text-[13px] font-medium">Application</h2>
            <FieldEditor
              id={s.sponsor_id}
              field="role_target"
              label="Role target"
              value={s.role_target}
              placeholder="e.g. Digital Marketing Executive"
            />
            <FieldEditor
              id={s.sponsor_id}
              field="application_url"
              label="Application URL"
              value={s.application_url}
              placeholder="https://…"
            />
            <FieldEditor
              id={s.sponsor_id}
              field="contact_name"
              label="Contact name"
              value={s.contact_name}
              placeholder="Who you wrote to"
            />
            <FieldEditor
              id={s.sponsor_id}
              field="contact_email"
              label="Contact email"
              value={s.contact_email}
              placeholder="name@company.com"
            />
            <FieldEditor
              id={s.sponsor_id}
              field="notes"
              label="Notes"
              value={s.notes}
              placeholder="Angle, what you sent, what came back…"
              multiline
            />
            {s.applied_at && (
              <p className="text-[11.5px] text-ink-faint">Applied {s.applied_at}</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
