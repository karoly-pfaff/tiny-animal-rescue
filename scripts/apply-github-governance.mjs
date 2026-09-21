import { readFile } from 'node:fs/promises';
import { validateRepositoryPolicy } from './lib/repository-policy.mjs';

function requiredEnvironment(name) {
  const value = process.env[name];
  if (value === undefined || value.length === 0)
    throw new Error(`Missing required environment ${name}.`);
  return value;
}

const repository = requiredEnvironment('GITHUB_REPOSITORY');
const token = requiredEnvironment('GITHUB_TOKEN');
const [settings, ruleset, workflow] = await Promise.all([
  readFile('deploy/github/repository-settings.json', 'utf8').then(JSON.parse),
  readFile('deploy/github/main-ruleset.json', 'utf8').then(JSON.parse),
  readFile('.github/workflows/ci.yml', 'utf8'),
]);

async function github(pathname, method = 'GET', body) {
  const response = await fetch(`https://api.github.com/repos/${repository}${pathname}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`GitHub API ${method} ${pathname} failed with ${response.status}.`);
  return response.json();
}

await github('', 'PATCH', settings);
const rulesets = await github('/rulesets');
const existing = rulesets.find((candidate) => candidate.name === ruleset.name);
const applied =
  existing === undefined
    ? await github('/rulesets', 'POST', ruleset)
    : await github(`/rulesets/${existing.id}`, 'PUT', ruleset);
const repositoryState = await github('');
const hostedRuleset = await github(`/rulesets/${applied.id}`);
const findings = validateRepositoryPolicy({
  settings: repositoryState,
  ruleset: hostedRuleset,
  workflow,
});
if (findings.length > 0) throw new Error(findings.join('\n'));
console.log(`Applied and verified ${ruleset.name} governance for ${repository}.`);
