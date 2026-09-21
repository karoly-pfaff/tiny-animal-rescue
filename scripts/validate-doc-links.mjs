import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { listRepositoryFiles, repositoryPath } from './lib/repository-files.mjs';

const markdownFiles = (await listRepositoryFiles()).filter((file) => file.endsWith('.md'));
const headingPattern = /^(?<level>#{1,6})\s+(?<title>.+)$/gmu;
const linkPattern = /!?(?:\[[^\]]*\])\((?<target>[^)]+)\)/gu;
const findings = [];
const documentCache = new Map();

function slugifyHeading(title) {
  return title
    .trim()
    .toLowerCase()
    .replaceAll(/[`*_~]/gu, '')
    .replaceAll(/[^\p{L}\p{N}\s-]/gu, '')
    .replaceAll(/\s+/gu, '-')
    .replaceAll(/-+/gu, '-');
}

async function readDocument(file) {
  if (!documentCache.has(file)) {
    documentCache.set(file, await readFile(file, 'utf8'));
  }
  return documentCache.get(file);
}

async function validateTarget(sourceFile, rawTarget) {
  const target = rawTarget.replaceAll(/^<|>$/gu, '').split(/\s+["']/u, 1)[0];
  if (target === undefined || /^(?:https?:|mailto:)/u.test(target)) {
    return;
  }

  const [relativePath, anchor] = target.split('#', 2);
  const decodedPath = decodeURIComponent(relativePath ?? '');
  const resolved = path.resolve(path.dirname(sourceFile), decodedPath || path.basename(sourceFile));
  let content;

  try {
    content = await readDocument(resolved);
  } catch {
    findings.push(`${repositoryPath(sourceFile)} -> missing ${target}`);
    return;
  }

  if (anchor !== undefined && anchor.length > 0) {
    const anchors = [...content.matchAll(headingPattern)].map((match) =>
      slugifyHeading(match.groups?.title ?? ''),
    );
    if (!anchors.includes(decodeURIComponent(anchor).toLowerCase())) {
      findings.push(`${repositoryPath(sourceFile)} -> missing anchor ${target}`);
    }
  }
}

for (const file of markdownFiles) {
  const content = await readDocument(file);
  for (const match of content.matchAll(linkPattern)) {
    await validateTarget(file, match.groups?.target ?? '');
  }
}

if (markdownFiles.length === 0) {
  findings.push('Documentation validation found no Markdown files.');
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log(`Validated local links in ${markdownFiles.length} Markdown document(s).`);
