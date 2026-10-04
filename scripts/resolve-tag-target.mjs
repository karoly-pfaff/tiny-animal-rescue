import { appendFile } from 'node:fs/promises';
import { createGithubHistoryClient } from './lib/github-history.mjs';
import { git, isAncestor } from './lib/history-repository.mjs';
import {
  validatePolicyAuthority,
  validateTagTargetAncestry,
} from './lib/tag-publication-policy.mjs';
import { requiredEnvironment } from './lib/workflow-input.mjs';

function positiveArgument(name) {
  const index = process.argv.indexOf(name);
  const value = Number(index === -1 ? undefined : process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Missing ${name}.`);
  return value;
}

const pullNumber = positiveArgument('--pull-request');
const repository = requiredEnvironment('GITHUB_REPOSITORY');
const token = requiredEnvironment('GITHUB_TOKEN');
const workflowRef = requiredEnvironment('GITHUB_REF');
const workflowSha = requiredEnvironment('GITHUB_SHA');
const output = requiredEnvironment('GITHUB_OUTPUT');
const { github } = createGithubHistoryClient(repository, token);
const [pullRequest, mainReference] = await Promise.all([
  github(`/pulls/${pullNumber}`),
  github('/git/ref/heads/main'),
]);
if (pullRequest.merged !== true || pullRequest.merge_commit_sha === null) {
  throw new Error('Tag publication accepts only a merged canonical pull request.');
}
const policySha = git(['rev-parse', 'HEAD']);
const targetSha = pullRequest.merge_commit_sha;
const findings = [
  ...validatePolicyAuthority({
    workflowRef,
    workflowSha,
    policySha,
    protectedMainSha: mainReference.object.sha,
  }),
  ...validateTagTargetAncestry({
    targetSha,
    policySha,
    targetIsAncestor: isAncestor(targetSha, policySha),
  }),
];
if (findings.length > 0) throw new Error(findings.join('\n'));
await appendFile(output, `squash_sha=${targetSha}\n`);
console.log(`Resolved release target ${targetSha} from current protected policy ${policySha}.`);
