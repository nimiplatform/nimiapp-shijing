// Wave-9 — View draft reducer + validate + id factory + dangling
// reference detector + structural assertions on the views UI tree.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

import {
  buildViewFromDraft,
  createEmptyViewDraft,
  validateViewDraft,
  viewDraftReducer,
} from '../src/product/views/view-form-state.ts';
import { newViewId } from '../src/product/views/view-id.ts';
import { buildSubjectRoster, findRosterEntry } from '../src/product/views/subject-roster.ts';
import { findReferencesToView } from '../src/product/views/view-dangling-reference.ts';
import {
  eventsForView,
  readingsForView,
  resolveViewTimeWindow,
  viewGenerationReadiness,
} from '../src/product/views/view-workspace-model.ts';
import { localDateInputToUtcIso } from '../src/product/views/view-time-window.ts';
import { newContextItemId } from '../src/product/views/context-item-id.ts';
import { validateView } from '../src/contracts/view-validator.ts';
import { validNatalInputs, validReading, validShiJingSpace } from './_fixtures.mjs';

function readyDraft() {
  let state = viewDraftReducer(createEmptyViewDraft(), { type: 'assign_id', id: 'v_01' });
  state = viewDraftReducer(state, { type: 'set_title', value: 'My View' });
  state = viewDraftReducer(state, { type: 'set_anchor_key', value: 'self' });
  state = viewDraftReducer(state, { type: 'set_memory_locked', value: false });
  return state;
}

function readyNatalInputs(overrides = {}) {
  return validNatalInputs({ calculation_sex: 'male', ...overrides });
}

function sampleView(overrides = {}) {
  return {
    id: 'v_01',
    title: 'Career View',
    anchor_subject: 'self',
    subjects: ['self'],
    time_scope: 'bounded',
    bounded_range: { start: '2026-05-25T00:00:00Z', end: '2026-06-25T00:00:00Z' },
    context_items: [],
    instructions: '',
    view_memory: { summary: '', updated_at: '2026-05-25T00:00:00Z', locked: false },
    display_state: 'normal',
    ...overrides,
  };
}

test('empty View draft has no anchor and unspecified memory_locked', () => {
  const draft = createEmptyViewDraft();
  assert.equal(draft.anchor_key, '');
  assert.equal(draft.memory_locked, null);
  assert.equal(draft.time_scope, 'open_ended');
});

test('setting anchor auto-includes anchor key in subjects', () => {
  let state = viewDraftReducer(createEmptyViewDraft(), { type: 'set_anchor_key', value: 'self' });
  assert.deepEqual(state.selected_subject_keys, ['self']);
});

test('toggle_subject on anchor is a no-op', () => {
  let state = viewDraftReducer(createEmptyViewDraft(), { type: 'set_anchor_key', value: 'self' });
  state = viewDraftReducer(state, { type: 'toggle_subject_key', value: 'self' });
  assert.deepEqual(state.selected_subject_keys, ['self']);
});

test('switching time_scope clears non-applicable branch fields', () => {
  let state = viewDraftReducer(createEmptyViewDraft(), { type: 'set_time_scope', value: 'bounded' });
  state = viewDraftReducer(state, { type: 'set_bounded_start_date', value: '2026-05-25' });
  state = viewDraftReducer(state, { type: 'set_bounded_end_date', value: '2026-05-26' });
  state = viewDraftReducer(state, { type: 'set_time_scope', value: 'rolling' });
  assert.equal(state.bounded_start_date, '');
  assert.equal(state.bounded_end_date, '');
  state = viewDraftReducer(state, { type: 'set_rolling_window_days_text', value: '30' });
  state = viewDraftReducer(state, { type: 'set_time_scope', value: 'open_ended' });
  assert.equal(state.rolling_window_days_text, '');
});

