import { readFileSync } from 'node:fs';

export const sharedPrimitiveCssFiles = [
  '../src/product/tabs/shared/mirror-primitives.css',
];

export const rijingCssFiles = [
  '../src/product/tabs/rijing/rijing-shell.css',
  '../src/product/tabs/rijing/rijing-onboarding.css',
  '../src/product/tabs/rijing/rijing-hero.css',
  '../src/product/tabs/rijing/rijing-day-rite.css',
  '../src/product/tabs/rijing/rijing-projections.css',
  '../src/product/tabs/rijing/rijing-event-input.css',
  '../src/product/tabs/rijing/rijing-actions.css',
  '../src/product/tabs/rijing/rijing-evidence.css',
  '../src/product/tabs/rijing/rijing-responsive.css',
];

export const nianjingCssFiles = [
  '../src/product/tabs/nianjing/nianjing-shell.css',
  '../src/product/tabs/nianjing/nianjing-hero.css',
  '../src/product/tabs/nianjing/nianjing-filters.css',
  '../src/product/tabs/nianjing/nianjing-year-overview.css',
  '../src/product/tabs/nianjing/nianjing-year-detail.css',
  '../src/product/tabs/nianjing/nianjing-year-summary.css',
  '../src/product/tabs/nianjing/nianjing-phase-list.css',
  '../src/product/tabs/nianjing/nianjing-timeline-base.css',
  '../src/product/tabs/nianjing/nianjing-timeline.css',
  '../src/product/tabs/nianjing/nianjing-drawer.css',
  '../src/product/tabs/nianjing/nianjing-recorder.css',
];

export const mingjingCssFiles = [
  '../src/product/tabs/mingjing/mingjing-shell.css',
  '../src/product/tabs/mingjing/mingjing-hero.css',
  '../src/product/tabs/mingjing/mingjing-panels.css',
  '../src/product/tabs/mingjing/mingjing-paipan.css',
  '../src/product/tabs/mingjing/mingjing-geju.css',
  '../src/product/tabs/mingjing/mingjing-dayun.css',
  '../src/product/tabs/mingjing/mingjing-liunian.css',
  '../src/product/tabs/mingjing/mingjing-events.css',
  '../src/product/tabs/mingjing/mingjing-reading.css',
  '../src/product/tabs/mingjing/mingjing-ziwei.css',
  '../src/product/tabs/mingjing/mingjing-ziwei-reading.css',
  '../src/product/tabs/mingjing/mingjing-rectify.css',
  '../src/product/tabs/mingjing/mingjing-responsive.css',
];

export const hejingCssFiles = [
  '../src/product/tabs/hejing/hejing-shell.css',
  '../src/product/tabs/hejing/hejing-hero.css',
  '../src/product/tabs/hejing/hejing-index.css',
  '../src/product/tabs/hejing/hejing-intersection.css',
  '../src/product/tabs/hejing/hejing-future.css',
  '../src/product/tabs/hejing/hejing-history.css',
  '../src/product/tabs/hejing/hejing-responsive.css',
];

export const shijingAskCssFiles = [
  '../src/product/tabs/shijing/shijing-ask-shell.css',
  '../src/product/tabs/shijing/shijing-ask-hero.css',
  '../src/product/tabs/shijing/shijing-ask-rail.css',
  '../src/product/tabs/shijing/shijing-ask-composer.css',
  '../src/product/tabs/shijing/shijing-ask-context.css',
  '../src/product/tabs/shijing/shijing-ask-recall.css',
  '../src/product/tabs/shijing/shijing-ask-thread.css',
  '../src/product/tabs/shijing/shijing-concern-bar.css',
];

export const settingsCssFiles = [
  '../src/product/settings/settings-shell.css',
  '../src/product/settings/settings-primitives.css',
  '../src/product/settings/settings-forms.css',
  '../src/product/settings/settings-checks.css',
  '../src/product/settings/method-profile.css',
  '../src/product/self/self-editor.css',
  '../src/product/persons/person-editor.css',
  '../src/product/memories/memory-editor.css',
  '../src/product/concern-tags/concern-tag-controls.css',
  '../src/product/natal/natal-fields.css',
  '../src/product/settings/settings-drawer.css',
  '../src/product/settings/settings-responsive.css',
  '../src/product/onboarding/shijing-onboarding-settings.css',
];

export function readCssBundle(files) {
  return files
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n\n');
}
