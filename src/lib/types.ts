import type { sponsor } from "./queries";

export type SponsorFull = NonNullable<ReturnType<typeof sponsor>>;
