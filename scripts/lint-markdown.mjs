import { lint } from 'markdownlint/promise';
import config from '../markdownlint.config.mjs';
import { formatMarkdownlintResults, selectMarkdownFiles } from './lib/markdown-lint.mjs';
import { listRepositoryFiles, repositoryPath } from './lib/repository-files.mjs';

const files = selectMarkdownFiles(await listRepositoryFiles());

if (files.length === 0) {
  console.error('Markdown lint found no Markdown documents.');
  process.exitCode = 1;
} else {
  const results = await lint({ config, files });
  const findings = formatMarkdownlintResults(results, repositoryPath);

  if (findings.length > 0) {
    console.error(findings.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Linted ${files.length} Markdown document(s).`);
  }
}
