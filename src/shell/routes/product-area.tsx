import { useMemo } from 'react';
import { getPlatformClient } from '@nimiplatform/sdk';
import { useAppStore } from '../app-shell/app-store.js';
import { ShijingStoreProvider } from '../../product/state/shijing-store.tsx';
import { ShijingCatalogProvider } from '../../product/catalog/catalog-context.tsx';
import { ShijingShell } from '../../product/shell/shijing-shell.tsx';
import { IndexedDBPersistenceAdapter } from '../../product/persistence/indexeddb-adapter.ts';
import { InMemoryPersistenceAdapter } from '../../product/persistence/in-memory-adapter.ts';
import type { PersistenceClient } from '../../product/persistence/persistence-client.ts';
import { createSdkRuntimeAiAdapter, type SdkRuntimeTextCaller } from '../../product/astrology/runtime-ai-sdk-factory.ts';
import type { RuntimeAiClient, RuntimeTextGenerator } from '../../product/astrology/runtime-ai-client.ts';
import {
  createConversationChatBridge,
  type ConversationChatBridge,
} from '../../product/conversations/conversation-chat-bridge.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { NatalInputs, RawBirthInput } from '../../domain/person.ts';

function buildInitialRawBirthInput(): RawBirthInput {
  return {
    calendar_system: 'gregorian',
    local_date_text: '2000-01-01',
  };
}

function buildInitialNatalInputs(): NatalInputs {
  return {
    raw_birth_input: buildInitialRawBirthInput(),
    birth_datetime_utc: '2000-01-01T00:00:00Z',
    birth_precision: 'unknown',
    calendar_system: 'gregorian',
    birth_location: {
      latitude: 0,
      longitude: 0,
      iana_time_zone: 'Etc/UTC',
    },
    calculation_sex: 'unspecified',
  };
}

function buildEmptySnapshot(userId: string): ShiJingSpace {
  return {
    user_id: userId,
    self_subject: { natal_inputs: buildInitialNatalInputs() },
    persons: [],
    relations: [],
    events: [],
    views: [],
    readings: [],
    conversations: [],
    settings: {
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
      notification_preferences: { daily_today_card_enabled: false, daily_today_card_local_time: '08:00' },
    },
  };
}

function pickPersistenceClient(userId: string): PersistenceClient {
  if (IndexedDBPersistenceAdapter.isSupported()) {
    return new IndexedDBPersistenceAdapter({ user_id: userId });
  }
  return new InMemoryPersistenceAdapter();
}

const SHIJING_DEFAULT_AI_MODEL_ID = 'auto';

function buildSdkTextCaller(): SdkRuntimeTextCaller {
  // SJG-PROD-07 / SJG-ALGO-12: production wiring uses the SDK-backed Runtime
  // AI adapter. AuthProvider blocks the product surface until bootstrap is
  // ready and a session is authenticated, so getPlatformClient() is safe.
  const { runtime } = getPlatformClient();
  return {
    generateText: async (input) => {
      const output = await runtime.ai.text.generate({
        model: input.model,
        system: input.system,
        input: input.input.map((message) => ({ role: message.role, content: message.content })),
      });
      return {
        text: output.text,
        ...(output.trace?.traceId ? { trace: { traceId: output.trace.traceId } } : {}),
      };
    },
  };
}

function pickRuntimeAiClient(textCaller: SdkRuntimeTextCaller): RuntimeAiClient {
  return createSdkRuntimeAiAdapter({
    modelId: SHIJING_DEFAULT_AI_MODEL_ID,
    textCaller,
    adapterKind: 'shijing-runtime-text-v1',
  });
}

function pickConversationChatBridge(textCaller: SdkRuntimeTextCaller): ConversationChatBridge {
  const generator: RuntimeTextGenerator = async (request) => {
    const response = await textCaller.generateText({
      model: request.modelId,
      system: request.system,
      input: [{ role: 'user', content: request.user }],
    });
    return {
      text: response.text,
      ...(response.trace?.traceId !== undefined ? { traceId: response.trace.traceId } : {}),
    };
  };
  return createConversationChatBridge({ generator });
}

export function ProductArea() {
  const user = useAppStore((s) => s.auth.user);
  const userId = user?.id ?? '';

  const snapshot = useMemo(() => buildEmptySnapshot(userId), [userId]);
  const persistenceClient = useMemo(() => pickPersistenceClient(userId), [userId]);
  const textCaller = useMemo<SdkRuntimeTextCaller>(buildSdkTextCaller, []);
  const runtimeAiClient = useMemo(() => pickRuntimeAiClient(textCaller), [textCaller]);
  const conversationChatBridge = useMemo(
    () => pickConversationChatBridge(textCaller),
    [textCaller],
  );

  if (!userId) {
    return null;
  }

  return (
    <ShijingCatalogProvider>
      <ShijingStoreProvider
        snapshot={snapshot}
        persistenceClient={persistenceClient}
        runtimeAiClient={runtimeAiClient}
        conversationChatBridge={conversationChatBridge}
      >
        <ShijingShell />
      </ShijingStoreProvider>
    </ShijingCatalogProvider>
  );
}
