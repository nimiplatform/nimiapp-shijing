// Audit P1 (both reports) — 年镜 (NianJing) phase nature was hardcoded to
// 'turning' for every band in both engines, making the whole 10-year timeline a
// uniform wall of 转折期 with zero information. Nature must now be derived from
// the period's quality: 八字 = 流年/大限 element vs 用神; 紫微 = 大限 四化 飞入 the
// concern palace.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAstrologyFeatureSnapshot } from '../../src/product/astrology/build-feature-snapshot.ts';
import { localWallClockToUtcInstant } from '../../src/product/astrology/local-wall-clock.ts';
import { validConcernTag, validNatalInputs, validShiJingSpace } from '../_fixtures.mjs';

const TZ = 'Asia/Shanghai';

function nianjingCommon(methodProfileId) {
  const natal = {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: '1990-04-12', local_time_text: '08:30', place_text: 'Shanghai' },
    birth_datetime_utc: localWallClockToUtcInstant('1990-04-12T08:30:00', TZ).toISOString(),
    birth_precision: 'exact', calendar_system: 'gregorian', calculation_sex: 'male',
    birth_location: { latitude: 31.2304, longitude: 121.4737, iana_time_zone: TZ, place_name: 'Shanghai' },
  };
  const space = {
    user_id: 'u', self_subject: { natal_inputs: natal }, persons: [], concern_tags: [], event_memories: [], plan_items: [], readings: [], conversations: [],
    settings: {
      ui_language: 'zh',
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
      ...(methodProfileId ? { method_profile_id: methodProfileId } : {}),
    },
  };
  const r = buildAstrologyFeatureSnapshot({
    mirror_kind: 'nianjing',
    mirror_scope: { kind: 'long_horizon', start_date: '2026-01-01', end_date: '2035-12-31', basis_time_zone: TZ },
    space,
    related_person_refs: [],
    active_concern_tags: [validConcernTag('tag_career', { parsed_topics: ['career'], prompt_text: 'career' })],
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.value.common;
}
const nianjingPhases = (m) => nianjingCommon(m).nianjing_phase_drivers;

function baziNianjingCommonForTags(tags) {
  const space = validShiJingSpace({
    self_subject: { natal_inputs: validNatalInputs({ calculation_sex: 'male' }) },
    concern_tags: tags,
  });
  const r = buildAstrologyFeatureSnapshot({
    mirror_kind: 'nianjing',
    mirror_scope: { kind: 'long_horizon', start_date: '2026-01-01', end_date: '2036-12-31', basis_time_zone: TZ },
    space,
    related_person_refs: [],
    active_concern_tags: tags,
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.value.common;
}

function byTag(items) {
  const out = new Map();
  for (const item of items) {
    const list = out.get(item.concern_tag_ref) ?? [];
    list.push(item);
    out.set(item.concern_tag_ref, list);
  }
  return out;
}

test('八字 年镜: phase nature is 用神-derived (varied), not the degenerate all-转折', () => {
  const phases = baziNianjingCommonForTags([
    validConcernTag('tag_general', {
      label: '#整体',
      parsed_topics: ['general'],
      prompt_text: 'general life rhythm',
    }),
  ]).nianjing_phase_drivers;
  assert.ok(phases.length > 2, 'multiple phase bands across the horizon');
  const natures = new Set(phases.map((p) => p.nature));
  assert.ok(!(natures.size === 1 && natures.has('turning')), 'must not be all turning');
  // Sample chart is 身弱 丁火 → 用神 木火. fire/wood 流年 (2026丙/2027丁/2034甲/2035乙)
  // are favourable; 土金水 流年 (2028戊…2033癸) are 忌神.
  assert.ok(phases.some((p) => p.nature === 'supportive'), 'a favourable 用神 period appears');
  assert.ok(phases.some((p) => p.nature === 'watch' || p.nature === 'blocked'), 'a 忌神 period appears');
  // Each phase carries a traceable, opaque period-favourability ref.
  assert.ok(phases.every((p) => p.driver_refs.some((ref) => ref.startsWith('bazi:period.'))), 'period evidence ref present');
});

test('八字 年镜: phase bands continue until the next long-horizon marker', () => {
  const phases = nianjingPhases('bazi_ziping_v1');
  const phase2026 = phases.find((p) => p.start_date === '2026-02-04');

  assert.ok(phase2026, '2026 Li Chun annual phase is present');
  assert.equal(phase2026.end_date, '2027-02-03');
  assert.ok(
    phase2026.start_date <= '2026-06-21' && '2026-06-21' <= phase2026.end_date,
    'the current year remains covered after the annual transition',
  );
});

test('八字 年镜: adjacent DaYun and annual markers are emitted as one cluster', () => {
  const inflections = nianjingCommon('bazi_ziping_v1').nianjing_inflection_drivers;
  const cluster = inflections.find((i) =>
    i.kind === 'marker_cluster' &&
    i.date === '2028-01-01' &&
    i.concern_tag_ref === 'tag_career'
  );

  assert.ok(cluster, '2028 DaYun + annual short window is clustered');
  assert.deepEqual(cluster.date_window, { start_date: '2028-01-01', end_date: '2028-02-04' });
  assert.ok(cluster.driver_refs.some((ref) => ref.startsWith('bazi:dayun_boundary@')));
  assert.ok(cluster.driver_refs.some((ref) => ref.startsWith('bazi:annual_transition@')));
  assert.equal(
    inflections.some((i) => i.kind === 'dayun_boundary' && i.date === '2028-01-01'),
    false,
  );
  assert.equal(
    inflections.some((i) => i.kind === 'annual_transition' && i.date === '2028-02-04'),
    false,
  );
});

test('八字 年镜: phase nature is modulated per concern while inflection dates stay shared', () => {
  const tags = [
    validConcernTag('tag_career', {
      label: '#事业',
      parsed_topics: ['career'],
      prompt_text: 'career work project output',
      sort_order: 0,
    }),
    validConcernTag('tag_body', {
      label: '#身体',
      parsed_topics: ['body'],
      prompt_text: 'body health sleep recovery',
      sort_order: 1,
    }),
    validConcernTag('tag_family', {
      label: '#家人',
      parsed_topics: ['family'],
      prompt_text: 'family household parents partner children',
      sort_order: 2,
    }),
  ];
  const common = baziNianjingCommonForTags(tags);
  const phases = byTag(common.nianjing_phase_drivers);
  const inflections = byTag(common.nianjing_inflection_drivers);

  const phaseSignatures = tags.map((tag) =>
    (phases.get(tag.id) ?? []).map((p) => `${p.start_date}->${p.end_date}:${p.nature}`).join('|')
  );
  assert.equal(new Set(phaseSignatures).size, tags.length, 'career/body/family phase signatures must diverge');

  const inflectionSignatures = tags.map((tag) =>
    (inflections.get(tag.id) ?? []).map((p) => `${p.date}:${p.kind}`).join('|')
  );
  assert.equal(new Set(inflectionSignatures).size, 1, 'inflection dates remain the shared natal-cycle skeleton');

  for (const tag of tags) {
    const driverRefs = (phases.get(tag.id) ?? []).flatMap((p) => p.driver_refs);
    const expectedDomain =
      tag.id === 'tag_body' ? 'health'
        : tag.id === 'tag_family' ? 'family'
          : 'career';
    assert.ok(
      driverRefs.some((ref) => ref === `bazi:domain.${expectedDomain}`),
      `${tag.id} must carry domain evidence`,
    );
    assert.ok(
      driverRefs.some((ref) => ref.startsWith('bazi:tenGod.')),
      `${tag.id} must carry ten-god evidence`,
    );
  }
});

test('紫微 年镜: phase nature is 大限四化×三方四正-derived and genuinely varies', () => {
  const phases = nianjingPhases('ziwei_sanhe_v1');
  assert.ok(phases.length > 0, 'has 大限 phase bands');
  const natures = new Set(phases.map((p) => p.nature));
  // Must vary — catches BOTH the old hardcoded all-转折 AND the sparse all-平稳
  // that a single-palace 四化 check collapsed to (only 三方四正 fixes the latter).
  assert.ok(natures.size >= 2, `expected varied natures, got ${[...natures].join(',')}`);
  assert.ok(phases.every((p) => p.driver_refs.some((ref) => ref.startsWith('ziwei:daxian'))), '大限 evidence ref present');
});

test('紫微 年镜: a 大限 boundary year is not duplicated as an annual transition (audit P3)', () => {
  const inflections = nianjingCommon('ziwei_sanhe_v1').nianjing_inflection_drivers;
  const seen = new Set();
  for (const inf of inflections) {
    const key = `${inf.concern_tag_ref}@${inf.date}`;
    assert.ok(!seen.has(key), `duplicate inflection at ${key}`);
    seen.add(key);
  }
  const kinds = new Set(inflections.map((i) => i.kind));
  assert.ok(kinds.has('dayun_boundary'), '大限 boundary inflection present');
});
