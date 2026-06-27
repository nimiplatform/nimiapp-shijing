import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  relationshipNatalMirrorScope,
  validInputsSummary,
  validMingjingRelationshipOutput,
  validPerson,
  validReading,
} from './_fixtures.mjs';

const hejingTabSource = readFileSync(
  new URL('../src/product/tabs/hejing-tab.tsx', import.meta.url),
  'utf8',
);

function collectStringValues(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStringValues(item));
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((item) => collectStringValues(item));
  }
  return [];
}

test('HeJing workspace id is stable for a related person', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.hejingWorkspaceIdForPerson, 'function');
  assert.equal(model.hejingWorkspaceIdForPerson('p_partner_01'), 'person:p_partner_01');
});

test('HeJing builds a self-plus-person workspace from a newly added Person', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.buildHeJingWorkspaceFromPerson, 'function');
  const workspace = model.buildHeJingWorkspaceFromPerson(
    validPerson('p_partner_01', {
      display_name: '阿楠',
      relation: '朋友',
    }),
  );

  assert.equal(workspace.id, 'person:p_partner_01');
  assert.equal(workspace.selectorLabel, '我 + 阿楠');
  assert.equal(workspace.selectedRelationshipType, 'friend');
  assert.equal(workspace.self.label, '我');
  assert.equal(workspace.other.label, 'TA');
  assert.equal(workspace.other.name, '阿楠');
  assert.deepEqual(workspace.metrics, []);
  assert.deepEqual(workspace.futureWindows, []);
});

test('HeJing side profile copy is user-facing Ziwei relationship structure', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  const workspace = model.buildHeJingWorkspaceFromPerson(
    validPerson('p_snow', {
      display_name: 'Snow',
      relation: '儿子',
    }),
  );
  const sideCopy = [...workspace.self.traits, ...workspace.other.traits].join('\n');
  const workspaceCopy = collectStringValues(workspace).join('\n');

  assert.match(sideCopy, /紫微斗数/u);
  assert.match(sideCopy, /命宫|身宫|主星|四化|亲子宫位/u);
  assert.doesNotMatch(workspaceCopy, /self \+ one Person|Reading|Relation|fail-close|Runtime AI wording/u);
  assert.doesNotMatch(sideCopy, /出生资料已录入人物档案|生成合镜后再呈现/u);
});

test('HeJing profile headings avoid repeating the same self label and name', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');
  const workspace = model.buildHeJingWorkspaceFromPerson(
    validPerson('p_snow_heading', {
      display_name: 'Snow',
      relation: '儿子',
    }),
  );

  assert.equal(model.hejingPersonProfileHeading(workspace.self), '我');
  assert.equal(model.hejingPersonProfileHeading(workspace.other), 'TA · Snow');
});

test('HeJing relationship type tabs follow the admitted display order', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.deepEqual(
    model.HEJING_RELATIONSHIP_TYPES.map((type) => [type.id, type.label]),
    [
      ['partner', '伴侣'],
      ['family', '家人'],
      ['parent_child', '亲子'],
      ['friend', '朋友'],
      ['collaboration', '合作'],
    ],
  );
});

test('HeJing filters workspaces by relationship type without fabricating fallback data', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.hejingWorkspacesForRelationshipType, 'function');
  const workspaces = [
    model.buildHeJingWorkspaceFromPerson(validPerson('p_partner', { relation: '伴侣' })),
    model.buildHeJingWorkspaceFromPerson(validPerson('p_family', { relation: '家人' })),
    model.buildHeJingWorkspaceFromPerson(validPerson('p_child', { relation: '亲子' })),
  ];

  assert.deepEqual(
    model.hejingWorkspacesForRelationshipType(workspaces, 'family').map((workspace) => workspace.id),
    ['person:p_family'],
  );
  assert.deepEqual(model.hejingWorkspacesForRelationshipType(workspaces, 'collaboration'), []);
});

