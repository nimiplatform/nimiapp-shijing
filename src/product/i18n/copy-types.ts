// Shared type contract for ShiJing product copy.

import type { BaseProductCopy } from './schema/base.ts';
import type { HeJingCopy } from './schema/hejing.ts';
import type { MingJingCopy } from './schema/mingjing.ts';
import type { RiJingCopy } from './schema/rijing.ts';
import type { ShiJingConsultationCopy } from './schema/shijing.ts';
import type { YueJingCopy } from './schema/yuejing.ts';

export type { BaseProductCopy } from './schema/base.ts';
export type { HeJingCopy } from './schema/hejing.ts';
export type { MingJingCopy } from './schema/mingjing.ts';
export type { RiJingCopy } from './schema/rijing.ts';
export type { ShiJingConsultationCopy } from './schema/shijing.ts';
export type { YueJingCopy } from './schema/yuejing.ts';

export interface ProductCopy extends BaseProductCopy {
  readonly rijing: RiJingCopy;
  readonly yuejing: YueJingCopy;
  readonly hejing: HeJingCopy;
  readonly shijing: ShiJingConsultationCopy;
  readonly mingjing: MingJingCopy;
}
