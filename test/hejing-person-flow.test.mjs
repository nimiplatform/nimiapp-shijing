import { getProductCopy } from '../src/product/i18n/copy.ts';
const hejingCopy = getProductCopy('zh').hejingSurface;
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  relationshipNatalMirrorScope,
  validInputsSummary,
  validMingjingRelationshipOutput,
  validPerson,
  validReading,
  validShiJingSpace,
} from './_fixtures.mjs';

const hejingTabSource = readFileSync(
  new URL('../src/product/tabs/hejing-tab.tsx', import.meta.url),
  'utf8',
);
const hejingEmptyStateSource = readFileSync(
  new URL('../src/product/tabs/hejing/hejing-empty-state.tsx', import.meta.url),
  'utf8',
);

test('HeJing workspace id is stable for a related person', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.hejingWorkspaceIdForPerson, 'function');
  assert.equal(model.hejingWorkspaceIdForPerson('p_partner_01'), 'person:p_partner_01');
  assert.deepEqual(model.hejingPersonRefForWorkspaceId('person:p_partner_01'), {
    kind: 'person',
    id: 'p_partner_01',
  });
  assert.equal(model.hejingPersonRefForWorkspaceId('sample-snow-parent-child'), null);
});

test('HeJing builds a self-plus-person workspace from a newly added Person', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.buildHeJingWorkspaceFromPerson, 'function');
  const workspace = model.buildHeJingWorkspaceFromPerson(
    validPerson('p_partner_01', {
      display_name: '阿楠',
      relation: '朋友',
    }), hejingCopy,
  );

  assert.equal(workspace.id, 'person:p_partner_01');
  assert.equal(workspace.selectorLabel, '我 + 阿楠');
  assert.equal(workspace.selectedRelationshipType, 'friend');
  assert.deepEqual(workspace.personRef, { kind: 'person', id: 'p_partner_01' });
  assert.equal(workspace.displayName, '阿楠');
  assert.equal(workspace.relationLabel, '朋友');
  assert.equal(workspace.self.label, '我');
  assert.equal(workspace.other.label, 'TA');
  assert.equal(workspace.other.name, '阿楠');
  assert.equal(workspace.other.roleLabel, '朋友');
});

