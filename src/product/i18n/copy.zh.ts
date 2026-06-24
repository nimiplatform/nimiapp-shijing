// ZH ShiJing product copy aggregator.

import type { ProductCopy } from './copy-types.ts';
import { ZH_BASE_COPY } from './zh/base.ts';
import { ZH_MINGJING_COPY } from './zh/mingjing.ts';
import { ZH_RIJING_COPY } from './zh/rijing.ts';
import { ZH_SHIJING_COPY } from './zh/shijing.ts';

export const ZH_COPY: ProductCopy = {
  ...ZH_BASE_COPY,
  rijing: ZH_RIJING_COPY,
  shijing: ZH_SHIJING_COPY,
  mingjing: ZH_MINGJING_COPY,
};
