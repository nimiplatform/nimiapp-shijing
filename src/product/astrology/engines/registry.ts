// SJG-ALGO-01 — method engine registry. Maps an admitted MethodProfileId to its
// MethodEngine. Unadmitted ids resolve to a typed absence, never a silent
// fallback.

import type { MethodProfileId } from '../../../domain/algorithm.ts';
import { BAZI_ZIPING_V1, QIZHENG_SIYU_GUOLAO_V1, ZIWEI_SANHE_V1 } from '../../../domain/algorithm.ts';
import type { MethodEngine } from '../method-engine.ts';
import { baziEngine } from './bazi/bazi-engine.ts';
import { qizhengSiyuEngine } from './qizheng-siyu/qizheng-siyu-engine.ts';
import { ziweiEngine } from './ziwei/ziwei-engine.ts';

const ENGINES: Partial<Record<MethodProfileId, MethodEngine>> = {
  [BAZI_ZIPING_V1]: baziEngine as unknown as MethodEngine,
  [ZIWEI_SANHE_V1]: ziweiEngine as unknown as MethodEngine,
  [QIZHENG_SIYU_GUOLAO_V1]: qizhengSiyuEngine as unknown as MethodEngine,
};

export function getMethodEngine(id: MethodProfileId): MethodEngine | null {
  return ENGINES[id] ?? null;
}

// Current ephemeris provenance for an admitted profile, or null if unadmitted.
// Used to flag stale persisted readings (ephemeris_missing).
export function currentEphemerisVersion(id: MethodProfileId): string | null {
  return ENGINES[id]?.profile.ephemeris_version ?? null;
}
