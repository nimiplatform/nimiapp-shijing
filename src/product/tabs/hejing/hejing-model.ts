// HeJing (合镜) workbench model — pattern-reading redesign.
//
// The page consumes the admitted `MingJingRelationshipMirrorOutput` projection
// (overview / patterns / recent_status / action) directly; this module only
// owns the person workspace selection, the method pattern-support gate, the
// secondary 轨迹 record projection, and the record-draft builder. No scores,
// no quarters, no synthesized fallback workspaces: sample data lives only in
// `src/product/dev/`.

import type { MethodProfileId } from '../../../domain/algorithm.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import type {
  MingJingRelationshipMirrorOutput,
  RelationshipRecentWindow,
} from '../../../domain/mirror-output.ts';
import type { Person } from '../../../domain/person.ts';
import type { Reading } from '../../../domain/reading.ts';
import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import type { SubjectRef } from '../../../domain/subject-ref.ts';
import {
  mingJingRouteFailCloseDetail,
  validateMingJingRouteSupport,
} from '../../astrology/mingjing-route-support.ts';
import {
  HEJING_PAGE_COPY,
  HEJING_RELATIONSHIP_TYPES,
  hejingRelationshipTypeLabel,
} from './hejing-content.ts';

export { HEJING_PAGE_COPY, HEJING_RELATIONSHIP_TYPES, hejingRelationshipTypeLabel };

export type HeJingRelationshipType = 'partner' | 'collaboration' | 'family' | 'friend' | 'parent_child';

export interface HeJingRelationshipTypeOption {
  readonly id: HeJingRelationshipType;
  readonly label: string;
}

export type HeJingPersonRef = Extract<SubjectRef, { kind: 'person' }>;

// Minimal two-person profile used by the pending hero's two-orb stage.
export interface HeJingPersonProfile {
  readonly label: string;
  readonly name: string;
  readonly roleLabel: string;
  readonly initials: string;
  readonly tone: 'self' | 'other';
}

export interface HeJingWorkspace {
  readonly id: string;
  readonly selectorLabel: string;
  readonly selectedRelationshipType: HeJingRelationshipType;
  readonly relationshipTypeLabel: string;
  readonly personRef: HeJingPersonRef;
  readonly displayName: string;
  // person.relation — presentation-only context label; never drives the
  // astrology input or any trait inference.
  readonly relationLabel: string;
  readonly headline: string;
  readonly self: HeJingPersonProfile;
  readonly other: HeJingPersonProfile;
  readonly disclaimer: string;
}

export interface HeJingMethodSupportState {
  readonly supported: boolean;
  readonly detail: string | null;
}

export function hejingMethodSupportState(
  methodProfileId?: MethodProfileId,
): HeJingMethodSupportState {
  const support = validateMingJingRouteSupport({
    method_profile_id: methodProfileId,
    feature_id: 'relationship_hepan',
  });
  if (support.ok) return { supported: true, detail: null };
  return { supported: false, detail: mingJingRouteFailCloseDetail(support.error) };
}

// Pattern projection is admitted for bazi_ziping_v1 only (rule.shijing.algorithm.r019).
// Ziwei/QiZheng evidence routes stay open, but generation would end in the typed
// patterns_unavailable state — so the page shows the gate instead of the CTA and
// never auto-switches method.
export type HeJingPatternSupportState =
  | { readonly supported: true }
  | { readonly supported: false; readonly method_profile_id: MethodProfileId };

export function hejingPatternSupportState(
  methodProfileId: MethodProfileId,
): HeJingPatternSupportState {
  if (methodProfileId === 'bazi_ziping_v1') return { supported: true };
  return { supported: false, method_profile_id: methodProfileId };
}

export function hejingWorkspaceIdForPerson(personId: string): string {
  return `person:${personId}`;
}

export function hejingPersonRefForWorkspaceId(workspaceId: string): HeJingPersonRef | null {
  if (!workspaceId.startsWith('person:')) return null;
  const id = workspaceId.slice('person:'.length);
  return id ? { kind: 'person', id } : null;
}

