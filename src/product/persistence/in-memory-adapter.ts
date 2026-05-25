// Wave-2 — in-memory PersistenceClient used by tests and as the non-browser
// fallback. Every load / save still runs validateShiJingSpace.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type {
  ClearResult,
  LoadResult,
  PersistenceClient,
  SaveResult,
} from './persistence-client.ts';

export class InMemoryPersistenceAdapter implements PersistenceClient {
  readonly adapter_kind = 'in_memory' as const;
  private stored: ShiJingSpace | null;

  constructor(initial: ShiJingSpace | null = null) {
    this.stored = initial;
  }

  async load(): Promise<LoadResult> {
    if (this.stored === null) return { ok: true, snapshot: null };
    const validation = validateShiJingSpace(this.stored);
    if (!validation.ok) {
      return {
        ok: false,
        error: { kind: 'load_invalid_snapshot', adapter: 'in_memory', validation_error: validation.error },
      };
    }
    return { ok: true, snapshot: this.stored };
  }

  async save(snapshot: ShiJingSpace): Promise<SaveResult> {
    const validation = validateShiJingSpace(snapshot);
    if (!validation.ok) {
      return {
        ok: false,
        error: { kind: 'save_validation_failed', adapter: 'in_memory', validation_error: validation.error },
      };
    }
    this.stored = snapshot;
    return { ok: true };
  }

  async clear(): Promise<ClearResult> {
    this.stored = null;
    return { ok: true };
  }

  /** Test affordance: read raw stored snapshot bypass-free. */
  peek(): ShiJingSpace | null {
    return this.stored;
  }
}
