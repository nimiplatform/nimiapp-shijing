import { createDesktopNimiAppSession } from '@nimiplatform/kit/auth/app/desktop';
import { installNimiShellRuntimeBridge, openDesktopIntent } from '@nimiplatform/kit/shell/renderer/bridge';
import { mountShijing } from './shell/mount-shijing.js';
installNimiShellRuntimeBridge();
const dispose = mountShijing(createDesktopNimiAppSession(), { kind: 'desktop', async openConfiguration() {
  const result = await openDesktopIntent({ intent: { kind: 'open-apps', appId: 'nimi.shijing', section: 'ai-models' } });
  if (result.status === 'rejected') throw Object.assign(new Error(result.reasonCode), { reasonCode: result.reasonCode, actionHint: result.actionHint });
} });
if (import.meta.hot) import.meta.hot.dispose(dispose);