test('validateViewDraft rejects each missing field', () => {
  let state = createEmptyViewDraft();
  assert.equal(validateViewDraft(state).ok, false);
  state = viewDraftReducer(state, { type: 'assign_id', id: 'v_01' });
  assert.equal(validateViewDraft(state).error.code, 'view_title_empty');
  state = viewDraftReducer(state, { type: 'set_title', value: 'T' });
  assert.equal(validateViewDraft(state).error.code, 'view_anchor_missing');
  state = viewDraftReducer(state, { type: 'set_anchor_key', value: 'self' });
  assert.equal(validateViewDraft(state).error.code, 'view_memory_locked_unspecified');
  state = viewDraftReducer(state, { type: 'set_memory_locked', value: false });
  assert.equal(validateViewDraft(state).ok, true);
});

test('validateViewDraft requires bounded endpoints when time_scope=bounded', () => {
  let state = readyDraft();
  state = viewDraftReducer(state, { type: 'set_time_scope', value: 'bounded' });
  assert.equal(validateViewDraft(state).error.code, 'view_bounded_start_or_end_missing');
  state = viewDraftReducer(state, { type: 'set_bounded_start_date', value: '2026-05-25' });
  state = viewDraftReducer(state, { type: 'set_bounded_end_date', value: '2026-05-26' });
  assert.equal(validateViewDraft(state).ok, true);
});

test('validateViewDraft rejects invalid or non-ascending bounded natural dates', () => {
  let state = readyDraft();
  state = viewDraftReducer(state, { type: 'set_time_scope', value: 'bounded' });
  state = viewDraftReducer(state, { type: 'set_bounded_start_date', value: '2026-02-31' });
  state = viewDraftReducer(state, { type: 'set_bounded_end_date', value: '2026-03-01' });
  assert.equal(validateViewDraft(state).error.code, 'view_bounded_start_or_end_invalid');
  state = viewDraftReducer(state, { type: 'set_bounded_start_date', value: '2026-05-26' });
  state = viewDraftReducer(state, { type: 'set_bounded_end_date', value: '2026-05-25' });
  assert.equal(validateViewDraft(state).error.code, 'view_bounded_start_not_before_end');
});

test('validateViewDraft requires positive integer rolling_window_days when time_scope=rolling', () => {
  let state = readyDraft();
  state = viewDraftReducer(state, { type: 'set_time_scope', value: 'rolling' });
  state = viewDraftReducer(state, { type: 'set_rolling_window_days_text', value: '0' });
  assert.equal(validateViewDraft(state).error.code, 'view_rolling_window_days_not_positive_integer');
  state = viewDraftReducer(state, { type: 'set_rolling_window_days_text', value: '30' });
  assert.equal(validateViewDraft(state).ok, true);
});

test('buildViewFromDraft passes validateView for open_ended', () => {
  const draft = readyDraft();
  const view = buildViewFromDraft(draft, { anchor: 'self', subjects: ['self'], basis_time_zone: 'Asia/Shanghai' });
  assert.equal(validateView(view).ok, true);
  assert.equal(view.time_scope, 'open_ended');
  assert.equal(view.bounded_range, undefined);
  assert.equal(view.rolling_window_days, undefined);
});

test('resolveViewTimeWindow maps bounded View to view_time_scope without inventing values', () => {
  const view = sampleView();
  const space = validShiJingSpace({
    self_subject: { natal_inputs: readyNatalInputs() },
    views: [view],
  });
  const result = resolveViewTimeWindow(view, space, new Date('2026-05-25T08:00:00Z'));
  assert.equal(result.ok, true);
  assert.equal(result.time_window.start_utc, '2026-05-25T00:00:00Z');
  assert.equal(result.time_window.end_utc, '2026-06-25T00:00:00Z');
  assert.equal(result.time_window.basis_time_zone, 'Asia/Shanghai');
  assert.equal(result.time_window.source, 'view_time_scope');
});

test('resolveViewTimeWindow maps rolling View from local civil days', () => {
  const view = sampleView({
    time_scope: 'rolling',
    bounded_range: undefined,
    rolling_window_days: 14,
  });
  const space = validShiJingSpace({
    self_subject: { natal_inputs: readyNatalInputs() },
    views: [view],
  });
  const result = resolveViewTimeWindow(view, space, new Date('2026-05-25T08:00:00Z'));
  assert.equal(result.ok, true);
  assert.equal(result.time_window.start_utc, '2026-05-24T16:00:00.000Z');
  assert.equal(result.time_window.end_utc, '2026-06-07T16:00:00.000Z');
});

