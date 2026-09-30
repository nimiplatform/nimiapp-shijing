import ts from 'typescript';

const COPY_FIELDS = new Set(['label', 'title', 'description', 'placeholder', 'subtitle', 'message', 'body', 'heading', 'alt', 'aria-label']);
const DATA_FIELDS = new Set(['id', 'icon', 'kind', 'key', 'value', 'source', 'role', 'fontSize', 'textAnchor', 'dominantBaseline', 'pointerEvents']);

function declarationLooksLikeCopy(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isVariableDeclaration(parent)) {
      const name = parent.name.getText();
      if (/className|classes|classList/i.test(name)) return false;
      if (/copy|label|title|description|message|placeholder|heading|subtitle/i.test(name)) return true;
    }
  }
  return false;
}

export function extractI18nLiterals(source, fileName = 'surface.tsx') {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const candidates = [];
  const pairedLocales = new Set();
  const typedDeclarations = new Map();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.type) typedDeclarations.set(declaration.name.text, declaration.type.getText(file));
    }
  }
  for (const [name, type] of typedDeclarations) {
    const counterpart = name === 'ZH' ? 'EN' : name.startsWith('ZH_') ? `EN_${name.slice(3)}` : null;
    if (counterpart && typedDeclarations.get(counterpart) === type) pairedLocales.add(name);
  }
  const inPairedLocale = (node) => {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isVariableDeclaration(parent) && pairedLocales.has(parent.name.getText(file))) return true;
      if (ts.isVariableDeclaration(parent) && (parent.name.getText(file) === 'EN' || parent.name.getText(file).startsWith('EN_')) && pairedLocales.size > 0) {
        const text = ts.isTemplateExpression(node) ? [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ') : node.text;
        return !/[\u4E00-\u9FFF]/.test(text);
      }
    }
    return false;
  };
  const add = (node, text) => {
    const normalized = text.trim().replace(/\s+/g, ' ');
    if (normalized) candidates.push({ line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, text: normalized });
  };
  const walk = (node) => {
    if (ts.isJsxText(node)) add(node, node.text);
    if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) {
      const parent = node.parent;
      if (ts.isCaseClause(parent) || (ts.isBinaryExpression(parent) && [
        ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ].includes(parent.operatorToken.kind))) return;
      if (ts.isJsxAttribute(parent) && !COPY_FIELDS.has(parent.name.getText(file))) return;
      if (ts.isCallExpression(parent) && /^(?:key|t|i18n\.t)$/.test(parent.expression.getText(file))) return;
      if (inPairedLocale(node)) return;
      const jsxAttribute = ts.isJsxAttribute(parent) && COPY_FIELDS.has(parent.name.getText(file));
      const field = ts.isPropertyAssignment(parent) ? parent.name.getText(file).replace(/^['"]|['"]$/g, '') : null;
      const copyField = field !== null && !DATA_FIELDS.has(field) && (COPY_FIELDS.has(field) || declarationLooksLikeCopy(node));
      const namedCopy = field === null && declarationLooksLikeCopy(node);
      if (jsxAttribute || copyField || namedCopy) {
        const text = ts.isTemplateExpression(node)
          ? [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ')
          : node.text;
        add(node, text);
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  return candidates;
}
