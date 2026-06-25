import { useMemo, useState } from 'react';
import type { ZiweiPalace, ZiweiStar, ZiweiSubjectChart } from '../../../domain/algorithm.ts';
import type { MingJingZiweiNatalMirrorOutput } from '../../../domain/mirror-output.ts';
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
  readonly scopeBody: string;
  readonly starBody: string;
  readonly decadeBody: string;
  readonly boundaryBody: string;
}

const DEFAULT_PALACE_DOMAIN_COPY: PalaceDomainCopy = {
  scopeBody: '这个宫位显示你在这一人生方向里的自然反应、投入方式与需要经营的关系场域。',
  starBody: '把星曜放回这个宫位阅读时，重点是看这组力量如何作用在当前宫位主题上，而不是脱离宫位单独看星名。',
  decadeBody: '这段时间会把当前宫位主题推到生活前台，适合用更清楚的节奏和边界处理相关责任。',
  boundaryBody: '这里不是单点断语，也不是必然事件判断；它提示的是这个宫位在你命盘里的长期主题。',
};

const PALACE_DOMAIN_COPY: Record<string, PalaceDomainCopy> = {
  命宫: {
    scopeBody: '命宫看你的本命底色、做决定的惯性，以及你如何把自己放进人生主轴。',
    starBody: '这些星曜落在命宫时，重点是看你的自我驱动力、反应速度与稳定感如何成形。',
    decadeBody: '这段大限更容易回到自我定位、生活方向和身份选择，需要把真正重要的事排到前面。',
    boundaryBody: '命宫不是给人格贴死标签；它提示你更容易用哪种方式启动人生议题。',
  },
  兄弟: {
    scopeBody: '兄弟宫看手足、同辈、同学与平级协作关系，也看你如何处理横向支持和竞争。',
    starBody: '这些星曜落在兄弟宫时，重点是看同辈关系里的互助、距离、资源交换与摩擦方式。',
    decadeBody: '这段大限更容易被同辈网络、团队默契或手足事务牵动，需要分清支持与过度卷入。',
    boundaryBody: '兄弟宫不是断谁一定帮你或拖累你；它提示平级关系在你生命里的运行方式。',
  },
  夫妻: {
    scopeBody: '夫妻宫看亲密关系、长期伴侣与深度合作，也看你如何面对承诺、期待和相处节奏。',
    starBody: '这些星曜落在夫妻宫时，重点是看关系里的吸引、协商、边界和长期稳定度。',
    decadeBody: '这段大限更容易把亲密关系或重要合作放到前台，需要把期待说清楚，也给彼此留空间。',
    boundaryBody: '夫妻宫不是匹配分数，也不是婚恋必然结论；它提示你在长期关系里的课题。',
  },
  子女: {
    scopeBody: '子女宫看你和子女、晚辈、学生及作品延续之间的互动方式，也看照护责任如何进入你的生活节奏。',
    starBody: '这些星曜落在子女宫时，重点不是泛泛看个性，而是看你面对孩子、晚辈或延续性作品时如何给支持、立边界、处理距离。',
    decadeBody: '子女、晚辈、学生、创作承接或照护责任更容易被推到前台，需要把自由移动与稳定陪伴安排清楚。',
    boundaryBody: '这里不是生育数量或必然事件判断；它提示的是你与下一代、晚辈或延续性作品之间的关系主题。',
  },
  财帛: {
    scopeBody: '财帛宫看金钱、收入方式、资源使用习惯，也看你如何感知安全感和交换价值。',
    starBody: '这些星曜落在财帛宫时，重点是看资源流动、消费取舍、收益节奏与风险边界。',
    decadeBody: '这段大限更容易围绕收入结构、资产配置和资源调度展开，需要让钱的去向服务长期目标。',
    boundaryBody: '财帛宫不是财富数额预测；它提示你经营资源和安全感时的主旋律。',
  },
  疾厄: {
    scopeBody: '疾厄宫看身体节律、压力承载、恢复能力与长期消耗点，也看你如何照顾自己。',
    starBody: '这些星曜落在疾厄宫时，重点是看压力如何累积、释放，以及哪些习惯需要提前管理。',
    decadeBody: '这段大限更适合把作息、体力、情绪和身体检查纳入稳定计划，少用硬扛替代照护。',
    boundaryBody: '疾厄宫不是医学诊断；它提示身心节律和压力管理的命盘主题。',
  },
  迁移: {
    scopeBody: '迁移宫看外部环境、远行、迁居、异地发展与离开熟悉场域后的表现。',
    starBody: '这些星曜落在迁移宫时，重点是看你在外界舞台上的机会、适应力和风险感知。',
    decadeBody: '这段大限更容易出现出行、迁动、外部合作或换环境议题，需要把探索和落地能力配合起来。',
    boundaryBody: '迁移宫不是一定离乡或迁居；它提示你面对外部世界时的展开方式。',
  },
  仆役: {
    scopeBody: '仆役宫看朋友、团队、下属、合作伙伴和服务网络，也看你如何选择同行者。',
    starBody: '这些星曜落在仆役宫时，重点是看团队关系里的信任、分工、凝聚与人际成本。',
    decadeBody: '这段大限更容易被团队、社群或合作对象牵动，需要把人情、职责和利益边界说清。',
    boundaryBody: '仆役宫不是人脉多少的排名；它提示你在群体关系中的合作模式。',
  },
  官禄: {
    scopeBody: '官禄宫看事业、职责、专业路径和社会角色，也看你如何承担被看见的任务。',
    starBody: '这些星曜落在官禄宫时，重点是看职业主轴、做事风格、权责结构和成就感来源。',
    decadeBody: '这段大限更容易把职业选择、职位责任或专业升级推到前台，需要用稳定成果回应机会。',
    boundaryBody: '官禄宫不是职业清单；它提示你适合如何经营长期事业角色。',
  },
  田宅: {
    scopeBody: '田宅宫看居所、家庭基底、不动产、私域空间与安定感来源。',
    starBody: '这些星曜落在田宅宫时，重点是看家宅经营、空间选择、家庭资源与内在安全感。',
    decadeBody: '这段大限更容易围绕住处、家人资源、房产或长期安顿展开，需要让生活底盘更稳。',
    boundaryBody: '田宅宫不是房产数量判断；它提示你与家宅和内在安顿之间的关系。',
  },
  福德: {
    scopeBody: '福德宫看精神余裕、休息方式、内在满足和独处时的能量恢复。',
    starBody: '这些星曜落在福德宫时，重点是看你如何获得安定、快乐、信念支撑与心理缓冲。',
    decadeBody: '这段大限更适合修复消耗、重建兴趣和精神秩序，避免只用外在成绩定义生活。',
    boundaryBody: '福德宫不是快乐指数；它提示你怎样养护内在能量。',
  },
  父母: {
    scopeBody: '父母宫看父母、长辈、师长、制度资源和早年承接的规则感。',
    starBody: '这些星曜落在父母宫时，重点是看你与长辈权威、教育资源和制度支持之间的互动方式。',
    decadeBody: '这段大限更容易触及长辈关系、资质背书、制度门槛或家族责任，需要在尊重和自我决定之间取平衡。',
    boundaryBody: '父母宫不是断亲缘好坏；它提示长辈和制度资源如何影响你的人生节奏。',
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

function starText(star: ZiweiStar): string {
  const brightness = star.brightness ? `（${star.brightness}）` : '';
  const mutagen = star.mutagen ? `化${star.mutagen}` : '';
  return `${star.name}${brightness}${mutagen}`;
}

function starListText(stars: readonly ZiweiStar[], emptyLabel: string): string {
  return stars.length > 0 ? stars.map(starText).join('、') : emptyLabel;
}

function palaceInterpretationSections(palace: ZiweiPalace): readonly {
  readonly title: string;
  readonly body: string;
}[] {
  const domain = palaceDomainCopy(palace);
  const stemBranch = `${palace.heavenly_stem}${palace.earthly_branch}`;
  const range = ageRange(palace);
  const majorStars = starListText(palace.major_stars, '无主星');
  const minorStars = starListText(palace.minor_stars, '辅曜暂少');

  return [
    {
      title: `${palace.name}在你的命盘里`,
      body: `${domain.scopeBody} 当前宫位落在${stemBranch}，对应${range}大限。`,
    },
    {
      title: '星曜落点',
      body: `${palace.name}主星为${majorStars}，辅曜为${minorStars}。${domain.starBody}`,
    },
    {
      title: `${range}大限提示`,
      body: `这段大限走到${palace.name}，${domain.decadeBody}`,
    },
    {
      title: '阅读边界',
      body: domain.boundaryBody,
    },
  ];
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

function PalaceDetail({ palace }: { readonly palace: ZiweiPalace }) {
  const roles = [
    palace.is_soul ? ZIWEI_ROUTE_COPY.soulRole : null,
    palace.is_body ? ZIWEI_ROUTE_COPY.bodyRole : null,
    ZIWEI_ROUTE_COPY.selectedRole,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const interpretationSections = palaceInterpretationSections(palace);

  return (
    <aside className="shijing-mingjing-panel shijing-ziwei-detail" aria-label={ZIWEI_ROUTE_COPY.palaceDetailEyebrow}>
      <p className="shijing-mingjing__eyebrow">{ZIWEI_ROUTE_COPY.palaceDetailEyebrow}</p>
      <div className="shijing-ziwei-detail__title-row">
        <h2>{palace.name}</h2>
        <div className="shijing-ziwei-detail__roles">
          {roles.map((role) => <span key={role}>{role}</span>)}
        </div>
      </div>
      <dl className="shijing-ziwei-detail__meta">
        <div>
          <dt>{ZIWEI_ROUTE_COPY.ageLabel}</dt>
          <dd>{ageRange(palace)}</dd>
        </div>
        <div>
          <dt>{ZIWEI_ROUTE_COPY.stemBranchLabel}</dt>
          <dd>{palace.heavenly_stem}{palace.earthly_branch}</dd>
        </div>
      </dl>
      <div className="shijing-ziwei-detail__stars">
        <h3>{ZIWEI_ROUTE_COPY.majorStars}</h3>
        <PalaceStars palace={{ ...palace, minor_stars: [] }} />
        {palace.minor_stars.length > 0 ? (
          <>
            <h3>{ZIWEI_ROUTE_COPY.minorStars}</h3>
            <div className="shijing-ziwei-palace__stars">
              {palace.minor_stars.map((star) => <StarChip key={`detail:${star.name}`} star={star} major={false} />)}
            </div>
          </>
        ) : null}
      </div>
      <section className="shijing-ziwei-detail__interpretation">
        <h3>{ZIWEI_ROUTE_COPY.interpretationTitle}</h3>
        {interpretationSections.map((section) => (
          <div key={section.title}>
            <h4>{section.title}</h4>
            <p>{section.body}</p>
          </div>
        ))}
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
        {selectedPalace ? <PalaceDetail palace={selectedPalace} /> : null}
      </div>

      <MingJingZiweiReadingView
        output={natalReading.output}
        stale={natalReading.stale}
        loading={natalReading.loading}
        failure={natalReading.failure}
        onGenerate={natalReading.onGenerate}
        decadePalaces={palacesByDecade}
      />
    </div>
  );
}
