// EN ShiJing product copy aggregator.

import type { ProductCopy } from './copy-types.ts';
import { EN_BASE_COPY } from './en/base.ts';
import { EN_MINGJING_COPY } from './en/mingjing.ts';
import { EN_RIJING_COPY } from './en/rijing.ts';
import { EN_SHIJING_COPY } from './en/shijing.ts';

export const EN_COPY: ProductCopy = {
  ...EN_BASE_COPY,
  rijing: EN_RIJING_COPY,
  shijing: EN_SHIJING_COPY,
  mingjing: EN_MINGJING_COPY,
};
