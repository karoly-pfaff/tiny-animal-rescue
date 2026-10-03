export function selectMarkdownFiles(files) {
  return files.filter((file) => file.toLowerCase().endsWith('.md'));
}

export function formatMarkdownlintResults(results, displayPath) {
  const findings = [];

  for (const [file, errors] of Object.entries(results)) {
    for (const error of errors) {
      const column = error.errorRange?.[0];
      const location = `${displayPath(file)}:${error.lineNumber}${column ? `:${column}` : ''}`;
      const rule = error.ruleNames.join('/');
      const detail = error.errorDetail ?? error.errorContext;
      findings.push(`${location} ${rule} ${error.ruleDescription}${detail ? ` [${detail}]` : ''}`);
    }
  }

  return findings;
}
