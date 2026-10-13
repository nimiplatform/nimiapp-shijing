import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createShijingNavigation, type ShijingDestination } from './destinations.ts';
import { NimiNavigationProvider, useNimiNavigationSnapshot } from '@nimiplatform/kit/ui/app-chrome';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { defaultPrimaryTabForSpace } from '../onboarding/startup-intake.ts';

type Owner = {
  navigation: ReturnType<typeof createShijingNavigation>;
  open(destination: ShijingDestination): void;
  initialize(space: ShiJingSpace): void;
  reset(): void;
  rijingPageRequest: { readonly entryKey: string; readonly generation: number } | null;
  consumeRijingPageRequest(request: NonNullable<Owner['rijingPageRequest']>): boolean;
  sidebarVisible: boolean;
  setSidebarVisible(value: boolean): void;
  railAvailable: boolean;
  setRailAvailable(value: boolean): void;
};
const Context = createContext<Owner | null>(null);
export function useShijingNavigation() { const value = useContext(Context); if (!value) throw new Error('ShiJing navigation owner missing.'); return value; }
export function useShijingDestination() { return useNimiNavigationSnapshot<ShijingDestination>().current.destination; }
export function ShijingNavigationProvider({ children }: { children: ReactNode }) {
  const [navigation] = useState(createShijingNavigation);
  const [sidebarVisible, setSidebarVisible] = useState(true), [railAvailable, setRailAvailable] = useState(false);
  const initialResolved = useRef(false), lifetime = useRef(0);
  const [rijingPageRequest, setRijingPageRequest] = useState<Owner['rijingPageRequest']>(null);
  const currentRequest = useRef<Owner['rijingPageRequest']>(null), navigationEpoch = useRef(0);
  const clearRequest = useCallback(() => { currentRequest.current = null; setRijingPageRequest(null); }, []);
  useEffect(() => navigation.subscribe(() => { navigationEpoch.current += 1; clearRequest(); }), [navigation, clearRequest]);
  const requestPageGeneration = useCallback((transition: ReturnType<typeof navigation.push>) => {
    const entry = navigation.getSnapshot(), epoch = navigationEpoch.current;
    void transition.then(outcome => {
      const current = navigation.getSnapshot();
      if ((outcome.status !== 'committed' && outcome.status !== 'unchanged') || navigationEpoch.current !== epoch
        || current.generation !== entry.generation || current.current.key !== entry.current.key || current.current.destination.id !== 'rijing') return;
      const request = { entryKey: current.current.key, generation: current.generation };
      currentRequest.current = request; setRijingPageRequest(request);
    });
  }, [navigation]);
  const consumeRijingPageRequest = useCallback((request: NonNullable<Owner['rijingPageRequest']>) => {
    const current = navigation.getSnapshot();
    const matches = currentRequest.current === request && current.current.key === request.entryKey && current.generation === request.generation;
    clearRequest(); return matches;
  }, [navigation, clearRequest]);
  const initialize = useCallback((space: ShiJingSpace) => {
    if (initialResolved.current) return;
    initialResolved.current = true;
    const id = defaultPrimaryTabForSpace(space);
    const transition = navigation.replace({ id });
    if (id === 'rijing') requestPageGeneration(transition);
  }, [navigation, requestPageGeneration]);
  const open = useCallback((destination: ShijingDestination) => {
    initialResolved.current = true;
    const transition = navigation.push(destination);
    if (destination.id === 'rijing') requestPageGeneration(transition);
  }, [navigation, requestPageGeneration]);
  const reset = useCallback(() => { initialResolved.current = false; setRailAvailable(false); clearRequest(); navigation.reset({ id: 'mingjing' }); }, [navigation, clearRequest]);
  useEffect(() => { const generation = ++lifetime.current; return () => { reset(); queueMicrotask(() => { if (generation === lifetime.current) navigation.dispose(); }); }; }, [navigation, reset]);
  return <Context.Provider value={{ navigation, open, initialize, reset, rijingPageRequest, consumeRijingPageRequest, sidebarVisible, setSidebarVisible, railAvailable, setRailAvailable }}><NimiNavigationProvider controller={navigation}>{children}</NimiNavigationProvider></Context.Provider>;
}
