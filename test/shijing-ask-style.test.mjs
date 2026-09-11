import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readCssBundle, sharedPrimitiveCssFiles, shijingAskCssFiles } from './css-bundles.mjs';

const shijingStyles = stripCssComments(
  readCssBundle(shijingAskCssFiles),
);
const sharedSurfaceStyles = stripCssComments(
  readCssBundle(sharedPrimitiveCssFiles),
);
const shijingTabSource = [
  '../src/product/tabs/shijing-tab.tsx',
  '../src/product/tabs/shijing/shijing-icons.tsx',
  '../src/product/tabs/shijing/shijing-session-model.ts',
  '../src/product/tabs/shijing/shijing-composer.tsx',
  '../src/product/tabs/shijing/shijing-history-rail.tsx',
  '../src/product/tabs/shijing/shijing-context-widgets.tsx',
]
  .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
  .join('\n');

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function cssBlockFromSource(source, selector) {
  const blocks = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selectorList = match[1].split(',').map((item) => item.trim());
    if (selectorList.includes(selector)) {
      blocks.push(match[2]);
    }
  }
  return blocks.join('\n');
}

function cssBlock(source, selector) {
  const block = cssBlockFromSource(source, selector);
  assert.notEqual(block, '', `Missing CSS selector: ${selector}`);
  return block;
}

test('Ask ShiJing shell uses the same aurora background as NianJing', () => {
  const askShell = cssBlock(sharedSurfaceStyles, '.shijing-shell[data-active-tab="shijing"]');
  const nianjingShell = cssBlock(sharedSurfaceStyles, '.shijing-shell[data-active-tab="nianjing"]');
  const sharedRoot = cssBlock(sharedSurfaceStyles, ':root');

  assert.match(askShell, /background:\s*var\(--shijing-shared-aurora-bg\)/);
  assert.match(nianjingShell, /background:\s*var\(--shijing-shared-aurora-bg\)/);

  for (const token of [
    'radial-gradient(42% 36% at 6% 4%, rgba(167, 243, 208, 0.55), transparent 70%)',
    'radial-gradient(40% 38% at 94% 92%, rgba(252, 231, 243, 0.50), transparent 70%)',
    'linear-gradient(135deg, #e7f5ee 0%, #eef0f7 100%)',
  ]) {
    assert.ok(sharedRoot.includes(token), `shared aurora token missing ${token}`);
  }
});

test('Ask ShiJing topbar and main area match NianJing transparent chrome', () => {
  const askTopbar = cssBlock(sharedSurfaceStyles, '.shijing-shell[data-active-tab="shijing"] .shijing-topbar');
  const askMain = cssBlock(sharedSurfaceStyles, '.shijing-shell__main:has(> .shijing-ask)');
  const askLocalMain = cssBlock(shijingStyles, '.shijing-shell__main:has(> .shijing-ask)');

  assert.match(askTopbar, /background:\s*transparent/);
  assert.match(askTopbar, /backdrop-filter:\s*none/);
  assert.match(askTopbar, /-webkit-backdrop-filter:\s*none/);
  assert.match(askTopbar, /border-bottom-color:\s*var\(--shijing-surface-topbar-border\)/);
  assert.match(askMain, /background:\s*transparent/);
  assert.match(askLocalMain, /padding:\s*0/);
});

