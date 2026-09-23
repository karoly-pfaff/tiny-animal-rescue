import { workItemFromBranch } from './history-repository.mjs';

function messageParts(message) {
  const [subject = '', ...body] = message.split('\n');
  return { subject, body: body.join('\n').trim() };
}

export function canonicalPullCount(pulls, branch) {
  return pulls.filter((candidate) => candidate.head.ref === branch).length;
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

function taggedValue(message, label, pattern) {
  const match = new RegExp(`^${label}: (?<value>${pattern})$`, 'mu').exec(message);
  return match === null ? '' : match.groups.value;
}

function taggedNumber(message, label) {
  const match = new RegExp(`^${label}: #(?<value>\\d+)$`, 'mu').exec(message);
  return Number(match === null ? undefined : match.groups.value);
}

export function deriveTagEvidence({
  annotated,
  tagName,
  message,
  targetSha,
  observedArtifactDigest,
  observedAssetInventoryDigest,
  approval,
  mergeApproval,
  inspection,
  approver,
  treeMatchesInspectedHead,
  repository,
  requiredLocales,
  requiredInputs,
  requiredViewports,
  artifactNamePrefix,
  artifactWorkflowPath,
  artifactWorkflowEvent,
  artifactWorkflowBranch,
  artifactWorkflowHeadSha,
}) {
  return {
    annotated,
    name: tagName,
    message,
    targetSha,
    squashSha: taggedValue(message, 'Squash', '[0-9a-f]{40}'),
    artifactDigest: taggedValue(message, 'Artifact-Digest', 'sha256:[0-9a-f]{64}'),
    assetInventoryDigest: taggedValue(message, 'Asset-Inventory-Digest', 'sha256:[0-9a-f]{64}'),
    inspectionCommentId: taggedNumber(message, 'Inspection-Comment'),
    mergeApprovalCommentId: taggedNumber(message, 'Merge-Approval-Comment'),
    approvalCommentId: taggedNumber(message, 'Approval-Comment'),
    approval,
    mergeApproval,
    inspection,
    approver,
    observedArtifactDigest,
    observedAssetInventoryDigest,
    treeMatchesInspectedHead,
    repository,
    requiredLocales,
    requiredInputs,
    requiredViewports,
    artifactNamePrefix,
    artifactWorkflowPath,
    artifactWorkflowEvent,
    artifactWorkflowBranch,
    artifactWorkflowHeadSha,
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

async function fetchAllWorkflowRuns({ github, workflowId, commitSha, event }) {
  const runs = [];
  let page = 1;
  while (true) {
    const query = new URLSearchParams({
      head_sha: commitSha,
      event,
      per_page: '100',
      page: String(page),
    });
    const response = await github(`/actions/workflows/${workflowId}/runs?${query}`);
    runs.push(...response.workflow_runs);
    if (response.workflow_runs.length < 100) return runs;
    page += 1;
  }
}

function normalizeQualityRun(run, workflow) {
  return {
    id: run.id,
    workflowId: run.workflow_id,
    workflowPath: workflow.path,
    workflowState: workflow.state,
    checkSuiteId: run.check_suite_id,
    headSha: run.head_sha,
    headBranch: run.head_branch,
    path: run.path,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    runNumber: run.run_number,
    runAttempt: run.run_attempt,
  };
}

export async function fetchTrustedQualityChecks({
  github,
  commitSha,
  event,
  headBranch,
  workflowPath = '.github/workflows/ci.yml',
  workflowRef = 'main',
}) {
  const workflowFile = workflowPath.split('/').at(-1);
  const workflow = await github(`/actions/workflows/${encodeURIComponent(workflowFile)}`);
  const [checkRuns, runs] = await Promise.all([
    fetchAllCheckRuns({ github, commitSha }),
    fetchAllWorkflowRuns({ github, workflowId: workflow.id, commitSha, event }),
  ]);
  const runsBySuite = new Map(
    runs.map((run) => [run.check_suite_id, normalizeQualityRun(run, workflow)]),
  );
  const workflowRuns = runs.map((run) => normalizeQualityRun(run, workflow));
  return {
    checkRuns: checkRuns.map((check) => ({
      ...check,
      workflowRun: runsBySuite.get(check.check_suite?.id),
    })),
    workflowRuns,
    expectation: {
      commitSha,
      event,
      headBranch,
      workflowId: workflow.id,
      workflowPath,
      workflowRef,
    },
  };
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
  const trustedQualityChecksForCommit = (commitSha, event, headBranch) =>
    fetchTrustedQualityChecks({ github, commitSha, event, headBranch });

  async function pullRequestInput(pullRequest, mode) {
    const item = workItemFromBranch(pullRequest.head.ref);
    const [commits, allPulls] = await Promise.all([
      github(`/pulls/${pullRequest.number}/commits?per_page=100`),
      allPullRequests(),
    ]);
    return {
      mode,
      branch: pullRequest.head.ref,
      item,
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
        canonicalCount: canonicalPullCount(allPulls, item.branch),
      },
    };
  }

  return { checkRunsForCommit, github, pullRequestInput, trustedQualityChecksForCommit };
}