export function initialHeJingWorkspaceIdFromReadings(input: {
  readonly workspaces: readonly HeJingWorkspace[];
  readonly readings: readonly Reading[];
  readonly method_profile_id?: MethodProfileId;
}): string {
  const workspaceIds = new Set(input.workspaces.map((workspace) => workspace.id));
  const latestRelationshipReadings = input.readings
    .filter((reading) => {
      if (reading.mirror_kind !== 'mingjing') return false;
      if (reading.mirror_scope.kind !== 'relationship_natal') return false;
      if (!isRelationshipHePanOutput(reading.output)) return false;
      if (
        input.method_profile_id &&
        reading.inputs_summary.method_profile.id !== input.method_profile_id
      ) {
        return false;
      }
      const relatedPersonId = reading.mirror_scope.related_person_ref.id;
      if (reading.output.relationship_subject.related_person_ref.id !== relatedPersonId) {
        return false;
      }
      const firstRelatedRef = reading.related_person_refs[0];
      return (
        typeof firstRelatedRef === 'object' &&
        firstRelatedRef !== null &&
        firstRelatedRef.kind === 'person' &&
        firstRelatedRef.id === relatedPersonId
      );
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  for (const reading of latestRelationshipReadings) {
    if (reading.mirror_scope.kind !== 'relationship_natal') continue;
    const workspaceId = hejingWorkspaceIdForPerson(reading.mirror_scope.related_person_ref.id);
    if (workspaceIds.has(workspaceId)) return workspaceId;
  }

  return input.workspaces[0]?.id ?? '';
}

export function hejingRelationshipTypeForPerson(person: Person): HeJingRelationshipType {
  const relation = (person.relation ?? '').trim();
  if (/子|女|儿|父|母|亲子|孩子|child|parent/i.test(relation)) return 'parent_child';
  if (/家|亲|兄|弟|姐|妹|family/i.test(relation)) return 'family';
  if (/友|朋友|同学|friend/i.test(relation)) return 'friend';
  if (/合作|同事|伙伴|合伙|partner|collab|work/i.test(relation)) return 'collaboration';
  return 'partner';
}

export function hejingWorkspacesForRelationshipType(
  workspaces: readonly HeJingWorkspace[],
  relationshipType: HeJingRelationshipType,
): readonly HeJingWorkspace[] {
  return workspaces.filter((workspace) => workspace.selectedRelationshipType === relationshipType);
}

export function buildHeJingWorkspaceFromPerson(person: Person): HeJingWorkspace {
  const name = person.display_name.trim() || 'TA';
  const relation = (person.relation ?? '').trim();
  const relationshipType = hejingRelationshipTypeForPerson(person);
  return {
    id: hejingWorkspaceIdForPerson(person.id),
    selectorLabel: `我 + ${name}`,
    selectedRelationshipType: relationshipType,
    relationshipTypeLabel: hejingRelationshipTypeLabel(relationshipType),
    personRef: { kind: 'person', id: person.id },
    displayName: name,
    relationLabel: relation,
    headline: `我与 ${name} 的合镜`,
    self: {
      label: '我',
      name: '我',
      roleLabel: '本人',
      initials: '我',
      tone: 'self',
    },
    other: {
      label: 'TA',
      name,
      roleLabel: relation || 'TA',
      initials: Array.from(name)[0] ?? 'T',
      tone: 'other',
    },
    disclaimer:
      '合镜只使用本人和一个关系人物的出生资料,提出待核对的相处观察假设;现实关系以你的真实记录为准。',
  };
}

function isRelationshipHePanOutput(
  output: Reading['output'],
): output is MingJingRelationshipMirrorOutput {
  return (
    output.mirror_kind === 'mingjing' &&
    (output as { output_kind?: unknown }).output_kind === 'relationship_hepan'
  );
}

// --- 轨迹 (secondary track view) --------------------------------------------

export interface HeJingTrackRecord {
  readonly kind: 'event' | 'plan';
  readonly id: string;
  readonly date: string; // ISO YYYY-MM-DD
  readonly body: string;
}

function personRefsInclude(
  refs: readonly SubjectRef[],
  personRef: HeJingPersonRef,
): boolean {
  return refs.some(
    (ref) => typeof ref === 'object' && ref !== null && ref.kind === 'person' && ref.id === personRef.id,
  );
}

// The current space's real EventMemory + PlanItem records linked to the
// current person through an explicit SubjectRef, newest first. Person owns
// nothing — these are the user's own records that reference the person.
export function hejingTrackRecords(
  snapshot: ShiJingSpace,
  personRef: HeJingPersonRef,
): readonly HeJingTrackRecord[] {
  const events: HeJingTrackRecord[] = snapshot.event_memories
    .filter((memory) => personRefsInclude(memory.person_refs, personRef))
    .map((memory) => ({
      kind: 'event',
      id: memory.id,
      date: memory.occurred_at.slice(0, 10),
      body: memory.body,
    }));
  const plans: HeJingTrackRecord[] = snapshot.plan_items
    .filter((plan) => personRefsInclude(plan.person_refs, personRef))
    .map((plan) => ({
      kind: 'plan',
      id: plan.id,
      date: plan.planned_for.slice(0, 10),
      body: plan.body,
    }));
  return [...events, ...plans].sort((a, b) => b.date.localeCompare(a.date));
}

// --- 记录 (record entry) ------------------------------------------------------

// Builds the EventMemory the HeJing record dialog saves: linked to the current
// person only, no concern tags, retrieval-eligible so 问镜 may cite it under
// the existing memory-use policy. ULID id + ISO-8601 UTC timestamps follow the
// existing creator conventions.
export function buildHeJingEventMemoryDraft(input: {
  readonly id: string;
  readonly personRef: HeJingPersonRef;
  readonly body: string;
  readonly occurredDate: string; // ISO YYYY-MM-DD
  readonly nowIso: string;
}): EventMemory {
  return {
    id: input.id,
    occurred_at: `${input.occurredDate}T00:00:00Z`,
    body: input.body,
    person_refs: [input.personRef],
    concern_tag_refs: [],
    source: 'manual',
    admissible_use: 'eligible_for_retrieval',
    created_at: input.nowIso,
    updated_at: input.nowIso,
  };
}

// --- 近期变化 (recent window) --------------------------------------------------

// Annual precision only: the deterministic layer admits {year}-01-01 .. {year}-12-31
// windows, so the label presents the year range and never months or quarters.
export function hejingRecentWindowLabel(
  window: Pick<RelationshipRecentWindow, 'start_date' | 'end_date'>,
): string {
  const year = window.start_date.slice(0, 4);
  return `${year} 年度(${window.start_date} 至 ${window.end_date})`;
}
