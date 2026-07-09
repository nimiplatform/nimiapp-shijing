import {
  ensureShijingRuntimeClientReady,
  logoutShijingRuntimeAccount,
  type ShijingAuthUser,
} from '../../infra/shijing-bootstrap.js';
import {
  getShijingRuntimeSession,
  loadShijingRuntimeAccountUser,
} from '../../infra/shijing-runtime-session.ts';

export async function loadCurrentUser(): Promise<ShijingAuthUser | null> {
  await ensureShijingRuntimeClientReady();
  const session = getShijingRuntimeSession();
  return loadShijingRuntimeAccountUser(session.accountRuntime, session.accountCaller);
}

export async function clearShijingInstalledAppAccountSession(): Promise<void> {
  await logoutShijingRuntimeAccount();
}
