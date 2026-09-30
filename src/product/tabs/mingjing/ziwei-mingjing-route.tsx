import { useMemo, useState } from 'react';
import type { ZiweiPalace, ZiweiStar, ZiweiSubjectChart } from '../../../domain/algorithm.ts';
import type { MingJingZiweiDecadeGuidance, MingJingZiweiNatalMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { useProductCopy, type ProductCopy } from '../../i18n/copy.ts';
import { MingJingZiweiReadingView } from './mingjing-ziwei-reading-view.tsx';

export interface ZiweiMingJingRouteProps {
  readonly chart: ZiweiSubjectChart;
  readonly natalReading: {
    readonly output: MingJingZiweiNatalMirrorOutput | null;
    readonly stale: boolean;
    readonly loading: boolean;
    readonly failure: ReadingGenerationFailure | null;
    readonly onGenerate: () => void;
  };
}

const HUA_LEGEND = [
  ['禄', '禄'],
  ['权', '权'],
  ['科', '科'],
  ['忌', '忌'],
] as const;

interface PalaceDomainCopy {
  readonly tagline: string;
  readonly scope: string;
  readonly boundary: string;
}

function palaceName(chart: ZiweiSubjectChart, predicate: (palace: ZiweiPalace) => boolean): string {
  return chart.palaces.find(predicate)?.name ?? 'unknown';
}

function soulPalace(chart: ZiweiSubjectChart): ZiweiPalace | undefined {
  return chart.palaces.find((palace) => palace.is_soul);
}

function bodyPalaceName(chart: ZiweiSubjectChart): string {
  return palaceName(chart, (palace) => palace.is_body);
}

function decadePalaces(chart: ZiweiSubjectChart): readonly ZiweiPalace[] {
  return [...chart.palaces].sort((a, b) => a.decadal_start_age - b.decadal_start_age);
}

function palaceKey(palace: ZiweiPalace): string {
  return `${palace.earthly_branch}:${palace.name}:${palace.index}`;
}

function ageRange(palace: ZiweiPalace): string {
  return `${palace.decadal_start_age}-${palace.decadal_end_age}`;
}

function palaceDomainCopy(palace: ZiweiPalace, copy: ProductCopy['ziweiSurface']): PalaceDomainCopy {
  return (copy.palaceDomains as Readonly<Record<string, PalaceDomainCopy>>)[palace.name] ?? copy.defaultPalaceDomain;
}

function palaceInterpretationSections(palace: ZiweiPalace, copy: ProductCopy['ziweiSurface']): readonly string[] {
  const domain = palaceDomainCopy(palace, copy);
  return [domain.scope, domain.boundary];
}

function majorStarNames(palace: ZiweiPalace, emptyLabel: string): string {
  return palace.major_stars.map((star) => star.name).join(' ') || emptyLabel;
}

function findDecadeGuidance(
  output: MingJingZiweiNatalMirrorOutput | null,
  palace: ZiweiPalace,
): MingJingZiweiDecadeGuidance | null {
  if (!output) return null;
  return output.decade_guidance.find(
    (item) => item.age_range === ageRange(palace) && item.palace_name === palace.name,
  ) ?? null;
}

function starTone(star: ZiweiStar): string | undefined {
  return star.mutagen.length > 0 ? star.mutagen : undefined;
}

function StarChip({ star, major }: { readonly star: ZiweiStar; readonly major: boolean }) {
  return (
    <span
      className="shijing-ziwei-star"
      data-major={major ? '' : undefined}
      data-bright={star.brightness || undefined}
      data-mutagen={starTone(star)}
    >
      <span className="shijing-ziwei-star__name">{star.name}</span>
      {star.brightness ? <span className="shijing-ziwei-star__brightness">{star.brightness}</span> : null}
      {star.mutagen ? <span className="shijing-ziwei-star__hua">{star.mutagen}</span> : null}
    </span>
  );
}

function PalaceStars({ palace }: { readonly palace: ZiweiPalace }) {
  const ziweiCopy = useProductCopy().ziweiSurface;
  const ZIWEI_ROUTE_COPY = ziweiCopy.route;
  const empty = palace.major_stars.length === 0 && palace.minor_stars.length === 0;
  return (
    <div className="shijing-ziwei-palace__stars">
      {palace.major_stars.map((star) => <StarChip key={`major:${star.name}`} star={star} major />)}
      {palace.minor_stars.map((star) => <StarChip key={`minor:${star.name}`} star={star} major={false} />)}
      {empty ? <span className="shijing-ziwei-palace__empty">{ZIWEI_ROUTE_COPY.emptyPalace}</span> : null}
    </div>
  );
}

function ZiweiPalaceGrid({
  chart,
  selectedKey,
  onSelect,
}: {
  readonly chart: ZiweiSubjectChart;
  readonly selectedKey: string;
  readonly onSelect: (key: string) => void;
}) {
  const ziweiCopy = useProductCopy().ziweiSurface;
  const ZIWEI_ROUTE_COPY = ziweiCopy.route;
  return (
    <div className="shijing-ziwei-grid" role="list" aria-label={ZIWEI_ROUTE_COPY.chartTitle}>
      {chart.palaces.map((palace) => {
        const key = palaceKey(palace);
        const selected = key === selectedKey;
        return (
          <button
            key={key}
            type="button"
            className="shijing-ziwei-palace"
            data-branch={palace.earthly_branch}
            data-selected={selected ? '' : undefined}
            data-soul={palace.is_soul ? '' : undefined}
            data-body={palace.is_body ? '' : undefined}
            aria-pressed={selected}
            onClick={() => onSelect(key)}
          >
            <span className="shijing-ziwei-palace__top">
              <span className="shijing-ziwei-palace__name">
                {palace.name}
                {palace.is_body ? <span className="shijing-ziwei-palace__body-mark">{ZIWEI_ROUTE_COPY.bodyRole}</span> : null}
              </span>
              <span className="shijing-ziwei-palace__age">{ageRange(palace)}</span>
            </span>
            <PalaceStars palace={palace} />
            <span className="shijing-ziwei-palace__branch">{palace.heavenly_stem}{palace.earthly_branch}</span>
          </button>
        );
      })}
      <div className="shijing-ziwei-center">
        <p>{ZIWEI_ROUTE_COPY.centralEyebrow}</p>
        <h3>{ZIWEI_ROUTE_COPY.chartTitle}</h3>
        <dl>
          <div>
            <dt>{ZIWEI_ROUTE_COPY.basis.fiveElements}</dt>
            <dd>{chart.five_elements_class}</dd>
          </div>
          <div>
            <dt>{ZIWEI_ROUTE_COPY.basis.soulStar}</dt>
            <dd>{chart.soul_star}</dd>
          </div>
          <div>
            <dt>{ZIWEI_ROUTE_COPY.basis.bodyStar}</dt>
            <dd>{chart.body_star}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function PalaceDetail({
  palace,
  guidance,
}: {
  readonly palace: ZiweiPalace;
  readonly guidance: MingJingZiweiDecadeGuidance | null;
}) {
  const ziweiCopy = useProductCopy().ziweiSurface;
  const ZIWEI_ROUTE_COPY = ziweiCopy.route;
  const roles = [
    palace.is_soul ? ZIWEI_ROUTE_COPY.soulRole : null,
    palace.is_body ? ZIWEI_ROUTE_COPY.bodyRole : null,
    ZIWEI_ROUTE_COPY.selectedRole,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const domain = palaceDomainCopy(palace, ziweiCopy);
  const paragraphs = palaceInterpretationSections(palace, ziweiCopy);
  const hasMajor = palace.major_stars.length > 0;
  const hasMinor = palace.minor_stars.length > 0;

  return (
    <aside className="shijing-mingjing-panel shijing-ziwei-detail" aria-label={ZIWEI_ROUTE_COPY.palaceDetailEyebrow}>
      <header className="shijing-ziwei-detail__head">
        <p className="shijing-mingjing__eyebrow">{ZIWEI_ROUTE_COPY.palaceDetailEyebrow}</p>
        <div className="shijing-ziwei-detail__roles">
          {roles.map((role) => <span key={role}>{role}</span>)}
        </div>
      </header>
      <div className="shijing-ziwei-detail__heading">
        <h2>
          {palace.name}
          <span className="shijing-ziwei-detail__age">{ageRange(palace)}</span>
        </h2>
        <p className="shijing-ziwei-detail__tagline">{domain.tagline}</p>
      </div>
      <div className="shijing-ziwei-detail__stars">
        <div className="shijing-ziwei-detail__star-col">
          <h3>{ZIWEI_ROUTE_COPY.majorStars}</h3>
          <div className="shijing-ziwei-palace__stars">
            {palace.major_stars.map((star) => <StarChip key={`major:${star.name}`} star={star} major />)}
            {hasMajor ? null : <span className="shijing-ziwei-palace__empty">{ZIWEI_ROUTE_COPY.emptyPalace}</span>}
          </div>
        </div>
        <div className="shijing-ziwei-detail__star-col">
          <h3>{ZIWEI_ROUTE_COPY.minorStars} · {ZIWEI_ROUTE_COPY.stemBranchLabel}</h3>
          <div className="shijing-ziwei-detail__minor">
            <div className="shijing-ziwei-palace__stars">
              {palace.minor_stars.map((star) => <StarChip key={`minor:${star.name}`} star={star} major={false} />)}
              {hasMinor ? null : <span className="shijing-ziwei-detail__dash">—</span>}
            </div>
            <span className="shijing-ziwei-detail__branch">{palace.heavenly_stem}{palace.earthly_branch}</span>
          </div>
        </div>
      </div>
      <section className="shijing-ziwei-detail__interpretation">
        <h3>{ZIWEI_ROUTE_COPY.interpretationTitle}</h3>
        {paragraphs.map((text) => <p key={text}>{text}</p>)}
      </section>
      <section className="shijing-ziwei-detail__decade">
        <h3>{ZIWEI_ROUTE_COPY.decadeTitle}</h3>
        <div className="shijing-ziwei-detail__decade-head">
          <span>{ageRange(palace)} · {palace.name}</span>
          <strong>{guidance?.theme ?? majorStarNames(palace, ZIWEI_ROUTE_COPY.emptyPalace)}</strong>
        </div>
        <p>{guidance?.strategy ?? ZIWEI_ROUTE_COPY.decadeEmpty}</p>
      </section>
    </aside>
  );
}

export function ZiweiMingJingRoute({
  chart,
  natalReading,
}: ZiweiMingJingRouteProps) {
  const copy = useProductCopy();
  const ZIWEI_ROUTE_COPY = copy.ziweiSurface.route;
  const z = copy.mingjing.ziweiRoute;
  const basis = natalReading.output?.chart_basis;
  const palacesByDecade = useMemo(() => decadePalaces(chart), [chart]);
  const defaultPalace = soulPalace(chart) ?? palacesByDecade[0] ?? chart.palaces[0];
  const [selectedPalaceKey, setSelectedPalaceKey] = useState(() => defaultPalace ? palaceKey(defaultPalace) : '');
  const selectedPalace = useMemo(
    () => chart.palaces.find((palace) => palaceKey(palace) === selectedPalaceKey) ?? defaultPalace,
    [chart.palaces, defaultPalace, selectedPalaceKey],
  );
  const selectedGuidance = useMemo(
    () => (selectedPalace ? findDecadeGuidance(natalReading.output, selectedPalace) : null),
    [natalReading.output, selectedPalace],
  );

  const basisItems = [
    [ZIWEI_ROUTE_COPY.basis.soulPalace, basis?.soul_palace_name ?? palaceName(chart, (palace) => palace.is_soul)],
    [ZIWEI_ROUTE_COPY.basis.bodyPalace, basis?.body_palace_name ?? bodyPalaceName(chart)],
    [ZIWEI_ROUTE_COPY.basis.fiveElements, basis?.five_elements_class ?? chart.five_elements_class],
    [ZIWEI_ROUTE_COPY.basis.soulStar, basis?.soul_star ?? chart.soul_star],
    [ZIWEI_ROUTE_COPY.basis.bodyStar, basis?.body_star ?? chart.body_star],
    [ZIWEI_ROUTE_COPY.basis.palaces, String(basis?.palace_count ?? chart.palaces.length)],
  ] as const;

  return (
    <div className="shijing-mingjing__panels shijing-mingjing__panels--ziwei" data-mingjing-route="ziwei_sanhe_v1">
      <section className="shijing-ziwei-persona" aria-label={z.chartTitle}>
        <div className="shijing-ziwei-persona__mark" aria-hidden>{ZIWEI_ROUTE_COPY.personaMark}</div>
        <div className="shijing-ziwei-persona__identity">
          <h3>{ZIWEI_ROUTE_COPY.personaTitle}</h3>
          <p>{ZIWEI_ROUTE_COPY.personaSubtitle}</p>
        </div>
        <dl className="shijing-ziwei-persona__facts">
          {basisItems.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="shijing-ziwei-workspace">
        <section className="shijing-mingjing-panel shijing-ziwei-chart" aria-label={z.astrolabeAria}>
          <header className="shijing-ziwei-chart__head">
            <div>
              <h2 className="shijing-mingjing-panel__title">{ZIWEI_ROUTE_COPY.chartTitle}</h2>
              <p>{ZIWEI_ROUTE_COPY.chartHint}</p>
            </div>
            <div className="shijing-ziwei-chart__legend" aria-label={ZIWEI_ROUTE_COPY.sihuaLabel}>
              {HUA_LEGEND.map(([key, label]) => <span key={key} data-mutagen={key}>{label}</span>)}
            </div>
          </header>
          <ZiweiPalaceGrid chart={chart} selectedKey={selectedPalaceKey} onSelect={setSelectedPalaceKey} />
        </section>
        {selectedPalace ? <PalaceDetail palace={selectedPalace} guidance={selectedGuidance} /> : null}
      </div>

      <MingJingZiweiReadingView
        output={natalReading.output}
        stale={natalReading.stale}
        loading={natalReading.loading}
        failure={natalReading.failure}
        onGenerate={natalReading.onGenerate}
      />
    </div>
  );
}