test('resolveViewTimeWindow maps open-ended period outlook to next 180 local civil days', () => {
  const view = sampleView({ time_scope: 'open_ended', bounded_range: undefined });
  const space = validShiJingSpace({
    self_subject: { natal_inputs: readyNatalInputs() },
    views: [view],
  });
  const result = resolveViewTimeWindow(view, space, new Date('2026-05-25T08:00:00Z'));
  assert.equal(result.ok, true);
  assert.equal(result.time_window.start_utc, '2026-05-24T16:00:00.000Z');
  assert.equal(result.time_window.end_utc, '2026-11-20T16:00:00.000Z');
});

test('resolveViewTimeWindow maps key_window to next 90 local days for open-ended View', () => {
  const view = sampleView({ time_scope: 'open_ended', bounded_range: undefined });
  const space = validShiJingSpace({
    self_subject: { natal_inputs: readyNatalInputs() },
    views: [view],
  });
  const result = resolveViewTimeWindow(view, space, new Date('2026-05-25T08:00:00Z'), 'key_window');
  assert.equal(result.ok, true);
  assert.equal(result.time_window.start_utc, '2026-05-24T16:00:00.000Z');
  assert.equal(result.time_window.end_utc, '2026-08-22T16:00:00.000Z');
});

test('resolveViewTimeWindow uses bounded range for key_window only when bounded range is shorter', () => {
  const shortView = sampleView({
    bounded_range: { start: '2026-05-24T16:00:00.000Z', end: '2026-06-03T16:00:00.000Z' },
  });
  const longView = sampleView({
    bounded_range: { start: '2026-05-24T16:00:00.000Z', end: '2026-12-01T16:00:00.000Z' },
  });
  const space = validShiJingSpace({
    self_subject: { natal_inputs: readyNatalInputs() },
    views: [shortView, longView],
  });
  const short = resolveViewTimeWindow(shortView, space, new Date('2026-05-25T08:00:00Z'), 'key_window');
  assert.equal(short.ok, true);
  assert.equal(short.time_window.start_utc, '2026-05-24T16:00:00.000Z');
  assert.equal(short.time_window.end_utc, '2026-06-03T16:00:00.000Z');
  const long = resolveViewTimeWindow(longView, space, new Date('2026-05-25T08:00:00Z'), 'key_window');
  assert.equal(long.ok, true);
  assert.equal(long.time_window.start_utc, '2026-05-24T16:00:00.000Z');
  assert.equal(long.time_window.end_utc, '2026-08-22T16:00:00.000Z');
});

test('viewGenerationReadiness blocks DaYun-required reading when calculation sex is unspecified', () => {
  const view = sampleView();
  const space = validShiJingSpace({
    self_subject: { natal_inputs: validNatalInputs({ calculation_sex: 'unspecified' }) },
    views: [view],
  });
  const readiness = viewGenerationReadiness(view, space, 'period_outlook', new Date('2026-05-25T08:00:00Z'));
  assert.equal(readiness.ok, false);
  assert.equal(readiness.reason, 'subject_readiness_failed');
  assert.equal(readiness.readiness.reason, 'calculation_sex_unspecified_for_dayun');
});

test('viewGenerationReadiness blocks DaYun-required reading when birth precision is only month', () => {
  const view = sampleView();
  const space = validShiJingSpace({
    self_subject: { natal_inputs: readyNatalInputs({ birth_precision: 'rough_month' }) },
    views: [view],
  });
  const readiness = viewGenerationReadiness(view, space, 'key_window', new Date('2026-05-25T08:00:00Z'));
  assert.equal(readiness.ok, false);
  assert.equal(readiness.reason, 'subject_readiness_failed');
  assert.equal(readiness.readiness.reason, 'birth_precision_rough_month_for_dayun');
});

