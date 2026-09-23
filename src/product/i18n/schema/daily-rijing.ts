// Daily RiJing run product-copy schema (rule.shijing.product.r017).

export type DailyRiJingBlockCopyKind = 'persistence_unavailable' | 'profile_incomplete' | 'missing_focus';

export interface DailyRiJingCopy {
  readonly title: string;
  readonly enable: string;
  readonly time: string;
  readonly note: string;
  readonly saved: (enabled: boolean, time: string) => string;
  readonly saveFailed: (detail: string) => string;
  // Shown on RiJing while daily RiJing is on and today has no Reading yet.
  readonly pageNote: (time: string) => string;
  readonly notice: {
    readonly blocked: Record<DailyRiJingBlockCopyKind, string>;
    readonly failed: (reason: string) => string;
    readonly saveFailed: (detail: string) => string;
    readonly view: string;
    readonly unsynced: string;
    readonly retrySync: string;
  };
  readonly activity: {
    readonly title: (month: number, day: number) => string;
    readonly summary: (dayPillar: string, methodLabel: string) => string;
  };
}
