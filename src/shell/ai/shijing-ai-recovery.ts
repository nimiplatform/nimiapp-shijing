import { openDesktopIntent } from '@nimiplatform/kit/shell/renderer/bridge';
import type { OpenRuntimeAiRecovery } from '../../domain/reading.ts';

// @nimi-authority: rule.shijing.ia.r005
export const openShijingRuntimeAiRecovery: OpenRuntimeAiRecovery = async (kind) => {
  const result = await openDesktopIntent({
    intent: {
      kind: 'open-apps',
      appId: 'nimi.shijing',
      ...(kind === 'runtime_access' ? {} : { section: 'ai-models' }),
    },
  });
  if (result.status === 'rejected') {
    throw new Error(`${result.reasonCode}: ${result.actionHint}`);
  }
};