test('HeJing projects generated relationship Reading into the workbench modules', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.buildGeneratedHeJingWorkspace, 'function');
  const person = validPerson('p_child_01', {
    display_name: 'Snow',
    relation: '儿子',
  });
  const scope = relationshipNatalMirrorScope({
    related_person_ref: { kind: 'person', id: person.id },
    anchor_year: 2026,
  });
  const output = validMingjingRelationshipOutput({
    relationship_subject: {
      primary_subject_ref: 'self',
      related_person_ref: scope.related_person_ref,
      anchor_year: scope.anchor_year,
      basis_time_zone: scope.basis_time_zone,
    },
    summary: '亲子合镜已经生成。',
    structure: {
      baseline_pattern: '亲子之间需要稳定节奏。',
      attraction_and_support: '支持来自日主与用神方向。',
      friction_and_misread: '误读常出现在催促与回应速度不同。',
      communication_rhythm: '短句确认比长篇说理更有效。',
      boundary_advice: '把陪伴和独立时间分开。',
    },
    timing_windows: [
      {
        start_date: '2026-03-01',
        end_date: '2026-04-15',
        nature: 'supportive',
        driver_refs: ['bazi:relationship.window.parent-child'],
        summary: '适合建立亲子沟通约定。',
      },
    ],
    practice: {
      communication: '先确认孩子当下的感受，再提出具体请求。',
      boundary: '保留孩子独立探索的空间。',
      repair: '冲突后回到具体事件，不给关系贴标签。',
    },
  });
  const inputsSummary = validInputsSummary({ mirrorKind: 'mingjing', scope });
  const reading = validReading({
    id: 'r_parent_child',
    mirror_kind: 'mingjing',
    mirror_scope: scope,
    output,
    inputs_summary: {
      ...inputsSummary,
      feature_snapshot: {
        ...inputsSummary.feature_snapshot,
        common: {
          ...inputsSummary.feature_snapshot.common,
          relationship_hepan: {
            related_person_ref: scope.related_person_ref,
            display_name_snapshot: person.display_name,
            branch_interactions: [
              {
                self_position: 'day',
                related_position: 'month',
                kind: '六合',
                driver_ref: 'bazi:relationship.branch.day-month.六合@zi-chou',
              },
            ],
            day_master_relation: {
              label: 'supporting',
              driver_ref: 'bazi:relationship.day_master.wood->fire',
            },
            ten_god_relation: {
              label: 'same',
              driver_ref: 'bazi:relationship.ten_god.same',
            },
            yong_shen_relation: {
              label: 'supporting',
              driver_ref: 'bazi:relationship.yong_shen.wood',
            },
            timing_windows: [
              {
                start_date: '2026-03-01',
                end_date: '2026-04-15',
                nature: 'supportive',
                driver_refs: ['bazi:relationship.window.parent-child'],
              },
            ],
          },
        },
      },
    },
  });

  const workspace = model.buildGeneratedHeJingWorkspace({
    workspace: model.buildHeJingWorkspaceFromPerson(person),
    reading,
  });

  assert.equal(workspace.selectedRelationshipType, 'parent_child');
  assert.equal(workspace.summary, '亲子合镜已经生成。');
  assert.equal(workspace.basis, '亲子之间需要稳定节奏。');
  assert.ok(workspace.metrics.every((metric) => metric.value > 0));
  assert.ok(workspace.structure.convergence.includes('支持来自日主与用神方向。'));
  assert.ok(workspace.insights.some((insight) => insight.body === output.practice.communication));
  assert.deepEqual(
    workspace.futureWindows.map((window) => window.body),
    ['适合建立亲子沟通约定。'],
  );
  assert.equal(workspace.weeklyAdvice, output.practice.communication);

  // The future-window timeline always presents a full Q1–Q4 year view. The one
  // evidenced window (starts 2026-03 → Q1) uses the real summary; the remaining
  // quarters fall back to general year-arc guidance rather than disappearing.
  assert.deepEqual(
    workspace.quarters.map((quarter) => quarter.label),
    ['Q1', 'Q2', 'Q3', 'Q4'],
  );
  assert.equal(workspace.quarters[0].action, '适合建立亲子沟通约定。');
  assert.ok(workspace.quarters[3].action.length > 0);
});

