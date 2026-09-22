import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const forbiddenText = [
  ['absolute Windows development path', /[A-Z]:\\Users\\/gu],
  ['development endpoint', /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gu],
  ['debugger statement', /\bdebugger\b/gu],
];

const allowedAbsoluteReferences = new Set([
  'https://react.dev/errors/',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/1998/Math/MathML',
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/XML/1998/namespace',
]);

async function walkArtifact(directory, files, findings) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      findings.push(`${target}: symbolic links are forbidden in production artifacts.`);
    } else if (entry.isDirectory()) {
      await walkArtifact(target, files, findings);
    } else if (entry.isFile()) {
      files.push(target);
    } else {
      findings.push(`${target}: non-regular artifact entry is forbidden.`);
    }
  }
}

export async function enumerateArtifactFiles(root) {
  const files = [];
  const findings = [];
  const rootStat = await lstat(root);
  if (rootStat.isSymbolicLink()) {
    return { files, findings: [`${root}: symbolic artifact roots are forbidden.`] };
  }
  if (!rootStat.isDirectory()) {
    return { files, findings: [`${root}: artifact root must be a directory.`] };
  }
  await walkArtifact(root, files, findings);
  return { files, findings };
}

function runtimeNetworkFindings(content, logicalPath) {
  const findings = [];
  const urls = content.match(/https?:\/\/[^\s"'`<>\\)]+/giu) ?? [];
  for (const url of urls) {
    if (!allowedAbsoluteReferences.has(url)) {
      findings.push(`${logicalPath}: unapproved absolute runtime URL ${url}.`);
    }
  }
  if (/\bdata:(?:audio|image|video)\//iu.test(content)) {
    findings.push(`${logicalPath}: embedded data media URL is forbidden.`);
  }
  if (/["'`](?:\/\/)[A-Za-z0-9.-]+/u.test(content)) {
    findings.push(`${logicalPath}: protocol-relative runtime URL is forbidden.`);
  }
  return findings;
}

export async function analyzeArtifact(root = '.') {
  const artifactRoot = path.resolve(root, 'build/app');
  let files;
  let entryFindings;
  try {
    ({ files, findings: entryFindings } = await enumerateArtifactFiles(artifactRoot));
  } catch {
    return { findings: ['Production artifact is missing. Run npm run build first.'] };
  }

  const findings = [...entryFindings];
  const digest = createHash('sha256');
  const relativeFiles = files.map((file) =>
    path.relative(artifactRoot, file).replaceAll('\\', '/'),
  );
  if (files.length === 0 || !relativeFiles.some((file) => path.basename(file) === 'index.html')) {
    findings.push('Production artifact is empty or has no index.html.');
  }

  for (const [index, file] of files.entries()) {
    const logicalPath = `build/app/${relativeFiles[index]}`;
    const data = await readFile(file);
    digest.update(logicalPath).update('\0').update(data);
    if (/\.map$/iu.test(file)) findings.push(`${logicalPath}: public source maps are forbidden.`);
    if (/\.(?:html|[cm]?js|css|json|txt)$/iu.test(file)) {
      const content = data.toString('utf8');
      for (const [label, pattern] of forbiddenText) {
        pattern.lastIndex = 0;
        if (pattern.test(content)) findings.push(`${logicalPath}: ${label}.`);
      }
      findings.push(...runtimeNetworkFindings(content, logicalPath));
    }
  }

  return {
    findings,
    report: {
      algorithm: 'sha256',
      digest: digest.digest('hex'),
      fileCount: files.length,
    },
  };
}
