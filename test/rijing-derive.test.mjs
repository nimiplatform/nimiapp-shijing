import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveRiJingActions,
  deriveRiJingHero,
  rijingDateLabel,
} from '../src/product/tabs/rijing/rijing-derive.ts';
import { deriveRiJingDailyAlmanac } from '../src/product/tabs/rijing/rijing-daily-almanac.ts';
import { getProductCopy } from '../src/product/i18n/copy.ts';
import { validEventMemory, validReading, validRijingOutput } from './_fixtures.mjs';

test('deriveRiJingActions returns empty actions when no reading exists', () => {
  assert.deepEqual(deriveRiJingActions(undefined), []);
});

test('deriveRiJingActions yields do/say items tagged with their source concern', () => {
  const reading = validReading({
    output: validRijingOutput({
      concern_projections: [
        {
          concern_tag_ref: 'tag_career',
          tendency_class: 'supportive',
          summary: '事业稳中求进，先确认目标与边界再推进。',
          recommendations: ['先在纸上列出三个核心论点。', '把对方的回应复述一次再承诺。'],
        },
      ],
    }),
  });

  const items = deriveRiJingActions(reading, getProductCopy('zh'), [
    { id: 'tag_career', label: '#事业' },
  ]);

  assert.equal(items.length, 2);
  assert.equal(items[0].slot, 'do');
  assert.equal(items[0].body, '先在纸上列出三个核心论点。');
  assert.equal(items[0].source_tag, '#事业');
  assert.equal(items[1].slot, 'say');
  assert.equal(items[1].body, '把对方的回应复述一次再承诺。');
  // The product never synthesizes an 'avoid' card.
  assert.equal(
    items.some((item) => item.slot === 'avoid'),
    false,
  );
});

test('deriveRiJingDailyAlmanac builds a generic almanac from the civil date', () => {
  const almanac = deriveRiJingDailyAlmanac('2026-06-24');

  assert.equal(almanac.lunar_title, '五月初十');
  assert.equal(almanac.ganzhi_line, '丙午年 甲午月 己巳日 周三');
  assert.deepEqual(almanac.recommends.slice(0, 4), ['嫁娶', '合帐', '裁衣', '冠笄']);
  assert.deepEqual(almanac.avoids, ['安床', '祈福', '出行', '安葬', '行丧', '开光']);
  assert.deepEqual(almanac.direction_rows, [
    { label: '财神', value: '北' },
    { label: '喜神', value: '东北' },
    { label: '福神', value: '南' },
    { label: '阳贵', value: '北' },
  ]);
  assert.deepEqual(almanac.foundation_rows, [
    { label: '五行', value: '大林木' },
    { label: '建除', value: '闭日' },
    { label: '冲煞', value: '冲猪 煞东' },
    { label: '值神', value: '玄武' },
  ]);
  assert.equal(almanac.pengzu, '己不破券二比并亡 巳不远行财物伏藏');
  assert.equal(almanac.fetus, '占门床 外正南');
  assert.equal(almanac.good_gods, '四相 王日 玉宇');
  assert.equal(almanac.bad_gods, '游祸 血支 重日 元武');
  assert.equal(almanac.hours.length, 12);
  assert.deepEqual(almanac.hours.slice(0, 4), [
    { branch: '子', luck: '凶' },
    { branch: '丑', luck: '吉' },
    { branch: '寅', luck: '凶' },
    { branch: '卯', luck: '凶' },
  ]);
});

test('deriveRiJingDailyAlmanac fails closed for invalid civil dates', () => {
  assert.equal(deriveRiJingDailyAlmanac('2026-99-99'), null);
});

test('deriveRiJingHero names profile blockers instead of asking for refresh', () => {
  const hero = deriveRiJingHero(undefined, { empty_state: 'profile_incomplete' });

  assert.equal(hero.hasReading, false);
  assert.match(hero.subtitle, /完善本人生辰资料/);
  assert.doesNotMatch(hero.subtitle, /刷新/);
});

test('deriveRiJingHero names missing focus blockers in the empty note', () => {
  const hero = deriveRiJingHero(undefined, { empty_state: 'missing_focus' });

  assert.match(hero.subtitle, /激活一个关注/);
  assert.match(hero.confidence_note, /不会生成泛化建议/);
});

test('deriveRiJingHero preserves runtime AI fail-close recovery copy', () => {
  const hero = deriveRiJingHero(undefined, { empty_state: 'runtime_ai_failed' });

  assert.match(hero.subtitle, /Runtime AI wording 未完成/);
  assert.match(hero.confidence_note, /云厂商开通状态/);
});