test('Ask ShiJing splits the page into a flush sidebar and a calm main column', () => {
  const root = cssBlock(shijingStyles, '.shijing-tab.shijing-ask');
  const shellMain = cssBlock(shijingStyles, '.shijing-shell__main:has(> .shijing-ask)');
  const layout = cssBlock(shijingStyles, '.shijing-ask__layout');
  const rail = cssBlock(shijingStyles, '.shijing-ask__rail');
  const main = cssBlock(shijingStyles, '.shijing-ask__main');
  const composer = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__composer[data-chat-composer="false"]');
  const contextBar = cssBlock(shijingStyles, '.shijing-ctx');

  assert.match(root, /--shijing-ask-glass-bg:\s*var\(--shijing-shared-glass-bg\)/);
  assert.match(root, /--shijing-ask-card-bg:/);
  assert.match(root, /--shijing-ask-card-border:/);
  assert.match(root, /--shijing-ask-card-blur:/);
  assert.match(root, /--shijing-ask-card-shadow:/);

  // The tab fills the whole shell main area — no centered max-width column.
  assert.match(root, /max-width:\s*none/);
  assert.match(shellMain, /padding:\s*0/);

  // The layout grid is transparent; columns touch each other (no gap).
  assert.doesNotMatch(layout, /background:\s*var\(--shijing-ask-glass-bg\)/);
  assert.doesNotMatch(layout, /box-shadow:/);
  assert.match(layout, /grid-template-columns:\s*280px 1fr/);
  assert.match(layout, /gap:\s*0/);

  // The rail is a flush full-height sidebar separated by ONE hairline — it
  // carries no card chrome of its own.
  assert.match(rail, /background:\s*rgba\(255, 255, 255, 0\.42\)/);
  assert.match(rail, /backdrop-filter:\s*blur\(18px\) saturate\(140%\)/);
  assert.match(rail, /border-right:\s*1px solid rgba\(15, 23, 42, 0\.07\)/);
  assert.doesNotMatch(rail, /border-radius/);
  assert.doesNotMatch(rail, /box-shadow/);
  assert.doesNotMatch(rail, /border:\s*1px solid var\(--shijing-ask-glass-border\)/);

  // The main column owns the page's horizontal padding.
  assert.match(main, /padding:\s*0 48px 36px/);

  // The welcome composer is the centered frosted-glass card.
  assert.match(composer, /max-width:\s*840px/);
  assert.match(composer, /margin:\s*0 auto/);
  assert.match(composer, /background:\s*var\(--shijing-ask-card-bg\)/);
  assert.match(composer, /border:\s*1px solid var\(--shijing-ask-card-border\)/);
  assert.match(composer, /border-radius:\s*28px/);
  assert.match(composer, /box-shadow:\s*var\(--shijing-ask-card-shadow\)/);

  // The context focus bar is embedded in the composer card toolbar, not a
  // hairline-separated footer strip.
  assert.match(contextBar, /padding:\s*0/);
  assert.doesNotMatch(contextBar, /border-top:/);
  assert.doesNotMatch(contextBar, /min-height:/);
});

