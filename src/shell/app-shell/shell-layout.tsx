import type { ReactNode } from 'react';
import { AmbientBackground } from '@nimiplatform/kit/ui';

// The integrated top bar (brand + tabs + account) lives inside the
// product surface (ShijingShell). ShellLayout is the auth-aware frame
// that hosts the ambient background and any non-product chrome.

export function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <AmbientBackground variant="mesh" className="shijing-app">
      <main className="shijing-app__body shijing-app__body--integrated">{children}</main>
    </AmbientBackground>
  );
}
