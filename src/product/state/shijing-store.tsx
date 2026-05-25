// React Context wrapper around the pure reducer in `shijing-state.ts`.
// Wave-2 adds optional persistence wiring: an in-memory or IndexedDB
// adapter loaded on mount, plus a debounced saver fired on every
// snapshot/replace dispatch. Persistence status (load/save lifecycle) is
// surfaced through the context so downstream renderers can react.

import {
  createContext,
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
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { createInitialState, shijingReducer, type ShijingAction, type ShijingViewState } from './shijing-state.ts';
import type { PersistenceClient } from '../persistence/persistence-client.ts';
import {
  createDebouncedSaver,
  loadInitialSnapshot,
  type DebouncedSaver,
  type PersistenceLifecycleStatus,
} from './persistence-bridge.ts';
import type { RuntimeAiClient } from '../astrology/runtime-ai-client.ts';
import { NoOpRuntimeAiClient } from '../astrology/runtime-ai-client.ts';
import {
  createUnavailableConversationChatBridge,
  type ConversationChatBridge,
} from '../conversations/conversation-chat-bridge.ts';

interface ShijingStoreValue {
  readonly state: ShijingViewState;
  readonly dispatch: Dispatch<ShijingAction>;
  readonly persistence_status: PersistenceLifecycleStatus;
  readonly runtime_ai_client: RuntimeAiClient;
  readonly conversation_chat_bridge: ConversationChatBridge;
}

const ShijingStoreContext = createContext<ShijingStoreValue | null>(null);

interface ShijingStoreProviderProps {
  readonly snapshot: ShiJingSpace;
  readonly initialObservationTarget?: SubjectRef;
  readonly persistenceClient?: PersistenceClient | null;
  readonly persistenceDebounceMs?: number;
  readonly runtimeAiClient?: RuntimeAiClient;
  readonly conversationChatBridge?: ConversationChatBridge;
  readonly children: ReactNode;
}

export function ShijingStoreProvider(props: ShijingStoreProviderProps) {
  const [state, dispatch] = useReducer(
    shijingReducer,
    createInitialState(props.snapshot, props.initialObservationTarget ?? 'self'),
  );
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceLifecycleStatus>({ kind: 'idle' });
  const saverRef = useRef<DebouncedSaver | null>(null);
  const lastSavedRef = useRef<ShiJingSpace | null>(null);

  useEffect(() => {
    if (!props.persistenceClient) {
      saverRef.current = null;
      return;
    }
    const client = props.persistenceClient;
    setPersistenceStatus({ kind: 'loading', adapter: client.adapter_kind });
    let cancelled = false;
    void loadInitialSnapshot(client).then((outcome) => {
      if (cancelled) return;
      if (outcome.snapshot) {
        dispatch({ type: 'snapshot/replace', snapshot: outcome.snapshot });
        lastSavedRef.current = outcome.snapshot;
      }
      setPersistenceStatus(outcome.status);
    });
    saverRef.current = createDebouncedSaver(client, {
      delay_ms: props.persistenceDebounceMs ?? 300,
      on_status: setPersistenceStatus,
    });
    return () => {
      cancelled = true;
      const saver = saverRef.current;
      if (saver) saver.cancel();
      saverRef.current = null;
    };
  }, [props.persistenceClient, props.persistenceDebounceMs]);

  useEffect(() => {
    const saver = saverRef.current;
    if (!saver) return;
    if (state.snapshot === lastSavedRef.current) return;
    if (state.snapshot_status.kind === 'invalid') return;
    lastSavedRef.current = state.snapshot;
    saver.enqueue(state.snapshot);
  }, [state.snapshot, state.snapshot_status]);

  const runtimeAiClient = useMemo<RuntimeAiClient>(
    () => props.runtimeAiClient ?? new NoOpRuntimeAiClient(),
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
      persistence_status: persistenceStatus,
      runtime_ai_client: runtimeAiClient,
      conversation_chat_bridge: conversationChatBridge,
    }),
    [state, persistenceStatus, runtimeAiClient, conversationChatBridge],
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