test('Ask ShiJing hero centers the title, subtitle, and rule above the composer card', () => {
  const root = cssBlock(shijingStyles, '.shijing-tab.shijing-ask');
  const hero = cssBlock(shijingStyles, '.shijing-ask__hero');
  const subtitle = cssBlock(shijingStyles, '.shijing-ask__subtitle');
  const dot = cssBlock(shijingStyles, '.shijing-ask__title-dot');
  const rule = cssBlock(shijingStyles, '.shijing-ask__hero-rule');

  assert.match(root, /padding:\s*0/);
  assert.match(hero, /flex-direction:\s*column/);
  assert.match(hero, /align-items:\s*center/);
  assert.match(hero, /text-align:\s*center/);
  assert.match(subtitle, /letter-spacing:\s*0\.14em/);
  assert.match(subtitle, /color:\s*#64748b/);
  assert.match(dot, /border-radius:\s*50%/);
  assert.match(dot, /background:\s*#43c6a5/);
  assert.match(rule, /width:\s*56px/);
  assert.match(rule, /height:\s*1px/);

  // The hero lives inside the welcome group, directly above the composer card.
  assert.match(shijingTabSource, /className="shijing-ask__welcome">[\s\S]*?className="shijing-ask__hero"/);
  assert.match(shijingTabSource, /className="shijing-ask__subtitle">\{copy\.shijing\.subtitle\}/);
  assert.match(shijingTabSource, /className="shijing-ask__hero-rule"/);
});

test('Ask ShiJing context focus keeps active concern chips in one row before edit action', () => {
  const chips = cssBlock(shijingStyles, '.shijing-ask .shijing-ctx__chips');
  const manage = cssBlock(shijingStyles, '.shijing-ask .shijing-ctx__manage');

  assert.match(chips, /display:\s*flex/);
  assert.match(chips, /flex-direction:\s*row/);
  assert.match(chips, /flex-wrap:\s*wrap/);
  assert.match(chips, /padding:\s*0/);
  assert.match(manage, /display:\s*inline-flex/);
});

test('Ask ShiJing context focus opens the inline concern editor instead of jumping to settings', () => {
  assert.match(shijingTabSource, /<InlineConcernEditorPopover\b/);
  assert.match(shijingTabSource, /aria-haspopup="dialog"/);
  assert.doesNotMatch(
    shijingTabSource,
    /onManage=\{\(\) => props\.onRequestOpenSettings\?\.\('concerns'\)\}/,
  );
});

test('Ask ShiJing inline concern editor expands in flow instead of covering results', () => {
  const openContext = cssBlock(shijingStyles, '.shijing-ctx:has(.shijing-ctx-editor)');
  const anchor = cssBlock(shijingStyles, '.shijing-ctx:has(.shijing-ctx-editor) .shijing-ctx__editor-anchor');
  const editor = cssBlock(shijingStyles, '.shijing-ctx-editor');

  assert.match(openContext, /align-items:\s*flex-start/);
  assert.match(openContext, /flex-wrap:\s*wrap/);
  assert.match(anchor, /flex-direction:\s*column/);
  assert.match(anchor, /align-items:\s*flex-end/);
  assert.match(anchor, /min-width:\s*0/);
  assert.match(anchor, /max-width:\s*min\(380px, 100%\)/);
  assert.match(editor, /position:\s*static/);
  assert.match(editor, /box-sizing:\s*border-box/);
  assert.match(editor, /min-width:\s*0/);
  assert.doesNotMatch(editor, /position:\s*absolute/);
});

test('Ask ShiJing composer card embeds the context focus row without prompt chips', () => {
  assert.match(shijingTabSource, /footerSlot=\{<ContextFocusBar/);
  assert.match(shijingTabSource, /\{props\.footerSlot\}/);
  // The "可以这样问" prompt-chip row is removed from the consultation surface.
  assert.doesNotMatch(shijingTabSource, /suggestSlot/);
  assert.doesNotMatch(shijingTabSource, /suggestedQuestions/);
  assert.doesNotMatch(shijingTabSource, /shijing-ask__suggest/);
  assert.doesNotMatch(shijingTabSource, /shijing-ask__chip/);

  const toolbarContext = cssBlock(shijingStyles, '.shijing-ask__toolbar > .shijing-ctx');

  assert.match(toolbarContext, /flex:\s*1 1 auto/);
  assert.match(toolbarContext, /min-width:\s*0/);
});

test('Ask ShiJing concern sync effect preserves identical array state', () => {
  assert.match(shijingTabSource, /function sameStringArray\(/);
  assert.match(
    shijingTabSource,
    /setSelectedArchiveConcernIds\(\(ids\) => \{[\s\S]*?const next = ids\.filter\(\(id\) => activeConcernIds\.has\(id\)\);[\s\S]*?return sameStringArray\(ids, next\) \? ids : next;/,
  );
  assert.match(
    shijingTabSource,
    /setSelectedFilterConcernIds\(\(ids\) => \{[\s\S]*?return sameStringArray\(ids, next\) \? ids : next;/,
  );
  assert.match(
    shijingTabSource,
    /setDismissedArchiveConcernIds\(\(ids\) => \{[\s\S]*?return sameStringArray\(ids, next\) \? ids : next;/,
  );
});

test('Ask ShiJing switches to a chat window once a conversation exists', () => {
  assert.match(shijingTabSource, /const chatActive = pendingConversation != null \|\| \(!draftingNewQuestion && resultConversation != null/);
  assert.match(
    shijingTabSource,
    /data-chat-active=\{chatActive \? 'true' : 'false'\}/,
  );

  const chatBranch = /chatActive \? \([\s\S]*?className="shijing-ask__result"[\s\S]*?<ShiJingComposer[\s\S]*?\) : \(/.exec(
    shijingTabSource,
  )?.[0] ?? '';
  assert.notEqual(chatBranch, '', 'chat-active branch must render history before the composer');
  assert.ok(
    chatBranch.indexOf('className="shijing-ask__result"') < chatBranch.indexOf('<ShiJingComposer'),
    'conversation history must be above the bottom composer in chat-active mode',
  );

  const mainChat = cssBlock(shijingStyles, '.shijing-ask__main[data-chat-active="true"]');
  const resultChat = cssBlock(
    shijingStyles,
    '.shijing-ask__main[data-chat-active="true"] .shijing-ask__result',
  );
  const composerChat = cssBlock(
    shijingStyles,
    '.shijing-ask__main[data-chat-active="true"] .shijing-ask__composer',
  );

  assert.match(mainChat, /min-height:\s*0/);
  assert.match(mainChat, /overflow:\s*hidden/);
  assert.match(mainChat, /justify-content:\s*stretch/);
  assert.doesNotMatch(mainChat, /100vh/);
  assert.match(resultChat, /flex:\s*1 1 0/);
  assert.match(resultChat, /overflow-y:\s*auto/);
  assert.match(resultChat, /overscroll-behavior:\s*contain/);
  assert.match(composerChat, /margin-top:\s*auto/);
  assert.match(composerChat, /min-height:\s*0/);
  assert.match(composerChat, /position:\s*relative/);
  assert.doesNotMatch(composerChat, /position:\s*sticky/);
});

test('Ask ShiJing fills the shell main area vertically instead of hugging the top', () => {
  const askTab = cssBlock(shijingStyles, '.shijing-tab.shijing-ask');
  const askTabChat = cssBlock(
    shijingStyles,
    '.shijing-tab.shijing-ask:has(.shijing-ask__main[data-chat-active="true"])',
  );
  const layout = cssBlock(shijingStyles, '.shijing-ask__layout');

  assert.match(askTab, /box-sizing:\s*border-box/);
  assert.match(askTab, /min-height:\s*100%/);
  assert.match(askTabChat, /height:\s*100%/);
  assert.match(layout, /flex:\s*1/);
  assert.match(layout, /min-height:\s*0/);
  assert.match(layout, /grid-template-rows:\s*minmax\(0, 1fr\)/);
});

test('Ask ShiJing empty state centers the composer group vertically', () => {
  assert.match(shijingTabSource, /className="shijing-ask__welcome"/);

  const welcome = cssBlock(shijingStyles, '.shijing-ask__welcome');

  assert.match(welcome, /flex:\s*1/);
  assert.match(welcome, /min-height:\s*0/);
  assert.match(welcome, /display:\s*flex/);
  assert.match(welcome, /flex-direction:\s*column/);
  assert.match(welcome, /justify-content:\s*center/);
});

test('Ask ShiJing immediately previews a submitted question in the chat thread', () => {
  assert.match(shijingTabSource, /const \[pendingConversation, setPendingConversation\]/);
  assert.match(shijingTabSource, /buildPendingConversationPreview/);
  assert.match(
    shijingTabSource,
    /const resultConversation = pendingConversation \?\? \(draftingNewQuestion \? null : selectedConversation \?\? newestConversation\);/,
  );
  assert.match(
    shijingTabSource,
    /if \(sourceReadingIds\.length === 0\) return;[\s\S]*?setPendingConversation\(pending\.conversation\);[\s\S]*?const outcome = await generateReadingForStorage/,
  );
  assert.match(
    shijingTabSource,
    /const chatActive = pendingConversation != null \|\| \(!draftingNewQuestion && resultConversation != null/,
  );
});

test('Ask ShiJing pending answer uses a Nimi chat thinking bubble', () => {
  assert.match(shijingTabSource, /pendingTurnIds/);
  assert.match(shijingTabSource, /thinkingLabel=\{copy\.shijing\.thinking\}/);
  assert.match(shijingTabSource, /data-pending=\{isPending \? 'true' : undefined\}/);

  const pendingTurn = cssBlock(shijingStyles, '.shijing-ask__turn[data-pending="true"] .shijing-ask__turn-body');
  const thinkingDots = cssBlock(shijingStyles, '.shijing-ask__thinking-dots');
  const thinkingDot = cssBlock(shijingStyles, '.shijing-ask__thinking-dots span');

  assert.match(pendingTurn, /display:\s*inline-flex/);
  assert.match(pendingTurn, /align-items:\s*center/);
  assert.match(thinkingDots, /display:\s*inline-flex/);
  assert.match(thinkingDot, /animation:\s*shijing-thinking-pulse/);
  assert.match(shijingStyles, /@keyframes shijing-thinking-pulse/);
});

test('Ask ShiJing hides composer placeholder inside an active chat thread', () => {
  assert.match(
    shijingTabSource,
    /const composerPlaceholder = chatActive \? '' : copy\.shijing\.composerPlaceholder/,
  );
  assert.match(shijingTabSource, /composerPlaceholder=\{composerPlaceholder\}/);
  assert.match(shijingTabSource, /placeholder=\{props\.composerPlaceholder\}/);
  assert.doesNotMatch(shijingTabSource, /placeholder=\{copy\.shijing\.composerPlaceholder\}/);
});

test('Ask ShiJing composer textarea stays at two rows', () => {
  assert.match(shijingTabSource, /className="shijing-ask__textarea"[\s\S]*?rows=\{2\}/);

  const composer = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__composer');
  const textarea = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__textarea');
  const chatTextarea = cssBlock(
    shijingStyles,
    '.shijing-ask__main[data-chat-active="true"] .shijing-ask__textarea',
  );

  assert.match(composer, /min-height:\s*0/);
  assert.doesNotMatch(composer, /min-height:\s*420px/);
  assert.match(textarea, /flex:\s*0 0 auto/);
  assert.match(textarea, /height:\s*calc\(2 \* 1\.8em\)/);
  assert.match(textarea, /min-height:\s*calc\(2 \* 1\.8em\)/);
  assert.match(textarea, /max-height:\s*calc\(2 \* 1\.8em\)/);
  assert.match(textarea, /line-height:\s*1\.8/);
  assert.match(chatTextarea, /height:\s*calc\(2 \* 1\.8em\)/);
  assert.match(chatTextarea, /min-height:\s*calc\(2 \* 1\.8em\)/);
  assert.match(chatTextarea, /max-height:\s*calc\(2 \* 1\.8em\)/);
});

test('Ask ShiJing composer submits on plain Enter from the textarea', () => {
  assert.match(shijingTabSource, /onKeyDown=\{handleTextareaKeyDown\}/);
  assert.match(shijingTabSource, /event\.key !== 'Enter'/);
  assert.match(shijingTabSource, /event\.shiftKey/);
  assert.match(shijingTabSource, /event\.nativeEvent\.isComposing/);
  assert.match(shijingTabSource, /event\.preventDefault\(\)/);
  assert.match(shijingTabSource, /event\.currentTarget\.form\?\.requestSubmit\(\)/);
});

test('Ask ShiJing chat controls match the Codex-style compact composer chrome', () => {
  assert.match(shijingTabSource, /const \[draftingNewQuestion, setDraftingNewQuestion\]/);
  assert.match(shijingTabSource, /className="shijing-ask__new-question"/);
  assert.match(shijingTabSource, /setDraftingNewQuestion\(true\)/);
  assert.match(shijingTabSource, /setDraftingNewQuestion\(false\)/);
  assert.match(shijingTabSource, /aria-label=\{copy\.shijing\.newQuestionAria\}/);
  assert.match(shijingTabSource, /<ArrowUpIcon className="shijing-ask__submit-icon" \/>/);
  assert.doesNotMatch(shijingTabSource, /<span className="shijing-ask__submit-icon" aria-hidden>[\s\S]*?↑[\s\S]*?<\/span>/);
  assert.doesNotMatch(shijingTabSource, /\{submitLabel\}\s*<\/button>/);

  const railHead = cssBlock(shijingStyles, '.shijing-ask__rail-head');
  const newQuestion = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__new-question');
  const toolbar = cssBlock(shijingStyles, '.shijing-ask__toolbar');
  const chatToolbar = cssBlock(
    shijingStyles,
    '.shijing-ask__composer[data-chat-composer="true"] .shijing-ask__toolbar',
  );
  const submit = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__submit');
  const submitIcon = cssBlock(shijingStyles, '.shijing-ask__submit-icon');

  assert.match(railHead, /flex-direction:\s*column/);
  assert.match(newQuestion, /width:\s*100%/);
  assert.match(newQuestion, /justify-content:\s*center/);
  // The welcome toolbar carries the hairline divider above the context-focus
  // row; the chat toolbar drops it because the composer is its own card.
  assert.match(toolbar, /display:\s*flex/);
  assert.match(toolbar, /align-items:\s*center/);
  assert.match(toolbar, /border-top:\s*1px solid rgba\(15, 23, 42, 0\.06\)/);
  assert.match(chatToolbar, /border-top:\s*0/);
  assert.match(submit, /width:\s*42px/);
  assert.match(submit, /height:\s*42px/);
  assert.match(submit, /border-radius:\s*50%/);
  assert.doesNotMatch(submit, /width:\s*160px/);
  assert.match(submitIcon, /width:\s*18px/);
  assert.match(submitIcon, /height:\s*18px/);
  assert.doesNotMatch(submitIcon, /font-size:\s*24px/);
});

test('Ask ShiJing history rail search uses a real magnifying glass icon', () => {
  assert.match(
    shijingTabSource,
    /function SearchIcon\(props: IconProps\)[\s\S]*?<circle cx="11" cy="11" r="7" \/>[\s\S]*?<path d="m16 16 4 4" \/>/,
  );
  assert.match(shijingTabSource, /<SearchIcon className="shijing-ask__search-icon" \/>/);
  assert.doesNotMatch(
    shijingTabSource,
    /<span className="shijing-ask__search-icon" aria-hidden>[\s\S]*?<\/span>/,
  );

  const searchIcon = cssBlock(shijingStyles, '.shijing-ask__search-icon');
  assert.match(searchIcon, /width:\s*14px/);
  assert.match(searchIcon, /height:\s*14px/);
  assert.match(searchIcon, /stroke-width:\s*2/);
});

test('Ask ShiJing new-question page exposes GPT-style archive chips below the composer', () => {
  assert.match(shijingTabSource, /const \[selectedArchiveConcernIds, setSelectedArchiveConcernIds\]/);
  assert.match(shijingTabSource, /function ArchiveTray\(/);
  assert.match(shijingTabSource, /className="shijing-archive"/);
  assert.match(shijingTabSource, /copy\.shijing\.archive\.addPrefix/);
  assert.match(shijingTabSource, /concern_tag_refs: selectedArchiveConcernIds/);

  const archive = cssBlock(shijingStyles, '.shijing-archive');
  const archiveButton = cssBlock(shijingStyles, '.shijing-ask .shijing-archive__chip');
  const archiveClose = cssBlock(shijingStyles, '.shijing-ask .shijing-archive__close');

  assert.match(archive, /display:\s*flex/);
  assert.match(archive, /align-items:\s*center/);
  assert.match(archive, /border-radius:\s*16px/);
  assert.match(archiveButton, /display:\s*inline-flex/);
  assert.match(archiveButton, /border:\s*1px solid/);
  assert.match(archiveClose, /width:\s*24px/);
  assert.match(archiveClose, /height:\s*24px/);
});

test('Ask ShiJing new-question archive chips can materialize built-in preset concerns', () => {
  assert.match(shijingTabSource, /suggestArchiveConcernOptions/);
  assert.match(shijingTabSource, /activateArchiveConcernOption/);
  assert.match(shijingTabSource, /newConcernTagId/);
  assert.match(shijingTabSource, /onToggleOption=\{toggleArchiveOption\}/);
  assert.match(shijingTabSource, /replace_snapshot\(\{\s*\.\.\.state\.snapshot,\s*concern_tags:\s*activation\.tags\s*\}\)/);
});

test('Ask ShiJing archive suggestions are explicit and not auto-selected from typing', () => {
  assert.doesNotMatch(shijingTabSource, /suggestedArchiveConcernIds/);
  assert.doesNotMatch(shijingTabSource, /surviving\.length > 0 \? surviving :/);
  assert.match(shijingTabSource, /selectedIds=\{selectedArchiveConcernIds\}/);
  assert.match(shijingTabSource, /copy\.shijing\.archive\.addAria\(label\)/);
  assert.match(shijingTabSource, /selected \? 'x' : '\+'/);
});

test('Ask ShiJing rail has concern filter controls before history sessions', () => {
  assert.match(shijingTabSource, /const \[filterOpen, setFilterOpen\]/);
  assert.match(shijingTabSource, /const \[selectedFilterConcernIds, setSelectedFilterConcernIds\]/);
  assert.match(shijingTabSource, /className="shijing-ask__filter-button"/);
  assert.match(shijingTabSource, /className="shijing-ask__filter-menu"/);
  assert.match(shijingTabSource, /conversationMatchesConcernFilter/);
  assert.doesNotMatch(shijingTabSource, /selectedFilterConcernIds\.length === 0 \? 'x' : ''/);
  assert.doesNotMatch(shijingTabSource, /selected \? 'x' : ''/);

  const searchRow = cssBlock(shijingStyles, '.shijing-ask__search-row');
  const filterButton = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__filter-button');
  const filterMenu = cssBlock(shijingStyles, '.shijing-ask__filter-menu');
  const filterOption = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__filter-option');

  assert.match(searchRow, /display:\s*grid/);
  assert.match(searchRow, /grid-template-columns:\s*1fr auto/);
  assert.match(filterButton, /border-radius:\s*50%/);
  assert.match(filterMenu, /position:\s*absolute/);
  assert.match(filterOption, /display:\s*flex/);
  assert.match(filterOption, /justify-content:\s*space-between/);
});

test('Ask ShiJing recalls archived conversations from the current question text', () => {
  assert.match(shijingTabSource, /conversationMatchesQuestionArchive/);
  assert.match(shijingTabSource, /questionArchiveMatches/);
  assert.match(
    shijingTabSource,
    /const historyLookupText = search\.trim\(\)\.length > 0 \? search : chatActive \? '' : question;/,
  );
  assert.match(
    shijingTabSource,
    /conversationMatchesQuestionArchive\(c, historyLookupText, state\.snapshot\.concern_tags, copy\)/,
  );
  assert.match(shijingTabSource, /const archiveRecallConversations =[\s\S]*?questionArchiveMatches\(/);
  assert.match(shijingTabSource, /<QuestionArchiveRecall/);

  const recall = cssBlock(shijingStyles, '.shijing-recall');
  const recallButton = cssBlock(shijingStyles, '.shijing-ask .shijing-recall__item');

  assert.match(recall, /display:\s*flex/);
  assert.match(recall, /border-radius:\s*16px/);
  assert.match(recall, /background:\s*rgba\(67, 198, 165, 0\.07\)/);
  assert.doesNotMatch(recall, /box-shadow:/);
  assert.match(recallButton, /display:\s*grid/);
  assert.match(recallButton, /grid-template-columns:\s*1fr auto/);
});

test('Ask ShiJing conversation thread uses right-user and left-answer chat bubbles', () => {
  assert.match(shijingTabSource, /className="shijing-ask__turn"[\s\S]*?data-role=\{turn\.role\}/);

  const turn = cssBlock(shijingStyles, '.shijing-ask__turn');
  const userTurn = cssBlock(shijingStyles, '.shijing-ask__turn[data-role="user"]');
  const aiTurn = cssBlock(shijingStyles, '.shijing-ask__turn[data-role="ai"]');
  const body = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__turn-body');
  const userBody = cssBlock(
    shijingStyles,
    '.shijing-ask__turn[data-role="user"] .shijing-ask__turn-body',
  );
  const aiBody = cssBlock(
    shijingStyles,
    '.shijing-ask__turn[data-role="ai"] .shijing-ask__turn-body',
  );
  const userRole = cssBlock(
    shijingStyles,
    '.shijing-ask__turn[data-role="user"] .shijing-ask__turn-role',
  );

  assert.match(turn, /align-items:\s*flex-start/);
  assert.match(userTurn, /align-items:\s*flex-end/);
  assert.match(aiTurn, /align-items:\s*flex-start/);
  assert.match(body, /width:\s*fit-content/);
  assert.match(body, /max-width:\s*min\(72%, 720px\)/);
  assert.match(body, /padding:\s*10px 14px/);
  assert.match(body, /border-radius:\s*22px 22px 22px 6px/);
  assert.match(body, /white-space:\s*pre-wrap/);
  assert.match(userBody, /border-radius:\s*22px 22px 6px 22px/);
  assert.match(userBody, /background:\s*linear-gradient\(135deg, #43c6a5, #1fae91\)/);
  assert.match(userBody, /color:\s*#fff/);
  assert.match(aiBody, /background:\s*rgba\(255, 255, 255, 0\.78\)/);
  assert.match(userRole, /text-align:\s*right/);
});

test('Ask ShiJing formats structured AI answers with readable hierarchy', () => {
  assert.match(shijingTabSource, /function ShiJingAnswerBody\(/);
  assert.match(shijingTabSource, /parseShiJingAnswerText\(text\)/);
  assert.match(shijingTabSource, /className="shijing-ask__answer-title"/);
  assert.match(shijingTabSource, /className="shijing-ask__answer-card"/);
  assert.match(shijingTabSource, /className="shijing-ask__answer-field-label"/);

  const aiBody = cssBlock(
    shijingStyles,
    '.shijing-ask__turn[data-role="ai"] .shijing-ask__turn-body',
  );
  const answer = cssBlock(shijingStyles, '.shijing-ask__answer');
  const title = cssBlock(shijingStyles, '.shijing-ask__answer-title');
  const conclusion = cssBlock(shijingStyles, '.shijing-ask__answer-conclusion');
  const cards = cssBlock(shijingStyles, '.shijing-ask__answer-cards');
  const card = cssBlock(shijingStyles, '.shijing-ask__answer-card');
  const cardTitle = cssBlock(shijingStyles, '.shijing-ask__answer-card-title');
  const fieldLabel = cssBlock(shijingStyles, '.shijing-ask__answer-field-label');
  const summary = cssBlock(shijingStyles, '.shijing-ask__answer-summary');

  assert.match(aiBody, /max-width:\s*min\(84%, 780px\)/);
  assert.match(answer, /display:\s*grid/);
  assert.match(answer, /gap:\s*12px/);
  assert.match(title, /font-size:\s*18px/);
  assert.match(title, /font-weight:\s*760/);
  assert.match(conclusion, /font-size:\s*15px/);
  assert.match(cards, /display:\s*grid/);
  assert.match(card, /border:\s*1px solid/);
  assert.match(card, /border-radius:\s*16px/);
  assert.match(cardTitle, /font-size:\s*15px/);
  assert.match(fieldLabel, /font-size:\s*12px/);
  assert.match(fieldLabel, /color:\s*#64748b/);
  assert.match(summary, /border-top:\s*1px solid/);
});
