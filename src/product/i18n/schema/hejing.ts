// HeJing product-copy schema.

export interface HeJingCopy {
  readonly intakeHero: {
    readonly ariaLabel: string;
    readonly eyebrow: string;
    readonly titleLead: string;
    readonly titleEmphasis: string;
    readonly body: string;
    readonly action: string;
    readonly subnote: string;
    readonly footer: string;
  };
  readonly emptyHero: {
    readonly ariaLabel: string;
    readonly eyebrow: string;
    readonly titleLead: string;
    readonly titleEmphasis: string;
    readonly body: string;
    readonly primaryAction: string;
    readonly stepsHint: string;
    readonly footer: string;
  };
}
