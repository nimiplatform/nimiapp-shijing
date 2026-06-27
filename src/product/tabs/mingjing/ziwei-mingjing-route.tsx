import { useMemo, useState } from 'react';
import type { ZiweiPalace, ZiweiStar, ZiweiSubjectChart } from '../../../domain/algorithm.ts';
import type { MingJingZiweiDecadeGuidance, MingJingZiweiNatalMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { useProductCopy } from '../../i18n/copy.ts';
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

const ZIWEI_ROUTE_COPY = {
  personaMark: '命',
  personaTitle: '本人命盘',
  personaSubtitle: '命主 · 紫微本命盘',
  chartTitle: '紫微命盘',
  chartHint: '点击宫位查看星曜详情',
  centralEyebrow: 'ZIWEI · 三合派',
  emptyPalace: '空宫',
  minorStars: '辅曜',
  majorStars: '主星',
  palaceDetailEyebrow: 'PALACE DETAIL',
  ageLabel: '大限',
  stemBranchLabel: '干支',
  sihuaLabel: '四化',
  interpretationTitle: '宫位解读',
  decadeTitle: '大限指引',
  decadeEmpty: '生成解读后，这里会显示该大限的主题与行动建议。',
  soulRole: '命主宫',
  bodyRole: '身宫',
  selectedRole: '当前查看',
  basis: {
    soulPalace: '命宫',
    bodyPalace: '身宫',
    fiveElements: '五行局',
    soulStar: '命主',
    bodyStar: '身主',
    palaces: '宫数',
  },
} as const;

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

const DEFAULT_PALACE_DOMAIN_COPY: PalaceDomainCopy = {
  tagline: '人生方向 · 关系场域',
  scope: '这个宫位显示你在这一人生方向里的自然反应、投入方式与需要经营的关系。',
  boundary: '它提示这个宫位在你命盘里的长期主题，而非单点断语或必然事件。',
};

const PALACE_DOMAIN_COPY: Record<string, PalaceDomainCopy> = {
  命宫: {
    tagline: '自我 · 人生主轴',
    scope: '命宫看你的本命底色、做决定的惯性，以及你如何把自己放进人生主轴。',
    boundary: '它不是给人格贴死标签，而是提示你更容易用哪种方式启动人生议题。',
  },
  兄弟: {
    tagline: '同辈 · 横向协作',
    scope: '兄弟宫看手足、同辈与平级协作，也看你如何处理横向支持和竞争。',
    boundary: '它提示平级关系的运行方式，而非断定谁一定帮你或拖累你。',
  },
  夫妻: {
    tagline: '亲密 · 长期关系',
    scope: '夫妻宫看亲密关系、长期伴侣与深度合作，以及你面对承诺和相处节奏的方式。',
    boundary: '它提示你在长期关系里的课题，而不是匹配分数或婚恋结论。',
  },
  子女: {
    tagline: '晚辈 · 创作承接',
    scope: '子女宫看你与子女、晚辈、学生及作品延续之间的互动，以及照护责任如何进入生活节奏。',
    boundary: '它提示你与下一代和延续性作品的关系主题，不是生育数量或必然事件。',
  },
  财帛: {
    tagline: '金钱 · 资源安全感',
    scope: '财帛宫看金钱、收入方式与资源使用习惯，也看你如何感知安全感与交换价值。',
    boundary: '它提示你经营资源和安全感的主旋律，而非预测财富数额。',
  },
  疾厄: {
    tagline: '身心 · 压力节律',
    scope: '疾厄宫看身体节律、压力承载与恢复能力，也看你如何照顾自己。',
    boundary: '它提示身心节律与压力管理的主题，并非医学诊断。',
  },
  迁移: {
    tagline: '外部 · 远行机会',
    scope: '迁移宫看外部环境、远行、迁居与离开熟悉场域后的表现。',
    boundary: '它提示你面对外部世界的展开方式，而非一定离乡或迁居。',
  },
  仆役: {
    tagline: '团队 · 人际网络',
    scope: '仆役宫看朋友、团队、下属与合作网络，也看你如何选择同行者。',
    boundary: '它提示你在群体关系中的合作模式，而非人脉多少的排名。',
  },
  官禄: {
    tagline: '事业 · 社会角色',
    scope: '官禄宫看事业、职责、专业路径与社会角色，也看你如何承担被看见的任务。',
    boundary: '它提示你适合如何经营长期事业角色，而非给出职业清单。',
  },
  田宅: {
    tagline: '家宅 · 内在安顿',
    scope: '田宅宫看居所、家庭基底、私域空间与安定感来源。',
    boundary: '它提示你与家宅和内在安顿的关系，而非判断房产数量。',
  },
  福德: {
    tagline: '精神 · 内在能量',
    scope: '福德宫看精神余裕、休息方式与独处时的能量恢复。',
    boundary: '它提示你如何养护内在能量，而非衡量快乐指数。',
  },
  父母: {
    tagline: '原生家庭 · 权威课题',
    scope: '父母宫看父母、长辈、师长与制度资源，以及早年承接的规则感。',
    boundary: '它提示长辈与制度资源如何影响你的节奏，而非断定亲缘好坏。',
  },
};

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

function palaceDomainCopy(palace: ZiweiPalace): PalaceDomainCopy {
  return PALACE_DOMAIN_COPY[palace.name] ?? DEFAULT_PALACE_DOMAIN_COPY;
}

function palaceInterpretationSections(palace: ZiweiPalace): readonly string[] {
  const domain = palaceDomainCopy(palace);
  return [domain.scope, domain.boundary];
}

function majorStarNames(palace: ZiweiPalace): string {
  return palace.major_stars.map((star) => star.name).join(' ') || ZIWEI_ROUTE_COPY.emptyPalace;
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
  const roles = [
    palace.is_soul ? ZIWEI_ROUTE_COPY.soulRole : null,
    palace.is_body ? ZIWEI_ROUTE_COPY.bodyRole : null,
    ZIWEI_ROUTE_COPY.selectedRole,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const domain = palaceDomainCopy(palace);
  const paragraphs = palaceInterpretationSections(palace);
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
          <strong>{guidance?.theme ?? majorStarNames(palace)}</strong>
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
