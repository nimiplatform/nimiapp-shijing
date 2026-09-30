// ZH ShiJing product copy aggregator.

import type { ProductCopy } from './copy-types.ts';
import { ZH_BASE_COPY } from './zh/base.ts';
import { ZH_DAILY_RIJING_COPY } from './zh/daily-rijing.ts';
import { ZH_HEJING_COPY } from './zh/hejing.ts';
import { ZH_MINGJING_COPY } from './zh/mingjing.ts';
import { ZH_RIJING_COPY } from './zh/rijing.ts';
import { ZH_SHIJING_COPY } from './zh/shijing.ts';
import { ZH_YUEJING_COPY } from './zh/yuejing.ts';

import { ZH_YUEJING_SURFACE_COPY } from './zh/yuejing-surface.ts';
import { ZH_NIANJING_SURFACE_COPY } from './zh/nianjing-surface.ts';
import { ZH_HEJING_SURFACE_COPY } from './zh/hejing-surface.ts';
import { ZH_ZIWEI_SURFACE_COPY } from './zh/ziwei-surface.ts';

import { ZH_YUEJING_LANGUAGE_COPY } from './zh/yuejing-language.ts';

export const ZH_COPY: ProductCopy = {
  ...ZH_BASE_COPY,
  rijing: ZH_RIJING_COPY,
  dailyRiJing: ZH_DAILY_RIJING_COPY,
  yuejing: ZH_YUEJING_COPY,
  hejing: ZH_HEJING_COPY,
  shijing: ZH_SHIJING_COPY,
  yuejingLanguage: ZH_YUEJING_LANGUAGE_COPY,
  yuejingSurface: ZH_YUEJING_SURFACE_COPY,
  nianjingSurface: ZH_NIANJING_SURFACE_COPY,
  hejingSurface: ZH_HEJING_SURFACE_COPY,
  ziweiSurface: ZH_ZIWEI_SURFACE_COPY,
  mingjing: ZH_MINGJING_COPY,
};
