import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  createGithubHistoryClient,
  deriveMainEvidence,
  deriveQueueEvidence,
  deriveTagEvidence,
} from './lib/github-history.mjs';
import { commitsBetween, git, isAncestor } from './lib/history-repository.mjs';
import { validateHistoryPolicy } from './lib/history-policy.mjs';

function requiredEnvironment(name) {
  const value = process.env[name];
  if (value === undefined || value.length === 0)
    throw new Error(`Missing required CI environment ${name}.`);
  return value;
}

const repository = requiredEnvironment('GITHUB_REPOSITORY');
const token = requiredEnvironment('GITHUB_TOKEN');
const eventName = requiredEnvironment('GITHUB_EVENT_NAME');
const event = JSON.parse(await readFile(requiredEnvironment('GITHUB_EVENT_PATH'), 'utf8'));
const { github, pullRequestInput } = createGithubHistoryClient(repository, token);

async function pullRequestMode() {
  if (event.pull_request === undefined)
    throw new Error('pull_request event payload is incomplete.');
  return pullRequestInput(event.pull_request, 'pull-request');
}

async function mergeQueueMode() {
  const group = event.merge_group;
  if (group === undefined) throw new Error('merge_group event payload is incomplete.');
  const associated = await github(`/commits/${group.head_sha}/pulls`);
  if (associated.length !== 1)
    throw new Error('Merge-group candidate must resolve to exactly one pull request.');
  const pullRequest = await github(`/pulls/${associated[0].number}`);
  const input = await pullRequestInput(pullRequest, 'merge-queue');
  input.queue = deriveQueueEvidence({
    associatedPullNumbers: associated.map((candidate) => candidate.number),
    pullNumber: pullRequest.number,
    approvedHeadIsAncestor: isAncestor(pullRequest.head.sha, group.head_sha),
    approvedPatch: git([
      'diff',
      '--binary',
      '--full-index',
      '--no-color',
      pullRequest.base.sha,
      pullRequest.head.sha,
    ]),
    queuedPatch: git([
      'diff',
      '--binary',
      '--full-index',
      '--no-color',
      group.base_sha,
      group.head_sha,
    ]),
  });
  return input;
}

async function mainMode() {
  const associated = await github(`/commits/${event.after}/pulls`);
  if (associated.length !== 1)
    throw new Error('Main squash must resolve to exactly one pull request.');
  const pullRequest = await github(`/pulls/${associated[0].number}`);
  const input = await pullRequestInput(pullRequest, 'main');
  const [mainCommit, approvedHead] = await Promise.all([
    github(`/commits/${event.after}`),
    github(`/commits/${pullRequest.head.sha}`),
  ]);
  const pushedCommits = commitsBetween(event.before, event.after);
  input.main = deriveMainEvidence({
    pushedCommits,
    parentCounts: Object.fromEntries(
      pushedCommits.map((commit) => [
        commit.sha,
        git(['rev-list', '--parents', '-n', '1', commit.sha]).split(' ').length - 1,
      ]),
    ),
    treeMatchesApprovedHead: mainCommit.commit.tree.sha === approvedHead.commit.tree.sha,
  });
  return input;
}

async function tagMode() {
  const tagName = event.ref.replace('refs/tags/', '');
  const message = git(['for-each-ref', `refs/tags/${tagName}`, '--format=%(contents)']).trim();
  const pullNumber = Number(/^Pull-Request: #(?<number>\d+)$/mu.exec(message)?.groups?.number);
  if (!Number.isInteger(pullNumber))
    throw new Error('Annotated tag crosswalk has no pull-request identity.');
  const pullRequest = await github(`/pulls/${pullNumber}`);
  const input = await pullRequestInput(pullRequest, 'tag');
  const artifact = JSON.parse(await readFile('build/reports/artifact-integrity.json', 'utf8'));
  input.tag = deriveTagEvidence({
    annotated: git(['cat-file', '-t', `refs/tags/${tagName}`]) === 'tag',
    tagName,
    message,
    targetSha: git(['rev-list', '-n', '1', `refs/tags/${tagName}`]),
    observedArtifactDigest: `sha256:${artifact.digest}`,
  });
  return input;
}

let input;
if (eventName === 'pull_request') input = await pullRequestMode();
else if (eventName === 'merge_group') input = await mergeQueueMode();
else if (eventName === 'push' && event.ref === 'refs/heads/main') input = await mainMode();
else if (eventName === 'push' && event.ref.startsWith('refs/tags/')) input = await tagMode();
else throw new Error(`Unsupported history event ${eventName}:${event.ref ?? '(no ref)'}.`);

await mkdir('artifacts/history', { recursive: true });
await writeFile('artifacts/history/input.json', `${JSON.stringify(input, null, 2)}\n`);
const findings = validateHistoryPolicy(input);
if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log(`Validated provider-backed history in ${input.mode} mode.`);