test('eventsForView and readingsForView use persisted view refs only', () => {
  const viewReading = validReading({ id: 'r_view', scope: 'view', kind: 'period_outlook', view_id: 'v_01' });
  const otherViewReading = validReading({ id: 'r_other', scope: 'view', kind: 'period_outlook', view_id: 'v_02' });
  const subjectReading = validReading({ id: 'r_subject', scope: 'subject', kind: 'today' });
  const readings = readingsForView([subjectReading, otherViewReading, viewReading], 'v_01');
  assert.deepEqual(readings.map((reading) => reading.id), ['r_view']);

  const events = eventsForView([
    { id: 'e_01', primary_subject: 'self', participants: [], occurred_at: '2026-05-25T00:00:00Z', title: 'A', view_refs: ['v_01'] },
    { id: 'e_02', primary_subject: 'self', participants: [], occurred_at: '2026-05-26T00:00:00Z', title: 'B', view_refs: ['v_02'] },
  ], 'v_01');
  assert.deepEqual(events.map((event) => event.id), ['e_01']);
});

test('buildViewFromDraft passes validateView for bounded', () => {
  let draft = readyDraft();
  draft = viewDraftReducer(draft, { type: 'set_time_scope', value: 'bounded' });
  draft = viewDraftReducer(draft, { type: 'set_bounded_start_date', value: '2026-05-25' });
  draft = viewDraftReducer(draft, { type: 'set_bounded_end_date', value: '2026-05-26' });
  const view = buildViewFromDraft(draft, { anchor: 'self', subjects: ['self'], basis_time_zone: 'Asia/Shanghai' });
  assert.equal(validateView(view).ok, true);
  assert.equal(view.bounded_range?.start, '2026-05-24T16:00:00.000Z');
  assert.equal(view.bounded_range?.end, '2026-05-25T16:00:00.000Z');
});

test('buildViewFromDraft passes validateView for rolling', () => {
  let draft = readyDraft();
  draft = viewDraftReducer(draft, { type: 'set_time_scope', value: 'rolling' });
  draft = viewDraftReducer(draft, { type: 'set_rolling_window_days_text', value: '14' });
  const view = buildViewFromDraft(draft, { anchor: 'self', subjects: ['self'], basis_time_zone: 'Asia/Shanghai' });
  assert.equal(validateView(view).ok, true);
  assert.equal(view.rolling_window_days, 14);
});

test('buildViewFromDraft auto-includes anchor in subjects when caller forgot', () => {
  const draft = readyDraft();
  const view = buildViewFromDraft(draft, { anchor: 'self', subjects: [], basis_time_zone: 'Asia/Shanghai' });
  assert.deepEqual(view.subjects, ['self']);
});

test('buildViewFromDraft preserves existing context_items during edit replace', () => {
  const existing = sampleView({
    context_items: [{ id: 'ctx_01', kind: 'note', body: '已记录的上下文', created_at: '2026-05-25T00:00:00Z' }],
  });
  let draft = viewDraftReducer(createEmptyViewDraft(), {
    type: 'hydrate',
    view: existing,
    basis_time_zone: 'Asia/Shanghai',
  });
  draft = viewDraftReducer(draft, { type: 'set_title', value: 'Edited View' });
  const edited = buildViewFromDraft(draft, {
    anchor: 'self',
    subjects: ['self'],
    basis_time_zone: 'Asia/Shanghai',
    context_items: existing.context_items,
  });
  const nextViews = [existing].map((view) => (view.id === edited.id ? edited : view));
  assert.equal(nextViews[0].title, 'Edited View');
  assert.deepEqual(nextViews[0].context_items, existing.context_items);
});

test('local date input converts to persisted UTC ISO using the anchor timezone', () => {
  assert.equal(localDateInputToUtcIso('2026-05-25', 'Asia/Shanghai'), '2026-05-24T16:00:00.000Z');
});

test('newContextItemId returns ULID-shaped sortable ids', () => {
  const id = newContextItemId(new Date('2026-05-25T00:00:00Z'));
  assert.match(id, /^[0-9A-HJKMNP-TV-Z]{26}$/);
});

