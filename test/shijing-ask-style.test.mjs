import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const shijingStyles = stripCssComments(
  readFileSync(new URL('../src/styles-shijing-rich.css', import.meta.url), 'utf8'),
);
const nianjingStyles = stripCssComments(
  readFileSync(new URL('../src/styles-nianjing-rich.css', import.meta.url), 'utf8'),
);
const shijingTabSource = readFileSync(
  new URL('../src/product/tabs/shijing-tab.tsx', import.meta.url),
  'utf8',
);

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
  const askShell = cssBlock(shijingStyles, '.shijing-shell[data-active-tab="shijing"]');
  const nianjingShell = cssBlock(nianjingStyles, '.shijing-shell[data-active-tab="nianjing"]');

  for (const token of [
    'radial-gradient(42% 36% at 6% 4%, rgba(167, 243, 208, 0.55), transparent 70%)',
    'radial-gradient(40% 38% at 94% 92%, rgba(252, 231, 243, 0.50), transparent 70%)',
    'linear-gradient(135deg, #e7f5ee 0%, #eef0f7 100%)',
  ]) {
    assert.ok(nianjingShell.includes(token), `NianJing background fixture missing ${token}`);
    assert.ok(askShell.includes(token), `Ask ShiJing background missing ${token}`);
  }
});

test('Ask ShiJing topbar and main area match NianJing transparent chrome', () => {
  const askTopbar = cssBlock(shijingStyles, '.shijing-shell[data-active-tab="shijing"] .shijing-topbar');
  const askMain = cssBlock(shijingStyles, '.shijing-shell__main:has(> .shijing-ask)');

  assert.match(askTopbar, /background:\s*transparent/);
  assert.match(askTopbar, /backdrop-filter:\s*none/);
  assert.match(askTopbar, /-webkit-backdrop-filter:\s*none/);
  assert.match(askTopbar, /border-bottom-color:\s*rgba\(255, 255, 255, 0\.45\)/);
  assert.match(askMain, /background:\s*transparent/);
});

test('Ask ShiJing cards use the same light glass system as NianJing', () => {
  const root = cssBlock(shijingStyles, '.shijing-tab.shijing-ask');
  const rail = cssBlock(shijingStyles, '.shijing-ask__rail');
  const composer = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__composer');
  const contextBar = cssBlock(shijingStyles, '.shijing-ctx');
  const result = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__result');

  assert.match(root, /--shijing-ask-glass-bg:\s*rgba\(255, 255, 255, 0\.55\)/);
  assert.match(root, /--shijing-ask-glass-border:\s*rgba\(255, 255, 255, 0\.55\)/);
  assert.match(root, /--shijing-ask-glass-blur:\s*blur\(16px\) saturate\(140%\)/);
  assert.match(root, /--shijing-ask-glass-shadow:\s*0 8px 28px -16px rgba\(15, 23, 38, 0\.12\)/);

  for (const block of [rail, composer, contextBar, result]) {
    assert.match(block, /background:\s*var\(--shijing-ask-glass-bg\)/);
    assert.match(block, /backdrop-filter:\s*var\(--shijing-ask-glass-blur\)/);
    assert.match(block, /-webkit-backdrop-filter:\s*var\(--shijing-ask-glass-blur\)/);
    assert.match(block, /border:\s*1px solid var\(--shijing-ask-glass-border\)/);
    assert.match(block, /box-shadow:\s*var\(--shijing-ask-glass-shadow\)/);
  }
});

test('Ask ShiJing hero and content start higher as one composition', () => {
  const root = cssBlock(shijingStyles, '.shijing-tab.shijing-ask');
  const hero = cssBlock(shijingStyles, '.shijing-ask__hero');

  assert.match(root, /padding-top:\s*0/);
  assert.match(hero, /min-height:\s*116px/);
  assert.match(hero, /padding:\s*0/);
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

test('Ask ShiJing concern sync effect preserves identical array state', () => {
  assert.match(shijingTabSource, /function sameStringArray\(/);
  assert.match(
    shijingTabSource,
    /const next = surviving\.length > 0 \? surviving : suggestedArchiveConcernIds;[\s\S]*?return sameStringArray\(ids, next\) \? ids : next;/,
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
  assert.match(shijingTabSource, /const chatActive = !draftingNewQuestion && resultConversation != null/);
  assert.match(
    shijingTabSource,
    /data-chat-active=\{chatActive \? 'true' : 'false'\}/,
  );

  const chatBranch = /chatActive \? \([\s\S]*?className="shijing-ask__result"[\s\S]*?renderComposer\(\)[\s\S]*?\) : \(/.exec(
    shijingTabSource,
  )?.[0] ?? '';
  assert.notEqual(chatBranch, '', 'chat-active branch must render history before the composer');
  assert.ok(
    chatBranch.indexOf('className="shijing-ask__result"') < chatBranch.indexOf('renderComposer()'),
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

  assert.match(mainChat, /height:\s*calc\(100vh - 220px\)/);
  assert.match(mainChat, /max-height:\s*calc\(100vh - 220px\)/);
  assert.match(mainChat, /overflow:\s*hidden/);
  assert.match(mainChat, /justify-content:\s*stretch/);
  assert.match(resultChat, /flex:\s*1 1 0/);
  assert.match(resultChat, /overflow-y:\s*auto/);
  assert.match(resultChat, /overscroll-behavior:\s*contain/);
  assert.match(composerChat, /margin-top:\s*auto/);
  assert.match(composerChat, /min-height:\s*0/);
  assert.match(composerChat, /position:\s*relative/);
  assert.match(composerChat, /bottom:\s*auto/);
  assert.doesNotMatch(composerChat, /position:\s*sticky/);
});

test('Ask ShiJing hides composer placeholder inside an active chat thread', () => {
  assert.match(
    shijingTabSource,
    /const composerPlaceholder = chatActive \? '' : copy\.shijing\.composerPlaceholder/,
  );
  assert.match(shijingTabSource, /placeholder=\{composerPlaceholder\}/);
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
  const submit = cssBlock(shijingStyles, '.shijing-ask .shijing-ask__submit');
  const submitIcon = cssBlock(shijingStyles, '.shijing-ask__submit-icon');

  assert.match(railHead, /flex-direction:\s*column/);
  assert.match(newQuestion, /width:\s*100%/);
  assert.match(newQuestion, /justify-content:\s*center/);
  assert.match(toolbar, /border-top:\s*0/);
  assert.match(submit, /width:\s*38px/);
  assert.match(submit, /height:\s*38px/);
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

test('Ask ShiJing rail has concern filter controls before history sessions', () => {
  assert.match(shijingTabSource, /const \[filterOpen, setFilterOpen\]/);
  assert.match(shijingTabSource, /const \[selectedFilterConcernIds, setSelectedFilterConcernIds\]/);
  assert.match(shijingTabSource, /className="shijing-ask__filter-button"/);
  assert.match(shijingTabSource, /className="shijing-ask__filter-menu"/);
  assert.match(shijingTabSource, /conversationMatchesConcernFilter/);

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

test('Ask ShiJing conversation thread uses right-user and left-answer chat bubbles', () => {
  assert.match(shijingTabSource, /className="shijing-ask__turn" data-role=\{turn\.role\}/);

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
  assert.match(userBody, /border-radius:\s*22px 22px 6px 22px/);
  assert.match(userBody, /background:\s*linear-gradient\(135deg, #43c6a5, #1fae91\)/);
  assert.match(userBody, /color:\s*#fff/);
  assert.match(aiBody, /background:\s*rgba\(255, 255, 255, 0\.78\)/);
  assert.match(userRole, /text-align:\s*right/);
});
