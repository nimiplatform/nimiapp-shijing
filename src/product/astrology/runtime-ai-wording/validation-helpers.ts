import { RuntimeAiWordingPatchValidationError } from './types.ts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function optionalText(record: Record<string, unknown>, key: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return undefined;
  const value = record[key];
  if (!nonEmptyString(value)) {
    throw new RuntimeAiWordingPatchValidationError(`${key}_empty`);
  }
  return value;
}

export function optionalStringArray(
  record: Record<string, unknown>,
  key: string,
): readonly string[] | undefined {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return undefined;
  const value = record[key];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.trim().length === 0)
  ) {
    throw new RuntimeAiWordingPatchValidationError(`${key}_invalid`);
  }
  return value;
}

export function optionalRecordArray(
  record: Record<string, unknown>,
  key: string,
): readonly Record<string, unknown>[] | undefined {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return undefined;
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    throw new RuntimeAiWordingPatchValidationError(`${key}_invalid`);
  }
  return value;
}

export function requireText(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (!nonEmptyString(value)) {
    throw new RuntimeAiWordingPatchValidationError(`${key}_empty`);
  }
  return value;
}

export function assertOnlyAllowedKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  detailPrefix: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key)) {
      throw new RuntimeAiWordingPatchValidationError(`${detailPrefix}:${key}`);
    }
  }
}
