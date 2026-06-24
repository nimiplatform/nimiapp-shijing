// Shared type contract for ShiJing product copy.

import type { BaseProductCopy } from './schema/base.ts';
import type { MingJingCopy } from './schema/mingjing.ts';
import type { RiJingCopy } from './schema/rijing.ts';
import type { ShiJingConsultationCopy } from './schema/shijing.ts';

export type { BaseProductCopy } from './schema/base.ts';
export type { MingJingCopy } from './schema/mingjing.ts';
export type { RiJingCopy } from './schema/rijing.ts';
export type { ShiJingConsultationCopy } from './schema/shijing.ts';

export interface ProductCopy extends BaseProductCopy {
  readonly rijing: RiJingCopy;
  readonly shijing: ShiJingConsultationCopy;
  readonly mingjing: MingJingCopy;
}