test('deriveRiJingHero builds the overview from a reading and its cited reference event', () => {
  const reading = validReading({
    cited_event_memory_refs: ['mem_today'],
    output: {
      mirror_kind: 'rijing',
      summary: '今日基调：修养蓄力，把不确定变成可准备的节奏。',
      daily_overview: '今天的时间状态适合先稳住呼吸，再把重要合作拆成可确认的边界和下一步。',
      concern_projections: [
        {
          concern_tag_ref: 'tag_career',
          tendency_class: 'supportive',
          summary: '事业视角适合把助力落实成清晰表达，先确认目标、底线和可交付结果。',
          recommendations: ['谈合作前写下三条必须确认的问题。', '把对方的回应复述一次再承诺。'],
        },
        {
          concern_tag_ref: 'tag_body',
          tendency_class: 'steady',
          summary: '身体视角适合减轻紧绷感，用短暂停顿让判断回到稳定状态。',
          recommendations: ['会前留十分钟安静整理。'],
        },
      ],
      cited_event_memory_refs: ['mem_today'],
      cited_plan_item_refs: [],
      citations: [{ method: 'bazi_ziping_v1', reference: 'rijing-rule-01' }],
    },
  });
  const event = validEventMemory('mem_today', {
    occurred_at: '2026-05-25T06:00:00Z',
    body: '下午要谈一个重要合作，心里有点不确定。',
  });

  const hero = deriveRiJingHero(reading, {
    focus_tags: [
      { id: 'tag_career', label: '#事业' },
      { id: 'tag_body', label: '#身体' },
    ],
    reference_memories: [event],
  });

  assert.equal(hero.hasReading, true);
  assert.match(hero.subtitle, /修养蓄力/);
  assert.equal(Object.hasOwn(hero, 'theme'), false);
  // Leanings carry the tendency tone, dominant first.
  assert.equal(hero.leanings[0]?.tone, 'supportive');
  assert.equal(hero.reference_event?.event_body, '下午要谈一个重要合作，心里有点不确定。');
  assert.match(hero.reference_event?.guidance ?? '', /三条必须确认的问题/);
  assert.match(hero.closing_wish, /运由己造/);
});

test('deriveRiJingHero keeps 今日基调 in the subtitle without a duplicate theme field', () => {
  const reading = validReading({
    output: validRijingOutput({
      summary: '今日基调：稳住节奏，把变化拆小。',
      daily_overview:
        '今天的时间状态适合先稳住呼吸，再把重要合作拆成可确认的边界和下一步；不急着一次说完全部判断，先让节奏回到可掌控的位置。',
    }),
  });

  const hero = deriveRiJingHero(reading);

  assert.match(hero.subtitle, /稳住节奏，把变化拆小/);
  assert.equal(Object.hasOwn(hero, 'theme'), false);
});

test('deriveRiJingHero keeps 今日事件解析 visible when no reference event was provided', () => {
  const reading = validReading({
    cited_event_memory_refs: [],
    output: {
      mirror_kind: 'rijing',
      summary: '修养蓄力',
      daily_overview: '今天像一盏灯被调到柔和的亮度，适合把心绪放慢，把手边的事一件件安顿好。',
      concern_projections: [
        {
          concern_tag_ref: 'tag_career',
          tendency_class: 'steady',
          summary: '事业上不必急着证明自己，先把会议材料和邮件措辞整理清楚，稳定反而会成为你的力量。',
          recommendations: ['先确认今天最重要的一封邮件。'],
        },
      ],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      citations: [{ method: 'bazi_ziping_v1', reference: 'rijing-rule-01' }],
    },
  });

  const hero = deriveRiJingHero(reading, {
    focus_tags: [{ id: 'tag_career', label: '#事业' }],
    reference_memories: [],
  });

  assert.equal(hero.reference_event?.title, '今日事件解析');
  assert.match(hero.reference_event?.event_body ?? '', /没有.*具体事件|未被.*具体事件/);
  assert.match(hero.reference_event?.guidance ?? '', /整体能量|生活哲理|节奏|选择/);
  assert.doesNotMatch(hero.reference_event?.guidance ?? '', /用户今日未提供具体事件/);
});

test('deriveRiJingReferenceEventRefs selects the latest eligible RiJing event for the daily scope', async () => {
  const mod = await import('../src/product/tabs/rijing/rijing-derive.ts');
  assert.equal(typeof mod.deriveRiJingReferenceEventRefs, 'function');

  const refs = mod.deriveRiJingReferenceEventRefs({
    memories: [
      validEventMemory('mem_old', {
        source: 'rijing',
        occurred_at: '2026-05-25T01:00:00Z',
      }),
      validEventMemory('mem_new', {
        source: 'rijing',
        occurred_at: '2026-05-25T09:00:00Z',
      }),
      validEventMemory('mem_record_only', {
        source: 'rijing',
        occurred_at: '2026-05-25T10:00:00Z',
        admissible_use: 'record_only',
      }),
      validEventMemory('mem_manual', {
        source: 'manual',
        occurred_at: '2026-05-25T11:00:00Z',
      }),
      validEventMemory('mem_previous_day', {
        source: 'rijing',
        occurred_at: '2026-05-24T09:00:00Z',
      }),
    ],
    scope: { kind: 'daily', date: '2026-05-25', basis_time_zone: 'Asia/Shanghai' },
  });

  assert.deepEqual(refs, ['mem_new']);
});

test('deriveRiJing helpers use English product copy when provided', () => {
  const copy = getProductCopy('en');
  const hero = deriveRiJingHero(undefined, { empty_state: 'missing_focus', copy });
  const actions = deriveRiJingActions(
    validReading(),
    copy,
    [{ id: 'tag_love', label: '#love' }],
  );
  const date = rijingDateLabel('Asia/Shanghai', copy, new Date('2026-06-17T00:00:00Z'));

  assert.equal(hero.headline, 'Daily Mirror has not been generated');
  assert.match(hero.subtitle, /Add and activate one concern/);
  assert.equal(actions[0]?.slot, 'do');
  assert.equal(actions[0]?.eyebrow, 'Do one thing today');
  assert.equal(date.weekday, 'Wednesday');
  assert.equal(date.zone, 'Beijing time');
});
