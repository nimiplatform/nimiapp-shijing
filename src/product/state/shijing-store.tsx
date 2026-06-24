// W04 — React Context wrapper around the pure reducer in
// `shijing-state.ts`. Persistence loads on mount and a debounced save
// fires on every snapshot/replace. Runtime AI wiring is W03; conversation
// chat bridge wiring is W06d.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import {
  createInitialState,
  shijingReducer,
  type ShijingAction,
  type ShijingViewState,
} from './shijing-state.ts';
import type { PersistenceClient } from '../persistence/persistence-client.ts';
import {
  createDebouncedSaver,
  loadInitialSnapshot,
  saveSnapshotNow,
  type DebouncedSaver,
  type PersistenceLifecycleStatus,
} from './persistence-bridge.ts';
import {
  createUnavailableRuntimeAiClient,
  type RuntimeAiClient,
} from '../astrology/runtime-ai-client.ts';
import {
  createUnavailableConversationChatBridge,
  type ConversationChatBridge,
} from '../conversations/conversation-chat-bridge.ts';

interface ShijingStoreValue {
  readonly state: ShijingViewState;
  readonly dispatch: Dispatch<ShijingAction>;
  readonly replace_snapshot: (snapshot: ShiJingSpace) => Promise<PersistenceLifecycleStatus>;
  readonly persistence_status: PersistenceLifecycleStatus;
  readonly persistence_client: PersistenceClient | null;
  readonly runtime_ai_client: RuntimeAiClient;
  readonly conversation_chat_bridge: ConversationChatBridge;
}

const ShijingStoreContext = createContext<ShijingStoreValue | null>(null);

interface ShijingStoreProviderProps {
  readonly snapshot: ShiJingSpace;
  readonly persistenceClient?: PersistenceClient | null;
  readonly persistenceDebounceMs?: number;
  readonly runtimeAiClient?: RuntimeAiClient;
  readonly conversationChatBridge?: ConversationChatBridge;
  readonly children: ReactNode;
}

export function ShijingStoreProvider(props: ShijingStoreProviderProps) {
  const [state, rawDispatch] = useReducer(
    shijingReducer,
    createInitialState(props.snapshot),
  );
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceLifecycleStatus>(() =>
    props.persistenceClient
      ? { kind: 'loading', adapter: props.persistenceClient.adapter_kind }
      : { kind: 'idle' },
  );
  const saverRef = useRef<DebouncedSaver | null>(null);
  const lastSavedRef = useRef<ShiJingSpace | null>(null);

  useEffect(() => {
    if (!props.persistenceClient) {
      saverRef.current = null;
      lastSavedRef.current = null;
      return;
    }
    const client = props.persistenceClient;
    setPersistenceStatus({ kind: 'loading', adapter: client.adapter_kind });
    lastSavedRef.current = null;
    let cancelled = false;
    saverRef.current = createDebouncedSaver(client, {
      delay_ms: props.persistenceDebounceMs ?? 300,
      on_status: setPersistenceStatus,
    });
    void loadInitialSnapshot(client).then((outcome) => {
      if (cancelled) return;
      if (outcome.status.kind === 'loaded' && outcome.snapshot) {
        rawDispatch({
          type: 'snapshot/replace',
          snapshot: outcome.snapshot,
          default_tab_policy: 'derive',
        });
        lastSavedRef.current = outcome.snapshot;
      } else if (outcome.status.kind === 'loaded') {
        lastSavedRef.current = props.snapshot;
      }
      setPersistenceStatus(outcome.status);
    });
    return () => {
      cancelled = true;
      const saver = saverRef.current;
      if (saver) saver.cancel();
      saverRef.current = null;
      lastSavedRef.current = null;
    };
  }, [props.persistenceClient, props.persistenceDebounceMs, props.snapshot]);

  const replaceSnapshot = useCallback(async (snapshot: ShiJingSpace): Promise<PersistenceLifecycleStatus> => {
    const client = props.persistenceClient;
    const saver = saverRef.current;
    if (!client) {
      rawDispatch({ type: 'snapshot/replace', snapshot });
      return { kind: 'idle' };
    }
    if (saver) {
      await saver.flush();
    }
    const status = await saveSnapshotNow(client, snapshot, setPersistenceStatus);
    if (status.kind !== 'saved') return status;
    lastSavedRef.current = snapshot;
    rawDispatch({ type: 'snapshot/replace', snapshot });
    return status;
  }, [props.persistenceClient]);

  const dispatch = useCallback<Dispatch<ShijingAction>>((action) => {
    if (action.type === 'snapshot/replace') {
      void replaceSnapshot(action.snapshot);
      return;
    }
    rawDispatch(action);
  }, [replaceSnapshot]);

  useEffect(() => {
    function flushPendingPersistence() {
      void saverRef.current?.flush();
    }
    window.addEventListener('pagehide', flushPendingPersistence);
    window.addEventListener('beforeunload', flushPendingPersistence);
    return () => {
      window.removeEventListener('pagehide', flushPendingPersistence);
      window.removeEventListener('beforeunload', flushPendingPersistence);
    };
  }, []);

  const runtimeAiClient = useMemo<RuntimeAiClient>(
    () => props.runtimeAiClient ?? createUnavailableRuntimeAiClient('ShiJing Runtime AI client is not configured.'),
    [props.runtimeAiClient],
  );

  const conversationChatBridge = useMemo<ConversationChatBridge>(
    () => props.conversationChatBridge ?? createUnavailableConversationChatBridge(),
    [props.conversationChatBridge],
  );

  const value = useMemo<ShijingStoreValue>(
    () => ({
      state,
      dispatch,
      replace_snapshot: replaceSnapshot,
      persistence_status: persistenceStatus,
      persistence_client: props.persistenceClient ?? null,
      runtime_ai_client: runtimeAiClient,
      conversation_chat_bridge: conversationChatBridge,
    }),
    [state, dispatch, replaceSnapshot, persistenceStatus, props.persistenceClient, runtimeAiClient, conversationChatBridge],
  );

  return <ShijingStoreContext.Provider value={value}>{props.children}</ShijingStoreContext.Provider>;
}

export function useShijingStore(): ShijingStoreValue {
  const value = useContext(ShijingStoreContext);
  if (!value) {
    throw new Error('useShijingStore must be used inside <ShijingStoreProvider>');
  }
  return value;
}