test('HeJing relationship type tabs follow the admitted display order', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.deepEqual(
    hejingCopy.relationshipTypes.map((type) => [type.id, type.label]),
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
    model.buildHeJingWorkspaceFromPerson(validPerson('p_partner', { relation: '伴侣' }), hejingCopy),
    model.buildHeJingWorkspaceFromPerson(validPerson('p_family', { relation: '家人' }), hejingCopy),
    model.buildHeJingWorkspaceFromPerson(validPerson('p_child', { relation: '亲子' }), hejingCopy),
  ];

  assert.deepEqual(
    model.hejingWorkspacesForRelationshipType(workspaces, 'family').map((workspace) => workspace.id),
    ['person:p_family'],
  );
  assert.deepEqual(model.hejingWorkspacesForRelationshipType(workspaces, 'collaboration'), []);
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
      model.buildHeJingWorkspaceFromPerson(firstPerson, hejingCopy),
      model.buildHeJingWorkspaceFromPerson(latestPerson, hejingCopy),
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

test('HeJing keeps generated-only sections behind the relationship output', () => {
  assert.match(hejingTabSource, /const hasGeneratedRelationship\s*=\s*Boolean\(relationshipOutput\)/u);
  assert.match(hejingTabSource, /hasGeneratedRelationship && relationshipOutput \?/u);
  assert.match(hejingTabSource, /<HeJingPendingView/u);
});

test('HeJing never falls back to sample workspaces in the real path', () => {
  assert.match(hejingTabSource, /state\.snapshot\.persons\.map\(\(person\) => buildHeJingWorkspaceFromPerson\(person, copy\)\)/u);
  assert.doesNotMatch(hejingTabSource, /HEJING_RELATIONSHIP_WORKSPACES/u);
  assert.doesNotMatch(hejingTabSource, /hejing-sample-space/u);
});

test('HeJing shows an add prompt for relationship types without workspaces', () => {
  assert.match(hejingTabSource, /const filteredWorkspaces\s*=\s*useMemo/u);
  assert.match(hejingTabSource, /const hasSelectedTypeWorkspaces\s*=\s*filteredWorkspaces\.length\s*>\s*0/u);
  assert.match(hejingTabSource, /<HeJingRelationshipTypeEmpty/u);
  assert.match(hejingTabSource, /onSelectExisting=\{handleCreateHejing\}/u);
  assert.match(hejingTabSource, /options=\{filteredWorkspaces\.map/u);
});

test('HeJing relationship-type empty state reuses the first-run empty page', () => {
  assert.match(hejingEmptyStateSource, /copyOverride/u);
  assert.match(hejingEmptyStateSource, /return \(\s*<HeJingEmptyState/u);
  assert.match(hejingEmptyStateSource, /title: copy\.emptyTypeTitle\(typeLabel\)/u);
  assert.match(hejingEmptyStateSource, /existingCta: copy\.addPersonDialogTitle/u);
  assert.doesNotMatch(hejingEmptyStateSource, /shijing-hejing__type-empty/u);
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

test('HeJing pattern gate admits only the BaZi method without switching methods', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.hejingPatternSupportState, 'function');
  assert.deepEqual(model.hejingPatternSupportState('bazi_ziping_v1'), { supported: true });
  assert.deepEqual(model.hejingPatternSupportState('ziwei_sanhe_v1'), {
    supported: false,
    method_profile_id: 'ziwei_sanhe_v1',
  });
  assert.deepEqual(model.hejingPatternSupportState('qizheng_siyu_guolao_v1'), {
    supported: false,
    method_profile_id: 'qizheng_siyu_guolao_v1',
  });
});

test('HeJing track records keep only records linked to the current person, newest first', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.hejingTrackRecords, 'function');
  const personRef = { kind: 'person', id: 'p_snow' };
  const space = validShiJingSpace({
    persons: [validPerson('p_snow'), validPerson('p_other')],
    event_memories: [
      {
        id: 'em_linked_old',
        occurred_at: '2026-03-01T00:00:00Z',
        body: 'Linked, older.',
        person_refs: [personRef],
        concern_tag_refs: [],
        source: 'manual',
        admissible_use: 'eligible_for_retrieval',
        created_at: '2026-03-01T01:00:00Z',
        updated_at: '2026-03-01T01:00:00Z',
      },
      {
        id: 'em_unlinked',
        occurred_at: '2026-05-01T00:00:00Z',
        body: 'Not linked to this person.',
        person_refs: [],
        concern_tag_refs: [],
        source: 'manual',
        admissible_use: 'eligible_for_retrieval',
        created_at: '2026-05-01T01:00:00Z',
        updated_at: '2026-05-01T01:00:00Z',
      },
      {
        id: 'em_other_person',
        occurred_at: '2026-06-01T00:00:00Z',
        body: 'Linked to another person.',
        person_refs: [{ kind: 'person', id: 'p_other' }],
        concern_tag_refs: [],
        source: 'manual',
        admissible_use: 'eligible_for_retrieval',
        created_at: '2026-06-01T01:00:00Z',
        updated_at: '2026-06-01T01:00:00Z',
      },
      {
        id: 'em_linked_new',
        occurred_at: '2026-07-01T00:00:00Z',
        body: 'Linked, newer.',
        person_refs: ['self', personRef],
        concern_tag_refs: [],
        source: 'manual',
        admissible_use: 'eligible_for_retrieval',
        created_at: '2026-07-01T01:00:00Z',
        updated_at: '2026-07-01T01:00:00Z',
      },
    ],
    plan_items: [
      {
        id: 'pi_linked',
        planned_for: '2026-08-01T00:00:00Z',
        body: 'Linked plan.',
        person_refs: [personRef],
        concern_tag_refs: [],
        source: 'manual',
        created_at: '2026-07-15T01:00:00Z',
        updated_at: '2026-07-15T01:00:00Z',
      },
      {
        id: 'pi_unlinked',
        planned_for: '2026-09-01T00:00:00Z',
        body: 'Unlinked plan.',
        person_refs: [],
        concern_tag_refs: [],
        source: 'manual',
        created_at: '2026-07-15T01:00:00Z',
        updated_at: '2026-07-15T01:00:00Z',
      },
    ],
  });

  const records = model.hejingTrackRecords(space, personRef);
  assert.deepEqual(
    records.map((record) => [record.kind, record.id, record.date]),
    [
      ['plan', 'pi_linked', '2026-08-01'],
      ['event', 'em_linked_new', '2026-07-01'],
      ['event', 'em_linked_old', '2026-03-01'],
    ],
  );
  assert.deepEqual(
    model.hejingTrackRecords(space, { kind: 'person', id: 'p_missing' }),
    [],
  );
});

test('HeJing record draft writes an EventMemory linked to the current person only', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');
  const { upsertEventMemory } = await import('../src/product/memories/memory-editor-state.ts');

  assert.equal(typeof model.buildHeJingEventMemoryDraft, 'function');
  const personRef = { kind: 'person', id: 'p_snow' };
  const draft = model.buildHeJingEventMemoryDraft({
    id: 'em_test_01',
    personRef,
    body: '一次真实的相处经历。',
    occurredDate: '2026-08-20',
    nowIso: '2026-08-20T12:00:00Z',
  });

  assert.deepEqual(draft.person_refs, [personRef]);
  assert.deepEqual(draft.concern_tag_refs, []);
  assert.equal(draft.source, 'manual');
  assert.equal(draft.admissible_use, 'eligible_for_retrieval');
  assert.equal(draft.occurred_at, '2026-08-20T00:00:00Z');
  assert.equal(draft.created_at, '2026-08-20T12:00:00Z');
  assert.equal(draft.updated_at, '2026-08-20T12:00:00Z');

  // The same payload the dialog builds passes the real upsert path and lands
  // in the space with its person link intact.
  const space = validShiJingSpace({ persons: [validPerson('p_snow')] });
  const outcome = upsertEventMemory(space, draft);
  assert.equal(outcome.ok, true);
  const stored = outcome.next_space.event_memories.find((memory) => memory.id === 'em_test_01');
  assert.deepEqual(stored.person_refs, [personRef]);

  // A draft pointing at a missing person is refused by the same gate.
  const rejected = upsertEventMemory(space, {
    ...draft,
    id: 'em_test_02',
    person_refs: [{ kind: 'person', id: 'p_missing' }],
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'memory_person_ref_unresolvable');
});

test('HeJing recent window label keeps annual precision', async () => {
  const model = await import('../src/product/tabs/hejing/hejing-model.ts');

  assert.equal(typeof model.hejingRecentWindowLabel, 'function');
  const label = model.hejingRecentWindowLabel({
    start_date: '2026-01-01',
    end_date: '2026-12-31',
  });
  assert.match(label, /2026 年度/u);
  assert.match(label, /2026-01-01 至 2026-12-31/u);
  assert.doesNotMatch(label, /月|季度|Q[1-4]/u);
});

test('HeJing consultation source resolution accepts a mingjing relationship reading', async () => {
  const { resolveShiJingSourceReadingIds } = await import('../src/product/tabs/shijing-source-readings.ts');

  const person = validPerson('p_consult', { display_name: 'Snow' });
  const scope = relationshipNatalMirrorScope({
    related_person_ref: { kind: 'person', id: person.id },
    anchor_year: 2026,
  });
  const reading = validReading({
    id: 'r_relationship_consult',
    mirror_kind: 'mingjing',
    mirror_scope: scope,
    output: validMingjingRelationshipOutput({
      relationship_subject: {
        primary_subject_ref: 'self',
        related_person_ref: scope.related_person_ref,
        anchor_year: scope.anchor_year,
        basis_time_zone: scope.basis_time_zone,
      },
    }),
    inputs_summary: validInputsSummary({ mirrorKind: 'mingjing', scope }),
  });

  const resolved = resolveShiJingSourceReadingIds({
    imported_reading_ids: [reading.id],
    readings: [reading],
    method_profile_id: 'bazi_ziping_v1',
    now: new Date('2026-09-12T00:00:00Z'),
  });
  assert.deepEqual(resolved, [reading.id]);
});

test('HeJing shows a dedicated pending view before the first generation', () => {
  const pendingSource = readFileSync(
    new URL('../src/product/tabs/hejing/hejing-pending.tsx', import.meta.url),
    'utf8',
  );

  assert.match(hejingTabSource, /<HeJingPendingView/u);
  assert.match(hejingTabSource, /hasGeneratedRelationship && relationshipOutput \?/u);
  assert.match(pendingSource, /shijing-hejing__pending/u);
  assert.match(pendingSource, /copy\.pendingPreviewCards/u);
  assert.match(pendingSource, /canGenerate/u);
  // The pending hero is honest about the not-yet-generated state: it never
  // renders placeholder relationship status or sample keywords as real content.
  assert.doesNotMatch(pendingSource, /relationshipStatus/u);
  assert.doesNotMatch(pendingSource, /workspace\.keywords/u);
});
