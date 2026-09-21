const secretPatterns = [
  ['private key', /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/gu],
  ['GitHub token', /\bgh[opsu]_[A-Za-z0-9]{30,}\b/gu],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/gu],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/gu],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/gu],
];

export function findSecretLabels(content) {
  const labels = [];
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) labels.push(label);
  }
  return labels;
}

export function scanGitHistory({ repositoryDirectory, runGit }) {
  const safeDirectory = repositoryDirectory.replaceAll('\\', '/');
  const args = [
    '-c',
    `safe.directory=${safeDirectory}`,
    'log',
    '--all',
    '--format=%B',
    '--no-color',
    '--no-ext-diff',
    '-p',
    '--',
    '.',
  ];
  return { args, labels: findSecretLabels(runGit(args)) };
}