test('subject roster surfaces self + persons', () => {
  const space = validShiJingSpace({
    persons: [
      { id: 'p_01', display_name: 'A', kind: 'person', natal_inputs: validNatalInputs(), consent_state: 'owner_recorded' },
      { id: 'p_02', display_name: 'B', kind: 'person', natal_inputs: validNatalInputs(), consent_state: 'owner_recorded' },
    ],
  });
  const roster = buildSubjectRoster(space);
  assert.equal(roster.length, 3);
  assert.equal(roster[0].key, 'self');
  assert.equal(roster[1].key, 'person:p_01');
  assert.equal(findRosterEntry(roster, 'person:p_02')?.label.startsWith('B'), true);
});

test('view dangling reference detector finds event.view_refs', () => {
  const space = validShiJingSpace({
    views: [
      {
        id: 'v_X',
        title: 'X',
        anchor_subject: 'self',
        subjects: ['self'],
        time_scope: 'open_ended',
        context_items: [],
        instructions: '',
        view_memory: { summary: '', updated_at: '2026-05-25T00:00:00Z', locked: false },
        display_state: 'normal',
      },
    ],
    events: [
      {
        id: 'e_01',
        primary_subject: 'self',
        participants: [],
        occurred_at: '2026-05-25T00:00:00Z',
        title: 't',
        view_refs: ['v_X'],
      },
    ],
  });
  const refs = findReferencesToView(space, 'v_X');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].via, 'event:e_01:view_refs');
});

test('view dangling reference detector returns empty when no references', () => {
  const space = validShiJingSpace();
  const refs = findReferencesToView(space, 'v_missing');
  assert.equal(refs.length, 0);
});

test('newViewId returns unique non-empty strings', () => {
  const a = newViewId();
  const b = newViewId();
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
});

