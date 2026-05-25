// SJG-ALGO-12 — deterministic prompt builder. Hands the runtime AI the
// AstrologyFeatureSnapshot summary + response_preferences + admitted
// context. Output schema reference is embedded so the AI returns
// AstrologyOutput-shaped JSON. NO provider/model literal here; the
// caller supplies the connector/model via the injected generator.

import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ResponsePreferences } from '../../domain/settings.ts';
import { subjectRefKey } from '../../domain/subject-ref.ts';
import type { RuntimeAiAdHocContext, RuntimeAiViewContext } from './runtime-ai-client.ts';

export interface RuntimeAiPromptParts {
  readonly system: string;
  readonly user: string;
}

const OUTPUT_SCHEMA_NOTE = [
  'Return ONLY a JSON object matching this shape:',
  '{',
  '  "summary": string (1-3 sentence reflection, non-empty),',
  '  "highlights": Array<{ label: string, body: string, subject_ref: SubjectRef }>,',
  '  "recommendations": Array<{ body: string, subject_ref: SubjectRef, horizon: "today"|"this_week"|"this_month"|"long_term" }>,',
  '  "citations": Array<{ method: string, reference: string }>,',
  '}',
  'SubjectRef is either the string "self" or { "kind": "person", "id": string }.',
  'Use a subject_ref that appears in the snapshot\'s subjects[]; never invent one.',
  'Do NOT include luck scores, monthly reports, yearly reports, trend charts, Huangli daily entries, or third-party consultant CTAs.',
].join('\n');

export function buildRuntimeAiPrompt(
  featureSnapshot: AstrologyFeatureSnapshot,
  responsePreferences: ResponsePreferences,
  viewContext?: RuntimeAiViewContext,
  adHocContext?: RuntimeAiAdHocContext,
): RuntimeAiPromptParts {
  const subjectKeys = featureSnapshot.subjects.map((s) => subjectRefKey(s.subject)).join(', ');
  const stageLabel = featureSnapshot.stage_label;
  const keyWindows = featureSnapshot.key_windows
    .map((w) => `${w.label}@${w.start_utc}-${w.end_utc}`)
    .join('; ');
  const uncertainty = featureSnapshot.uncertainty_inputs
    .map((u) => `${u.code}(${u.severity})`)
    .join(', ');

  const system = [
    'You are ShiJing astrology wording-layer. You do NOT compute astrology — you only word the deterministic snapshot.',
    `Wording tone: ${responsePreferences.tone}; length: ${responsePreferences.length}; language: ${responsePreferences.language}.`,
    OUTPUT_SCHEMA_NOTE,
  ].join('\n\n');

  const featurePayload = JSON.stringify(featureSnapshot);
  const userParts = [
    `subjects: ${subjectKeys}`,
    `stage_label: ${stageLabel}`,
    `key_windows: ${keyWindows || 'none'}`,
    `uncertainty_inputs: ${uncertainty || 'none'}`,
    viewContext
      ? `view_context: id=${viewContext.view_id}; anchor=${subjectRefKey(viewContext.anchor_subject)}; instructions=${viewContext.instructions}; memory_summary=${viewContext.memory_summary}`
      : 'view_context: none',
    adHocContext ? `ad_hoc_context: ${adHocContext.text}` : 'ad_hoc_context: none',
    `feature_snapshot_json: ${featurePayload}`,
    'Produce JSON only — no preface, no markdown.',
  ];

  return { system, user: userParts.join('\n') };
}