test('HeJing restores the latest generated relationship workspace on page open', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.initialHeJingWorkspaceIdFromReadings, 'function');
  const firstPerson = validPerson('p_first_01', { display_name: 'First' });
  const latestPerson = validPerson('p_latest_01', { display_name: 'Latest' });
  const firstScope = relationshipNatalMirrorScope({
    related_person_ref: { kind: 'person', id: firstPerson.id },
  });
  const latestScope = relationshipNatalMirrorScope({
    related_person_ref: { kind: 'person', id: latestPerson.id },
  });

  const selectedWorkspaceId = model.initialHeJingWorkspaceIdFromReadings({
    workspaces: [
      model.buildHeJingWorkspaceFromPerson(firstPerson),
      model.buildHeJingWorkspaceFromPerson(latestPerson),
    ],
    readings: [
      validReading({
        id: 'r_first_relationship',
        created_at: '2026-04-01T00:00:00Z',
        mirror_kind: 'mingjing',
        mirror_scope: firstScope,
      }),
      validReading({
        id: 'r_latest_relationship',
        created_at: '2026-06-01T00:00:00Z',
        mirror_kind: 'mingjing',
        mirror_scope: latestScope,
      }),
    ],
  });

  assert.equal(selectedWorkspaceId, 'person:p_latest_01');
});

test('HeJing new-flow opens the add-person dialog and selects the saved person', () => {
  assert.match(hejingTabSource, /AddPersonDialog/u);
  assert.match(hejingTabSource, /handleCreateHejing/u);
  assert.match(hejingTabSource, /setAddPersonOpen\(true\)/u);
  assert.match(hejingTabSource, /handleRelationshipPersonSaved/u);
  assert.match(hejingTabSource, /hejingWorkspaceIdForPerson\(person\.id\)/u);
});

test('HeJing keeps generated-only modules behind relationship output', () => {
  assert.match(hejingTabSource, /const hasGeneratedRelationship\s*=\s*Boolean\(relationshipOutput\)/u);
  assert.match(hejingTabSource, /hasGeneratedRelationship\s*&&\s*methodSupport\.supported/u);
  assert.match(hejingTabSource, /className="shijing-hejing__hero-actions"/u);
  assert.doesNotMatch(hejingTabSource, /methodSupport\.supported\s*\?\s*\(\s*<>\s*<AnalysisSection[\s\S]*className="shijing-hejing__metrics"/u);
});

test('HeJing shows an add prompt for relationship types without workspaces', () => {
  assert.match(hejingTabSource, /const filteredWorkspaces\s*=\s*useMemo/u);
  assert.match(hejingTabSource, /const hasSelectedTypeWorkspaces\s*=\s*filteredWorkspaces\.length\s*>\s*0/u);
  assert.match(hejingTabSource, /<HeJingRelationshipTypeEmpty/u);
  assert.match(hejingTabSource, /options=\{filteredWorkspaces\.map/u);
});

test('HeJing page restores cached generated readings and waits for persistence', () => {
  assert.match(hejingTabSource, /initialHeJingWorkspaceIdFromReadings/u);
  assert.match(hejingTabSource, /restoredGeneratedWorkspaceRef/u);
  assert.match(hejingTabSource, /await replace_snapshot\(outcome\.next_space\)/u);
  assert.doesNotMatch(hejingTabSource, /dispatch\(\{\s*type:\s*'snapshot\/replace'/u);
});

test('HeJing reports route support from the active method profile', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.hejingMethodSupportState, 'function');
  assert.deepEqual(model.hejingMethodSupportState('bazi_ziping_v1'), {
    supported: true,
    detail: null,
  });
  assert.deepEqual(model.hejingMethodSupportState('ziwei_sanhe_v1'), {
    supported: true,
    detail: null,
  });
  assert.deepEqual(model.hejingMethodSupportState('qizheng_siyu_guolao_v1'), {
    supported: true,
    detail: null,
  });
});