test('views UI source contains no fetch/HTTP/Tauri/Runtime/AI-provider call', () => {
  const dir = new URL('../src/product/views/', import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'));
  const forbidden = [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /\baxios\b/,
    /\bgrpc\b/,
    /WebSocket/,
    /\binvoke\s*\(/,
    /@tauri-apps/,
    /\bgpt-/i,
    /\bclaude-/i,
    /\bgemini-/i,
    /\bopenai\b/i,
    /\banthropic\b/i,
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} contains forbidden primitive ${pattern}`);
    }
  }
});

test('ViewEditor calls validateViewDraft + validateView + validateShiJingSpace before dispatch', () => {
  // Form moved out of the modal into the inline right-pane editor in
  // the 2026-05 redesign — view-editor-pane.tsx is the authoritative
  // save path.
  const source = readFileSync(new URL('../src/product/views/view-editor-pane.tsx', import.meta.url), 'utf8');
  const draftIdx = source.indexOf('validateViewDraft(draft)');
  const viewIdx = source.indexOf('validateView(view)');
  const spaceIdx = source.indexOf('validateShiJingSpace(nextSnapshot)');
  const dispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(draftIdx >= 0);
  assert.ok(viewIdx >= 0);
  assert.ok(spaceIdx >= 0);
  assert.ok(draftIdx < dispatchIdx);
  assert.ok(viewIdx < dispatchIdx);
  assert.ok(spaceIdx < dispatchIdx);
});

test('View delete flow checks dangling references AND validateShiJingSpace', () => {
  // Delete moved from ViewList into ViewWorkspace's kebab menu in the
  // 2026-05 redesign — list rows are now selection-only.
  const rawSource = readFileSync(new URL('../src/product/views/view-workspace.tsx', import.meta.url), 'utf8');
  // Normalize line endings: editors on Windows can rewrite this file
  // to CRLF, which would defeat the literal '\n  }\n' search below.
  const source = rawSource.replace(/\r\n/g, '\n');
  // Both validator checks must appear inside the onDeleteView handler
  // before snapshot replacement.
  const handlerStart = source.indexOf('function onDeleteView');
  assert.ok(handlerStart >= 0, 'expected onDeleteView handler');
  const handlerEnd = source.indexOf('\n  }\n', handlerStart);
  assert.ok(handlerEnd > handlerStart, 'expected onDeleteView handler body');
  const handlerBody = source.slice(handlerStart, handlerEnd);
  assert.match(handlerBody, /findReferencesToView/);
  assert.match(handlerBody, /validateShiJingSpace/);
  assert.match(handlerBody, /snapshot\/replace/);
});

test('ViewList does not mount the full editor inline in the left rail', () => {
  const source = readFileSync(new URL('../src/product/views/view-list.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /<ViewEditorPane\b/);
  assert.doesNotMatch(source, /ViewTemplatePickerOverlay/);
  assert.match(source, /onCreateView/);
  // Edit moved to ViewWorkspace's kebab menu — ViewList no longer takes onEditView.
  const workspaceSource = readFileSync(new URL('../src/product/views/view-workspace.tsx', import.meta.url), 'utf8');
  assert.match(workspaceSource, /onEditView/);
});

test('ViewsTab mounts a selected View workspace instead of only CRUD lists', () => {
  const source = readFileSync(new URL('../src/product/tabs/views.tsx', import.meta.url), 'utf8');
  assert.match(source, /ViewWorkspace/);
  // 2026-05 P1 simplification: no more picker modal; clicking 新建关注
  // flips the workspace straight into inline editor mode. Templates
  // live as chips inside ViewEditorPane.
  assert.doesNotMatch(source, /ViewTemplatePickerOverlay/);
  assert.match(source, /selectedViewId/);
  assert.match(source, /onSelectView/);
  assert.match(source, /onCreateView/);
  assert.match(source, /onEditView/);
});

test('ViewWorkspace generates real view-scoped readings and renders shared evidence', () => {
  const source = readFileSync(new URL('../src/product/views/view-workspace.tsx', import.meta.url), 'utf8');
  assert.match(source, /generateReadingForStorage/);
  assert.match(source, /scope: 'view'/);
  assert.match(source, /view,/);
  assert.match(source, /ReadingEvidenceCard/);
  assert.match(source, /viewGenerationReadiness/);
  assert.match(source, /readingsForView/);
  assert.match(source, /eventsForView/);
  assert.match(source, /newContextItemId/);
  assert.match(source, /kind: 'note'/);
  assert.match(source, /ConversationThreadOverlay/);
  assert.doesNotMatch(source, /next 30/i);
});

test('empty ViewWorkspace exposes the same create hook as the list CTA', () => {
  const source = readFileSync(new URL('../src/product/views/view-workspace.tsx', import.meta.url), 'utf8');
  assert.match(source, /readonly onCreateView\?: \(\) => void/);
  assert.match(source, /onClick=\{props\.onCreateView\}/);
  assert.match(source, /BUTTONS\.add_view/);
});

test('Templates are surfaced inside the inline editor as chips, not a separate modal', () => {
  // 2026-05 P1 simplification — the picker modal was retired entirely.
  // Templates now live as a chip row inside ViewEditorPane (create
  // mode only), and the legacy view-form.tsx file no longer exists.
  const editorSource = readFileSync(new URL('../src/product/views/view-editor-pane.tsx', import.meta.url), 'utf8');
  assert.match(editorSource, /shijing-view-editor__template-chips/);
  assert.match(editorSource, /apply_template/);
});

test('ViewEditor source exposes natural date fields instead of UTC technical fields', () => {
  const source = readFileSync(new URL('../src/product/views/view-editor-pane.tsx', import.meta.url), 'utf8');
  const copy = readFileSync(new URL('../src/product/i18n/copy.ts', import.meta.url), 'utf8');
  assert.match(source, /type="date"/);
  assert.match(source, /set_bounded_start_date/);
  assert.match(source, /set_bounded_end_date/);
  assert.doesNotMatch(`${source}\n${copy}`, /开始时间（UTC）|结束时间（UTC）|view-bounded-start-utc|view-bounded-end-utc/);
});
