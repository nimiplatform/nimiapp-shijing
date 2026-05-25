// Helper for tab bodies to read their canonical descriptor from
// SHIJING_IA_TABS instead of hardcoding labels in JSX.

import { SHIJING_IA_TABS, type ShijingTabDescriptor, type ShijingTabId } from '../../contracts/ia-contract.ts';

export function describeTab(id: ShijingTabId): ShijingTabDescriptor {
  const descriptor = SHIJING_IA_TABS.find((tab) => tab.id === id);
  if (!descriptor) {
    throw new Error(`Tab id has no SHIJING_IA_TABS descriptor: ${id}`);
  }
  return descriptor;
}
