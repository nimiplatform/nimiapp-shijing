// SJG-DATA-10 — React Context wrapper around loadShijingCatalog. The
// catalog is product authority (shared, not per-user); the provider
// loads it once and exposes a hook for downstream surfaces (View form
// template selector).

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { ShiJingCatalog } from '../../domain/shijing-catalog.ts';
import { loadShijingCatalog } from './catalog-loader.ts';

const ShijingCatalogContext = createContext<ShiJingCatalog | null>(null);

export interface ShijingCatalogProviderProps {
  readonly catalog?: ShiJingCatalog;
  readonly children: ReactNode;
}

export function ShijingCatalogProvider(props: ShijingCatalogProviderProps) {
  const catalog = useMemo<ShiJingCatalog>(() => props.catalog ?? loadShijingCatalog(), [props.catalog]);
  return (
    <ShijingCatalogContext.Provider value={catalog}>
      {props.children}
    </ShijingCatalogContext.Provider>
  );
}

export function useShijingCatalog(): ShiJingCatalog {
  const value = useContext(ShijingCatalogContext);
  if (!value) {
    throw new Error('useShijingCatalog must be used inside <ShijingCatalogProvider>');
  }
  return value;
}
