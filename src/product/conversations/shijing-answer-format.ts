export interface StructuredShiJingAnswerCard {
  readonly title?: string;
  readonly riskLevel?: string;
  readonly why?: string;
  readonly suggestion?: string;
  readonly avoid?: string;
}

export interface StructuredShiJingAnswer {
  readonly kind: 'structured';
  readonly title?: string;
  readonly conclusion?: string;
  readonly cards: readonly StructuredShiJingAnswerCard[];
  readonly summary?: string;
}

export interface PlainShiJingAnswer {
  readonly kind: 'plain';
  readonly paragraphs: readonly string[];
}

export type ParsedShiJingAnswer = StructuredShiJingAnswer | PlainShiJingAnswer;

type CardField = keyof StructuredShiJingAnswerCard;
type DraftShiJingAnswerCard = {
  -readonly [K in keyof StructuredShiJingAnswerCard]?: StructuredShiJingAnswerCard[K];
};

const ROOT_LABELS = {
  title: '标题',
  conclusion: '结论',
  cards: '重点卡片',
  summary: '总结',
} as const;

const CARD_FIELD_LABELS: readonly [string, CardField][] = [
  ['标题', 'title'],
  ['风险等级', 'riskLevel'],
  ['为什么需要注意', 'why'],
  ['建议做什么', 'suggestion'],
  ['避免做什么', 'avoid'],
];

export function parseShiJingAnswerText(text: string): ParsedShiJingAnswer {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { kind: 'plain', paragraphs: [] };
  }

  const structured = parseStructuredLines(lines);
  if (structured) {
    return structured;
  }

  return {
    kind: 'plain',
    paragraphs: text
      .split(/\n\s*\n/u)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0),
  };
}

function parseStructuredLines(lines: readonly string[]): StructuredShiJingAnswer | null {
  let title: string | undefined;
  let conclusion: string | undefined;
  let summary: string | undefined;
  const cards: StructuredShiJingAnswerCard[] = [];
  let currentCard: DraftShiJingAnswerCard | null = null;
  let section: 'root' | 'cards' | 'summary' = 'root';

  for (const rawLine of lines) {
    const line = stripListMarker(rawLine);
    const rootTitle = readLabelValue(line, ROOT_LABELS.title);
    if (rootTitle != null && section !== 'cards') {
      title = rootTitle;
      section = 'root';
      continue;
    }

    const rootConclusion = readLabelValue(line, ROOT_LABELS.conclusion);
    if (rootConclusion != null) {
      conclusion = rootConclusion;
      section = 'root';
      continue;
    }

    const rootSummary = readLabelValue(line, ROOT_LABELS.summary);
    if (rootSummary != null) {
      summary = appendText(summary, rootSummary);
      section = 'summary';
      continue;
    }

    if (isSectionHeading(line, ROOT_LABELS.cards)) {
      section = 'cards';
      continue;
    }

    if (section === 'cards' && /^\d+[.、)]?$/u.test(line)) {
      if (currentCard && hasCardContent(currentCard)) {
        cards.push(currentCard);
      }
      currentCard = {};
      continue;
    }

    if (section === 'cards') {
      const field = readCardField(line);
      if (field) {
        if (!currentCard) currentCard = {};
        currentCard[field.key] = appendText(currentCard[field.key], field.value);
        continue;
      }
    }

    if (section === 'summary') {
      summary = appendText(summary, line);
    }
  }

  if (currentCard && hasCardContent(currentCard)) {
    cards.push(currentCard);
  }

  if (!title && !conclusion && cards.length === 0 && !summary) {
    return null;
  }

  return { kind: 'structured', title, conclusion, cards, summary };
}

function stripListMarker(line: string): string {
  return line.replace(/^[-*]\s*/u, '').trim();
}

function readLabelValue(line: string, label: string): string | null {
  const match = new RegExp(`^${label}\\s*[：:]\\s*(.*)$`, 'u').exec(line);
  if (!match) return null;
  return match[1]?.trim() ?? '';
}

function isSectionHeading(line: string, label: string): boolean {
  return new RegExp(`^${label}\\s*[：:]?$`, 'u').test(line);
}

function readCardField(line: string): { key: CardField; value: string } | null {
  for (const [label, key] of CARD_FIELD_LABELS) {
    const value = readLabelValue(line, label);
    if (value != null) {
      return { key, value };
    }
  }
  return null;
}

function appendText(existing: string | undefined, next: string): string {
  if (next.length === 0) return existing ?? '';
  return existing ? `${existing}\n${next}` : next;
}

function hasCardContent(card: DraftShiJingAnswerCard): card is StructuredShiJingAnswerCard {
  return Object.values(card).some((value) => typeof value === 'string' && value.length > 0);
}
