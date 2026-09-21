import { epicFromBranch } from './history-repository.mjs';

function messageParts(message) {
  const [subject = '', ...body] = message.split('\n');
  return { subject, body: body.join('\n').trim() };
}

export function canonicalPullCount(pulls, epicNumber) {
  return pulls.filter((candidate) =>
    new RegExp(`^epic/${epicNumber}-[a-z0-9]+(?:-[a-z0-9]+)*$`, 'u').test(candidate.head.ref),
  ).length;
}

export function deriveQueueEvidence({
  associatedPullNumbers,
  pullNumber,
  approvedHeadIsAncestor,
  approvedPatch,
  queuedPatch,
}) {
  return {
    associatedPullRequests: associatedPullNumbers.length,
    containsHead: associatedPullNumbers.includes(pullNumber) && approvedHeadIsAncestor,
    unrelatedChanges: associatedPullNumbers.length !== 1 || approvedPatch !== queuedPatch,
  };
}

export function deriveMainEvidence({ pushedCommits, parentCounts, treeMatchesApprovedHead }) {
  return {
    newCommits: pushedCommits.map((commit) => ({
      ...commit,
      parentCount: parentCounts[commit.sha],
    })),
    treeMatchesApprovedHead,
  };
}

export function deriveTagEvidence({
  annotated,
  tagName,
  message,
  targetSha,
  observedArtifactDigest,
}) {
  return {
    annotated,
    name: tagName,
    message,
    targetSha,
    squashSha: /^Squash: (?<sha>[0-9a-f]{40})$/mu.exec(message)?.groups?.sha ?? '',
    artifactDigest:
      /^Artifact-Digest: (?<digest>sha256:[0-9a-f]{64})$/mu.exec(message)?.groups?.digest ?? '',
    observedArtifactDigest,
  };
}

export async function fetchAllCheckRuns({ github, commitSha }) {
  const checkRuns = [];
  let page = 1;
  while (true) {
    const response = await github(
      `/commits/${commitSha}/check-runs?filter=all&per_page=100&page=${page}`,
    );
    checkRuns.push(...response.check_runs);
    if (response.check_runs.length < 100) return checkRuns;
    page += 1;
  }
}

export function createGithubHistoryClient(repository, token) {
  async function github(pathname, options = {}) {
    const response = await fetch(`https://api.github.com/repos/${repository}${pathname}`, {
      ...options,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${pathname} failed with ${response.status}.`);
    return response.json();
  }

  async function allPullRequests(page = 1, collected = []) {
    const pulls = await github(`/pulls?state=all&base=main&per_page=100&page=${page}`);
    const combined = [...collected, ...pulls];
    return pulls.length === 100 ? allPullRequests(page + 1, combined) : combined;
  }

  const checkRunsForCommit = (commitSha) => fetchAllCheckRuns({ github, commitSha });

  async function pullRequestInput(pullRequest, mode) {
    const epic = epicFromBranch(pullRequest.head.ref);
    const [commits, allPulls] = await Promise.all([
      github(`/pulls/${pullRequest.number}/commits?per_page=100`),
      allPullRequests(),
    ]);
    return {
      mode,
      branch: pullRequest.head.ref,
      epic,
      commits: commits.map((commit) => ({
        sha: commit.sha,
        ...messageParts(commit.commit.message),
      })),
      mergeCommitCount: commits.filter((commit) => commit.parents.length > 1).length,
      headSha: pullRequest.head.sha,
      pullRequest: {
        number: pullRequest.number,
        url: pullRequest.html_url,
        title: pullRequest.title,
        body: pullRequest.body ?? '',
        base: pullRequest.base.ref,
        headSha: pullRequest.head.sha,
        canonicalCount: canonicalPullCount(allPulls, epic.number),
      },
    };
  }

  return { checkRunsForCommit, github, pullRequestInput };
}
