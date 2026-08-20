export function PageHead({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="min-w-0">
        <h1 className="display text-[24px] sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1.5 text-[12.5px] text-ink-soft">{sub}</p>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
