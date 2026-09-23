import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import ts from 'typescript';

const structuralAttributes = new Set([
  'aria-describedby',
  'aria-hidden',
  'aria-labelledby',
  'aria-live',
  'aria-modal',
  'className',
  'htmlFor',
  'id',
  'role',
  'type',
]);
const technicalProperties = new Set(['id', 'path', 'titleKey']);
const technicalCalls = new Set([
  'addEventListener',
  'getElementById',
  'glob',
  'querySelector',
  'querySelectorAll',
  'removeEventListener',
]);
const comparisonKinds = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

function optionValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function collectSourceFiles(path) {
  if (!statSync(path).isDirectory()) {
    return [path];
  }
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'i18n' ? [] : collectSourceFiles(child);
    }
    return /\.tsx?$/u.test(entry.name) ? [child] : [];
  });
}

function propertyName(node) {
  const name = node.name;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  return undefined;
}

function isModuleSpecifier(node) {
  const parent = node.parent;
  return (
    (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) &&
    parent.moduleSpecifier === node
  );
}

function isStructuralAttribute(node) {
  let parent = node.parent;
  while (parent !== undefined && !ts.isJsxAttribute(parent)) {
    if (ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent)) return false;
    parent = parent.parent;
  }
  if (parent === undefined || !ts.isIdentifier(parent.name)) {
    return false;
  }
  return structuralAttributes.has(parent.name.text) || parent.name.text.startsWith('data-');
}

function isElementAccessKey(node) {
  return ts.isElementAccessExpression(node.parent) && node.parent.argumentExpression === node;
}

function isTechnicalPropertyValue(node) {
  const parent = node.parent;
  return (
    ts.isPropertyAssignment(parent) &&
    parent.initializer === node &&
    technicalProperties.has(propertyName(parent) ?? '')
  );
}

function isComparisonValue(node) {
  const parent = node.parent;
  return ts.isBinaryExpression(parent) && comparisonKinds.has(parent.operatorToken.kind);
}

function isTechnicalCallArgument(node) {
  const parent = node.parent;
  if (!ts.isCallExpression(parent) || !parent.arguments.includes(node)) {
    return false;
  }
  return ts.isPropertyAccessExpression(parent.expression)
    ? technicalCalls.has(parent.expression.name.text)
    : false;
}

function isGlobOption(node) {
  const property = node.parent;
  if (
    !ts.isPropertyAssignment(property) ||
    property.initializer !== node ||
    propertyName(property) !== 'import' ||
    !ts.isObjectLiteralExpression(property.parent)
  ) {
    return false;
  }
  const call = property.parent.parent;
  return (
    ts.isCallExpression(call) &&
    ts.isPropertyAccessExpression(call.expression) &&
    call.expression.name.text === 'glob'
  );
}

function isDeveloperError(node) {
  const parent = node.parent;
  return (
    ts.isNewExpression(parent) &&
    ts.isIdentifier(parent.expression) &&
    parent.expression.text === 'Error'
  );
}

function isConstrainedTechnicalLiteral(node) {
  const parent = node.parent;
  return (
    ts.isSatisfiesExpression(parent) &&
    ts.isTypeReferenceNode(parent.type) &&
    ts.isIdentifier(parent.type.typeName) &&
    [
      'DragPhase',
      'BrowserCapability',
      'FirstRescueAssetRole',
      'FirstRescueMissionId',
      'FirstRescueNarrationCue',
      'FirstRescueProgressLoadStatus',
      'FirstRescueResidentId',
      'FirstRescueWorldFlag',
      'IDBTransactionMode',
      'LanguageTag',
      'Locale',
      'MissionPhase',
      'NarrationCue',
      'NarrationFilename',
      'NarrationObjectKey',
      'PersistenceKey',
      'ProgressBootstrapStatus',
      'SaveGameLoadStatus',
    ].includes(parent.type.typeName.text)
  );
}

function isBasicAllowedLiteral(node) {
  if (node.text.trim().length === 0) {
    return true;
  }
  if (isModuleSpecifier(node) || ts.isLiteralTypeNode(node.parent)) {
    return true;
  }
  if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) {
    return true;
  }
  if (node.text.startsWith('/') && !node.text.includes(' ')) {
    return true;
  }
  return false;
}

function isAllowedLiteral(node) {
  if (isBasicAllowedLiteral(node)) {
    return true;
  }
  return (
    isStructuralAttribute(node) ||
    isElementAccessKey(node) ||
    isTechnicalPropertyValue(node) ||
    isGlobOption(node) ||
    isComparisonValue(node) ||
    isTechnicalCallArgument(node) ||
    isDeveloperError(node) ||
    isConstrainedTechnicalLiteral(node)
  );
}

function findingsFor(filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.txt') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const findings = [];

  function inspect(node) {
    if (ts.isJsxText(node) && node.text.trim().length > 0) {
      findings.push(node);
    }
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      !isAllowedLiteral(node)
    ) {
      findings.push(node);
    }
    ts.forEachChild(node, inspect);
  }

  inspect(sourceFile);
  return findings.map((node) => {
    const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return `${relative(process.cwd(), filePath)}:${String(location.line + 1)}:${String(location.character + 1)}`;
  });
}

const input = resolve(optionValue('--file') ?? 'sources');
const files = collectSourceFiles(input);
const findings = files.flatMap(findingsFor);

if (files.length === 0) {
  console.error('Localization validation did not discover a production source file.');
  process.exit(1);
}
if (findings.length > 0) {
  console.error(`Player-facing text must come from sources/i18n:\n${findings.join('\n')}`);
  process.exit(1);
}

console.log(
  `Validated localization boundary in ${String(files.length)} production source file(s).`,
);
