import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadRepositoryPolicyFiles } from './lib/repository-policy-files.mjs';
import { validateRepositoryPolicy } from './lib/repository-policy.mjs';
import {
  policyTransitionDiffArguments,
  validateWorkflowPolicyTransition,
} from './lib/workflow-policy-transition.mjs';

function optionalArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function gitAt(root, arguments_) {
  const result = spawnSync(
    'git',
    ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, '-C', root, ...arguments_],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Git policy comparison failed.');
  return result.stdout.trim();
}

async function workflowSources(root) {
  const entries = await Promise.all(
    [
      ['ci', '.github/workflows/ci.yml'],
      ['merge', '.github/workflows/merge-epic.yml'],
      ['publish', '.github/workflows/publish-tag.yml'],
      ['qualify', '.github/workflows/qualify-media.yml'],
    ].map(async ([kind, path]) => [kind, await readFile(resolve(root, path), 'utf8')]),
  );
  return Object.fromEntries(entries);
}

const {
  settings,
  ruleset,
  tagRuleset,
  tagImmutabilityRuleset,
  workflow,
  mergeWorkflow,
  publishWorkflow,
  qualifyMediaWorkflow,
  approvalPolicy,
  inspectionPolicy,
  authorizationPublisher,
  releasePublisher,
  mediaQualification,
} = await loadRepositoryPolicyFiles();
const repositoryFindings = validateRepositoryPolicy({
  settings,
  ruleset,
  workflow,
  mergeWorkflow,
  publishWorkflow,
  qualifyMediaWorkflow,
  tagRuleset,
  tagImmutabilityRuleset,
  approvalPolicy,
  inspectionPolicy,
  authorizationPublisher,
  releasePublisher,
  mediaQualification,
});
const transition = optionalArgument('--policy-transition');
const trustedRoot = optionalArgument('--trusted-root');
let findings = repositoryFindings;
if (transition !== undefined) {
  if (trustedRoot === undefined) throw new Error('Policy transition requires --trusted-root.');
  const candidateRoot = process.cwd();
  const trustedSha = gitAt(trustedRoot, ['rev-parse', 'HEAD']);
  const changedPaths = gitAt(candidateRoot, policyTransitionDiffArguments(trustedSha))
    .split('\n')
    .filter(Boolean)
    .map((path) => path.replaceAll('\\', '/'));
  findings = validateWorkflowPolicyTransition({
    transition,
    repositoryFindings,
    changedPaths,
    candidate: {
      policySource: await readFile('scripts/lib/repository-policy.mjs', 'utf8'),
      workflows: {
        ci: workflow,
        merge: mergeWorkflow,
        publish: publishWorkflow,
        qualify: qualifyMediaWorkflow,
      },
    },
    trusted: {
      policySource: await readFile(
        resolve(trustedRoot, 'scripts/lib/repository-policy.mjs'),
        'utf8',
      ),
      workflows: await workflowSources(trustedRoot),
    },
  });
}
if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log('Validated repository settings, main ruleset, and required CI workflow.');
