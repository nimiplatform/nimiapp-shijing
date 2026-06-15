import type {
  NimiAICapabilityRequirementDeclaration,
  NimiAIScopeRef,
} from '@nimiplatform/sdk/ai';

export const SHIJING_TEXT_GENERATE_CAPABILITY_ID = 'text.generate';

export function createShijingModelRequirementDeclaration(
  scopeRef: NimiAIScopeRef,
): NimiAICapabilityRequirementDeclaration {
  return {
    requirementId: 'shijing.reading.text-generate',
    scopeRef,
    requiredSlices: [{
      requirementSliceId: 'shijing.reading.text-generate.required',
      capability: SHIJING_TEXT_GENERATE_CAPABILITY_ID,
      profileSliceRef: 'shijing.reading.text-generate',
      readinessPolicy: 'required',
    }],
    setupProjectionPolicy: 'sdk-ai-config-setup-projection',
  };
}
