// EN ShiJing product copy aggregator.

import type { ProductCopy } from './copy-types.ts';
import { EN_BASE_COPY } from './en/base.ts';
import { EN_DAILY_RIJING_COPY } from './en/daily-rijing.ts';
import { EN_HEJING_COPY } from './en/hejing.ts';
import { EN_MINGJING_COPY } from './en/mingjing.ts';
import { EN_RIJING_COPY } from './en/rijing.ts';
import { EN_SHIJING_COPY } from './en/shijing.ts';
import { EN_YUEJING_COPY } from './en/yuejing.ts';

import { EN_YUEJING_SURFACE_COPY } from './en/yuejing-surface.ts';
import { EN_NIANJING_SURFACE_COPY } from './en/nianjing-surface.ts';
import { EN_HEJING_SURFACE_COPY } from './en/hejing-surface.ts';
import { EN_ZIWEI_SURFACE_COPY } from './en/ziwei-surface.ts';

import { EN_YUEJING_LANGUAGE_COPY } from './en/yuejing-language.ts';

export const EN_COPY: ProductCopy = {
  ...EN_BASE_COPY,
  rijing: EN_RIJING_COPY,
  dailyRiJing: EN_DAILY_RIJING_COPY,
  yuejing: EN_YUEJING_COPY,
  hejing: EN_HEJING_COPY,
  shijing: EN_SHIJING_COPY,
  yuejingLanguage: EN_YUEJING_LANGUAGE_COPY,
  yuejingSurface: EN_YUEJING_SURFACE_COPY,
  nianjingSurface: EN_NIANJING_SURFACE_COPY,
  hejingSurface: EN_HEJING_SURFACE_COPY,
  ziweiSurface: EN_ZIWEI_SURFACE_COPY,
  mingjing: EN_MINGJING_COPY,
};
