import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { RiJingConcernProjection } from '../../../domain/mirror-output.ts';

export interface RiJingProjectionDisplayInput {
  readonly projection: RiJingConcernProjection;
  readonly tag?: ConcernTag;
}

export interface RiJingProjectionDisplay {
  readonly name: string;
  readonly collapsedSummary: string;
  readonly detailSummary: string;
  readonly recommendations: readonly string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripConcernDisplayHash(text: string): string {
  return text.replace(/#([^\s#@,，。！？!?:：；;、)）\]】]+)/gu, '$1');
}

export function concernLabelForDisplay(label: string): string {
  return stripConcernDisplayHash(label).trim();
}

function stripLeadingConcernLabel(text: string, label: string): string {
  const displayLabel = concernLabelForDisplay(label);
  if (!displayLabel) return text.trim();
  const labelPattern = escapeRegExp(displayLabel);
  return text
    .trim()
    .replace(new RegExp(`^${labelPattern}\\s*[:：,，\\-—–]\\s*`, 'u'), '')
    .trim();
}

function projectionTextForDisplay(text: string, label: string): string {
  return stripLeadingConcernLabel(stripConcernDisplayHash(text).replace(/\r\n/g, '\n'), label);
}

function firstSummarySentence(text: string): string {
  const firstLine = text
    .split(/\n+/u)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return '';
  const sentence = firstLine.match(/^.*?[。！？!?]/u)?.[0]?.trim();
  return sentence && sentence.length > 0 ? sentence : firstLine;
}

export function deriveRiJingProjectionDisplay(
  input: RiJingProjectionDisplayInput,
): RiJingProjectionDisplay {
  const rawName = input.tag?.label ?? input.projection.concern_tag_ref;
  const name = concernLabelForDisplay(rawName);
  const detailSummary = projectionTextForDisplay(input.projection.summary, rawName);
  return {
    name,
    collapsedSummary: firstSummarySentence(detailSummary),
    detailSummary,
    recommendations: input.projection.recommendations.map((item) => stripConcernDisplayHash(item)),
  };
}
