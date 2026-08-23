import type { NimiAIConfigSnapshot } from '@nimiplatform/sdk/ai';

export type ShijingAIConfigEvidence =
  | { readonly state: 'not-configured' }
  | { readonly state: 'ready'; readonly route: 'local' | 'cloud' }
  | {
      readonly state: 'missing' | 'blocked' | 'unavailable';
      readonly reasonCode: string;
    };

export function projectShijingAIConfig(
  snapshot: NimiAIConfigSnapshot,
): ShijingAIConfigEvidence {
  const intent = snapshot.config?.capabilities.find(
    (capability) => capability.capabilityContract === 'text.generate',
  );
  if (!intent) return { state: 'not-configured' };
  const selection = snapshot.effectiveSelections.find(
    (entry) => entry.capabilityContract === 'text.generate',
  );
  if (!selection || selection.state === 'unavailable') {
    return {
      state: 'unavailable',
      reasonCode: selection?.reasons[0] ?? 'ai-config-effective-unavailable',
    };
  }
  if (selection.state === 'missing' || selection.state === 'blocked') {
    return {
      state: selection.state,
      reasonCode: selection.reasons[0] ?? `ai-config-effective-${selection.state}`,
    };
  }
  if (intent.route.oneofKind === 'local') {
    return selection.resource?.oneofKind === 'local'
      && selection.resource.local.loadoutRef === intent.route.local.loadoutRef
      ? { state: 'ready', route: 'local' }
      : { state: 'unavailable', reasonCode: 'ai-config-effective-ref-mismatch' };
  }
  if (intent.route.oneofKind === 'cloud') {
    return selection.resource?.oneofKind === 'cloud'
      && selection.resource.cloud.connector.connectorRef === intent.route.cloud.connectorRef
      ? { state: 'ready', route: 'cloud' }
      : { state: 'unavailable', reasonCode: 'ai-config-effective-ref-mismatch' };
  }
  return { state: 'unavailable', reasonCode: 'ai-config-route-missing' };
}
