import { createGithubHistoryClient } from './lib/github-history.mjs';
import { validateMergeCandidate } from './lib/merge-policy.mjs';

function requiredEnvironment(name) {
  const value = process.env[name];
  if (value === undefined || value.length === 0)
    throw new Error(`Missing required environment ${name}.`);
  return value;
}

const numberIndex = process.argv.indexOf('--pull-request');
const pullNumber = Number(numberIndex === -1 ? undefined : process.argv[numberIndex + 1]);
if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
  console.error('Usage: merge-epic --pull-request <positive-number>');
  process.exit(2);
}
const repository = requiredEnvironment('GITHUB_REPOSITORY');
const token = requiredEnvironment('GITHUB_TOKEN');
const { checkRunsForCommit, github, pullRequestInput } = createGithubHistoryClient(
  repository,
  token,
);

const pullRequest = await github(`/pulls/${pullNumber}`);
if (pullRequest.base.ref !== 'main' || pullRequest.state !== 'open' || pullRequest.draft) {
  throw new Error(
    'Merge automation accepts only an open, non-draft epic pull request targeting main.',
  );
}
const currentHistory = await pullRequestInput(pullRequest, 'pull-request');
const checks = await checkRunsForCommit(pullRequest.head.sha);
const findings = validateMergeCandidate(currentHistory, checks);
if (findings.length > 0) throw new Error(findings.join('\n'));
const result = await github(`/pulls/${pullNumber}/merge`, {
  method: 'PUT',
  body: JSON.stringify({
    merge_method: 'squash',
    sha: pullRequest.head.sha,
    commit_title: pullRequest.title,
    commit_message: pullRequest.body,
  }),
});
if (result.merged !== true)
  throw new Error(`Provider refused the squash merge: ${result.message}.`);
console.log(`Squash-merged pull request #${pullNumber} at ${result.sha}.`);
