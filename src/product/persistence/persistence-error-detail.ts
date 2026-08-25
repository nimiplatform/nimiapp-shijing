import type { PersistenceError } from './persistence-client.ts';

export function describePersistenceError(error: PersistenceError): string {
  if ('cause' in error) return `${error.kind}: ${error.cause}`;
  if ('reason' in error) return `${error.kind}: ${error.reason}`;
  if ('validation_error' in error) return `${error.kind}: ${error.validation_error.code}`;
  if ('expected_user_id' in error) return `${error.kind}: snapshot belongs to another Nimi account`;
  const exhaustive = error as { readonly kind?: string };
  return exhaustive.kind ?? 'unknown';
}
