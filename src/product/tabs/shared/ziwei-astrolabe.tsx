// 紫微斗数 命盘 evidence view — the twelve palaces laid out in the traditional
// fixed-branch 4×4 grid (巳午未申 / 辰·酉 / 卯·戌 / 寅丑子亥) with a centre panel
// for 命主/身主/五行局. Renders ZiweiSubjectChart method evidence; read-only.

import type { ZiweiPalace, ZiweiStar, ZiweiSubjectChart } from '../../../domain/algorithm.ts';

// Fixed grid position (1-indexed row/col) for each earthly branch. The 紫微
// evidence carries branches as Chinese characters (iztro), so keys are Chinese.
const BRANCH_POS: Record<string, { r: number; c: number }> = {
  巳: { r: 1, c: 1 }, 午: { r: 1, c: 2 }, 未: { r: 1, c: 3 }, 申: { r: 1, c: 4 },
  辰: { r: 2, c: 1 }, 酉: { r: 2, c: 4 },
  卯: { r: 3, c: 1 }, 戌: { r: 3, c: 4 },
  寅: { r: 4, c: 1 }, 丑: { r: 4, c: 2 }, 子: { r: 4, c: 3 }, 亥: { r: 4, c: 4 },
};

const MUTAGEN_COLOR: Record<string, string> = {
  禄: '#1a7f37', 权: '#9a6700', 科: '#0969da', 忌: '#cf222e',
};

function StarChip({ star, major }: { star: ZiweiStar; major: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1, marginRight: 5, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: major ? 13 : 11, fontWeight: major ? 600 : 400, color: major ? '#1f2328' : '#57606a' }}>
        {star.name}
      </span>
      {star.brightness ? (
        <span style={{ fontSize: 9, color: '#8c959f' }}>{star.brightness}</span>
      ) : null}
      {star.mutagen ? (
        <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: MUTAGEN_COLOR[star.mutagen] ?? '#57606a', borderRadius: 3, padding: '0 3px', lineHeight: '14px' }}>
          {star.mutagen}
        </span>
      ) : null}
    </span>
  );
}

function PalaceCell({ palace }: { palace: ZiweiPalace }) {
  const pos = BRANCH_POS[palace.earthly_branch] ?? { r: 1, c: 1 };
  return (
    <div
      style={{
        gridRow: pos.r, gridColumn: pos.c,
        border: palace.is_soul ? '2px solid #8250df' : '1px solid #d0d7de',
        borderRadius: 8, padding: '6px 7px', background: palace.is_soul ? '#faf7ff' : '#fff',
        display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: palace.is_soul ? '#8250df' : '#1f2328' }}>
          {palace.name}
          {palace.is_body ? <span style={{ fontSize: 9, color: '#bf3989', marginLeft: 3 }}>身</span> : null}
        </span>
        <span style={{ fontSize: 10, color: '#8c959f' }}>
          {palace.decadal_start_age}–{palace.decadal_end_age}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: 2, flex: 1, alignContent: 'flex-start' }}>
        {palace.major_stars.map((s) => <StarChip key={s.name} star={s} major />)}
        {palace.minor_stars.map((s) => <StarChip key={s.name} star={s} major={false} />)}
        {palace.major_stars.length === 0 && palace.minor_stars.length === 0 ? (
          <span style={{ fontSize: 11, color: '#bbb' }}>（空宫）</span>
        ) : null}
      </div>
      <div style={{ fontSize: 10, color: '#8c959f', textAlign: 'right', marginTop: 2 }}>
        {palace.heavenly_stem}{palace.earthly_branch}
      </div>
    </div>
  );
}

export function ZiweiAstrolabe({ chart }: { chart: ZiweiSubjectChart }) {
  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, minmax(96px, 1fr))',
          gap: 6,
        }}
      >
        {chart.palaces.map((p) => <PalaceCell key={p.index} palace={p} />)}
        <div
          style={{
            gridRow: '2 / 4', gridColumn: '2 / 4',
            border: '1px solid #d0d7de', borderRadius: 8, background: '#f6f8fa',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 10,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2328' }}>紫微命盘</div>
          <div style={{ fontSize: 12, color: '#424a53', textAlign: 'center', lineHeight: 1.8 }}>
            <div>五行局 <b>{chart.five_elements_class}</b></div>
            <div>命主 <b>{chart.soul_star}</b> · 身主 <b>{chart.body_star}</b></div>
            <div>命宫地支 <b>{chart.soul_palace_branch}</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}
