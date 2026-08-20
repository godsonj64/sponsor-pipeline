import type { sponsor } from "./queries";

export type SponsorFull = NonNullable<Awaited<ReturnType<typeof sponsor>>>;
