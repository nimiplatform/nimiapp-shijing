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
});

test('HeJing new-flow opens the add-person dialog and selects the saved person', () => {
  assert.match(hejingTabSource, /AddPersonDialog/u);
  assert.match(hejingTabSource, /handleCreateHejing/u);
  assert.match(hejingTabSource, /setAddPersonOpen\(true\)/u);
  assert.match(hejingTabSource, /handleRelationshipPersonSaved/u);
  assert.match(hejingTabSource, /hejingWorkspaceIdForPerson\(person\.id\)/u);
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
