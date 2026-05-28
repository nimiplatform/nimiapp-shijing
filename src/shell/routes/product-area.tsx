import { useMemo } from 'react';
import { getPlatformClient } from '@nimiplatform/sdk';
import { useAppStore } from '../app-shell/app-store.js';
import { ShijingStoreProvider } from '../../product/state/shijing-store.tsx';
import { ShijingCatalogProvider } from '../../product/catalog/catalog-context.tsx';
import { ShijingShell } from '../../product/shell/shijing-shell.tsx';
import { IndexedDBPersistenceAdapter } from '../../product/persistence/indexeddb-adapter.ts';
import { InMemoryPersistenceAdapter } from '../../product/persistence/in-memory-adapter.ts';
import { buildMockShiJingSpace } from '../../product/dev/mock-snapshot.ts';
import type { PersistenceClient } from '../../product/persistence/persistence-client.ts';
import { createSdkRuntimeAiAdapter, type SdkRuntimeTextCaller } from '../../product/astrology/runtime-ai-sdk-factory.ts';
import { MockRuntimeAiClient } from '../../product/astrology/mock-runtime-ai-client.ts';
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
    local_date_text: '',
  };
}

function buildInitialNatalInputs(): NatalInputs {
  return {
    raw_birth_input: buildInitialRawBirthInput(),
    birth_datetime_utc: '',
    birth_precision: 'unknown',
    calendar_system: 'gregorian',
    birth_location: {
      latitude: Number.NaN,
      longitude: Number.NaN,
      iana_time_zone: '',
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

// DEV preview only: keep local renderer iteration usable without a live
// runtime bridge while preserving the SDK-backed adapter in production.
const USE_MOCK_RUNTIME_AI = import.meta.env?.DEV === true;

function pickRuntimeAiClient(textCaller: SdkRuntimeTextCaller): RuntimeAiClient {
  if (USE_MOCK_RUNTIME_AI) {
    return new MockRuntimeAiClient();
  }
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

  // DEV-only: seed a mocked ShiJingSpace so the 关注 / 今日 surfaces
  // render with varied state during `pnpm run dev:renderer`. Production
  // builds (`pnpm run build`) keep the empty snapshot — `import.meta.env.DEV`
  // is statically `false` after Vite tree-shakes the production bundle.
  // Persistence still wins on subsequent loads, so once the user starts
  // editing, their real data takes over. To re-seed mocks, clear the site's
  // IndexedDB ("ShijingSpace" DB) from devtools → Application.
  const snapshot = useMemo(
    () => (import.meta.env?.DEV === true ? buildMockShiJingSpace(userId) : buildEmptySnapshot(userId)),
    [userId],
  );
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
