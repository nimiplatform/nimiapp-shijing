import { extractNimiErrorFields } from '@nimiplatform/sdk/types';
export type ShijingLocalAppErrorEvidence = { readonly code: string; readonly reasonCode: string; readonly actionHint: string; readonly message: string; readonly retryable: boolean };
export function normalizeShijingLocalAppError(error: unknown): ShijingLocalAppErrorEvidence {
  const fields = extractNimiErrorFields(error);
  const reasonCode = fields.reasonCode || fields.code || 'app-operation-failed';
  return { code: fields.code || reasonCode, reasonCode, actionHint: fields.actionHint || '', message: fields.message || reasonCode, retryable: fields.retryable ?? false };
}
