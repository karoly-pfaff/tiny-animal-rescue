import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { expectedApprovalBody } from './lib/approval-policy.mjs';
import { commitlintSubjectCase } from './lib/commit-subject-policy.mjs';
import {
  canonicalPullCount,
  deriveMainEvidence,
  deriveQueueEvidence,
  deriveTagEvidence,
  fetchAllCheckRuns,
  fetchTrustedQualityChecks,
} from './lib/github-history.mjs';
import { generateSquashMessage, validateHistoryPolicy } from './lib/history-policy.mjs';
import { tagRevisions, workItemFromBranch } from './lib/history-repository.mjs';
import { expectedInspectionBody } from './lib/inspection-policy.mjs';
import {
  validateCurrentMainAncestry,
  validateEvidenceVersion,
  validateMergeCandidate,
  validateMergeSnapshot,
  validateRequiredQualityChecks,
} from './lib/merge-policy.mjs';
import { npmProcess } from './lib/npm-process.mjs';
import {
  fetchAllDeployKeys,
  fetchAllRepositorySecrets,
  qualityChecks,
  validateHostedAuthorizationPublisher,
  validateHostedMediaQualification,
  validateHostedReleasePublisher,
  validateHostedSecretIsolation,
  validateRepositoryPolicy,
} from './lib/repository-policy.mjs';
import { scanGitHistory } from './lib/secret-policy.mjs';
import { validateWatermarkRecord } from './lib/watermark-policy.mjs';

const readJson = (path) => readFile(path, 'utf8').then(JSON.parse);
const [
  cases,
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
] = await Promise.all([
  readJson('tests/fixtures/governance/governance-cases.json'),
  readJson('deploy/github/repository-settings.json'),
  readJson('deploy/github/main-ruleset.json'),
  readJson('deploy/github/tag-ruleset.json'),
  readJson('deploy/github/tag-immutability-ruleset.json'),
  readFile('.github/workflows/ci.yml', 'utf8'),
  readFile('.github/workflows/merge-epic.yml', 'utf8'),
  readFile('.github/workflows/publish-tag.yml', 'utf8'),
  readFile('.github/workflows/qualify-media.yml', 'utf8'),
  readJson('deploy/github/approval-policy.json'),
  readJson('deploy/github/inspection-policy.json'),
  readJson('deploy/github/authorization-publisher.json'),
  readJson('deploy/github/release-publisher.json'),
  readJson('deploy/github/media-qualification.json'),
]);
const clone = (value) => structuredClone(value);
const failures = [];
const approvalTimestamp = '2026-09-22T05:00:00Z';

const fixtureInspectionDetails = {
  browser: 'Chromium 142',
  locales: 'hu,en',
  inputs: 'mouse,touch',
  viewports: inspectionPolicy.requiredViewports.join(','),
  journeys: 'start,map,mission,shelter',
  evidence: 'https://github.com/karoly-pfaff/tiny-animal-rescue/actions/runs/123/artifacts/456',
  inspector: 'Codex',
  timestamp: '2026-09-22T05:00:00Z',
};

function fixtureInspectionRecord(input, expectation) {
  const artifactName = [
    expectation.artifactNamePrefix.replace(/-$/u, ''),
    expectation.targetSha,
    expectation.artifactDigest.slice('sha256:'.length),
    expectation.assetInventoryDigest.slice('sha256:'.length),
  ].join('-');
  return {
    id: expectation.commentId,
    issueNumber: input.pullRequest.number,
    authorLogin: approvalPolicy.approver,
    authorType: 'User',
    authorAssociation: 'OWNER',
    body: expectedInspectionBody(expectation, {
      ...fixtureInspectionDetails,
      locales: expectation.requiredLocales.join(','),
      inputs: expectation.requiredInputs.join(','),
      viewports: expectation.requiredViewports.join(','),
      journeys: expectation.requiredJourneys.join(','),
    }),
    url: `https://github.com/karoly-pfaff/tiny-animal-rescue/pull/7#issuecomment-${expectation.commentId}`,
    artifact: {
      id: 456,
      name: artifactName,
      sizeInBytes: 4096,
      expired: false,
      workflowRun: { id: 123, headSha: 'a'.repeat(40) },
      run: {
        id: 123,
        event: expectation.artifactWorkflowEvent,
        path: expectation.artifactWorkflowPath,
        headBranch: expectation.artifactWorkflowBranch,
        headSha: 'a'.repeat(40),
        status: 'completed',
        conclusion: 'success',
        workflowId: 77,
      },
      workflow: { id: 77, path: expectation.artifactWorkflowPath, state: 'active' },
    },
  };
}

function fixtureApprovalRecord({
  input,
  id,
  operation,
  targetSha,
  inspectionCommentId,
  artifactDigest,
  assetInventoryDigest,
}) {
  return {
    id,
    issueNumber: input.pullRequest.number,
    authorLogin: approvalPolicy.approver,
    authorType: 'User',
    authorAssociation: 'OWNER',
    body: expectedApprovalBody({
      operation,
      commentId: id,
      pullNumber: input.pullRequest.number,
      targetSha,
      version: input.item.version,
      inspectionCommentId,
      artifactDigest,
      assetInventoryDigest,
      approver: approvalPolicy.approver,
    }),
    url: `https://github.com/karoly-pfaff/tiny-animal-rescue/pull/7#issuecomment-${id}`,
    createdAt: approvalTimestamp,
    updatedAt: approvalTimestamp,
  };
}

function tagBaseline(input, message) {
  const tag = {
    annotated: true,
    name: `v${input.item.version}`,
    targetSha: '3'.repeat(40),
    squashSha: '3'.repeat(40),
    artifactDigest: `sha256:${'4'.repeat(64)}`,
    assetInventoryDigest: `sha256:${'5'.repeat(64)}`,
    observedArtifactDigest: `sha256:${'4'.repeat(64)}`,
    observedAssetInventoryDigest: `sha256:${'5'.repeat(64)}`,
    treeMatchesInspectedHead: true,
    inspectionCommentId: 88,
    mergeApprovalCommentId: 98,
    approvalCommentId: 99,
    approver: approvalPolicy.approver,
    repository: 'karoly-pfaff/tiny-animal-rescue',
    requiredLocales: inspectionPolicy.requiredLocales,
    requiredInputs: inspectionPolicy.requiredInputs,
    requiredViewports: inspectionPolicy.requiredViewports,
    artifactNamePrefix: inspectionPolicy.artifactNamePrefix,
    artifactWorkflowPath: inspectionPolicy.artifactWorkflowPath,
    artifactWorkflowEvent: inspectionPolicy.artifactWorkflowEvent,
    artifactWorkflowBranch: inspectionPolicy.artifactWorkflowBranch,
    artifactWorkflowHeadSha: 'a'.repeat(40),
  };
  tag.approval = fixtureApprovalRecord({
    input,
    id: tag.approvalCommentId,
    operation: 'tag',
    targetSha: tag.squashSha,
    inspectionCommentId: tag.inspectionCommentId,
    artifactDigest: tag.artifactDigest,
    assetInventoryDigest: tag.assetInventoryDigest,
  });
  tag.mergeApproval = fixtureApprovalRecord({
    input,
    id: tag.mergeApprovalCommentId,
    operation: 'merge',
    targetSha: input.pullRequest.headSha,
    inspectionCommentId: tag.inspectionCommentId,
  });
  tag.inspection = fixtureInspectionRecord(input, {
    commentId: tag.inspectionCommentId,
    pullNumber: input.pullRequest.number,
    targetSha: input.pullRequest.headSha,
    version: input.item.version,
    ownerLogin: approvalPolicy.approver,
    artifactDigest: tag.artifactDigest,
    assetInventoryDigest: tag.assetInventoryDigest,
    repository: tag.repository,
    requiredLocales: tag.requiredLocales,
    requiredInputs: tag.requiredInputs,
    requiredViewports: tag.requiredViewports,
    requiredJourneys: input.item.inspectionJourneys,
    artifactNamePrefix: tag.artifactNamePrefix,
    artifactWorkflowPath: tag.artifactWorkflowPath,
    artifactWorkflowEvent: tag.artifactWorkflowEvent,
    artifactWorkflowBranch: tag.artifactWorkflowBranch,
    artifactWorkflowHeadSha: tag.artifactWorkflowHeadSha,
  });
  tag.message = [
    message.body,
    `Merge-Approval-Comment: #${tag.mergeApprovalCommentId}`,
    `Inspection-Comment: #${tag.inspectionCommentId}`,
    `Approval-Comment: #${tag.approvalCommentId}`,
    `Squash: ${tag.squashSha}`,
    `Artifact-Digest: ${tag.artifactDigest}`,
    `Asset-Inventory-Digest: ${tag.assetInventoryDigest}`,
  ].join('\n');
  return tag;
}

function historyBaseline(mode) {
  const input = {
    mode,
    branch: 'epic/042-fixture-epic',
    item: {
      kind: 'epic',
      id: 'EPIC-042',
      number: '042',
      title: 'Fixture epic',
      milestone: 'M42',
      version: '0.43.0',
      aggregateGate: 'validate:full',
      branch: 'epic/042-fixture-epic',
      commitType: 'feat',
      publishesRelease: true,
      requiresInspection: true,
      inspectionJourneys: ['start', 'map', 'mission', 'shelter'],
      stories: ['E042-S01', 'E042-S02'],
    },
    commits: [
      {
        sha: '1'.repeat(40),
        scope: 'E042-S01',
        subject: 'feat(E042-S01): add fixture one',
        body: '',
      },
      {
        sha: '2'.repeat(40),
        scope: 'E042-S02',
        subject: 'test(E042-S02): add fixture two',
        body: '',
      },
    ],
    mergeCommitCount: 0,
    requireComplete: true,
    headSha: '2'.repeat(40),
    pullRequest: {
      number: 7,
      url: 'https://github.com/karoly-pfaff/tiny-animal-rescue/pull/7',
      title: '',
      body: '',
      base: 'main',
      headSha: '2'.repeat(40),
      canonicalCount: 1,
    },
  };
  const message = generateSquashMessage(input);
  input.pullRequest.title = message.title;
  input.pullRequest.body = message.body;
  input.queue = { associatedPullRequests: 1, containsHead: true, unrelatedChanges: false };
  input.main = {
    newCommits: [
      { sha: '3'.repeat(40), subject: message.title, body: message.body, parentCount: 1 },
    ],
    treeMatchesApprovedHead: true,
  };
  input.main.newCommits[0].body += '\nMerge-Approval-Comment: #98';
  input.tag = tagBaseline(input, message);
  return input;
}

function maintenanceBaseline(item, mode) {
  const input = {
    mode,
    branch: item.branch,
    item,
    commits: [
      {
        sha: '1'.repeat(40),
        scope: item.id,
        subject: `${item.commitType}(${item.id}): ${item.title.toLowerCase()}`,
        body: '',
      },
    ],
    mergeCommitCount: 0,
    requireComplete: true,
    headSha: '1'.repeat(40),
    pullRequest: {
      number: 8,
      url: 'https://github.com/karoly-pfaff/tiny-animal-rescue/pull/8',
      title: '',
      body: '',
      base: 'main',
      headSha: '1'.repeat(40),
      canonicalCount: 1,
    },
  };
  const message = generateSquashMessage(input);
  input.pullRequest.title = message.title;
  input.pullRequest.body = message.body;
  input.main = {
    newCommits: [
      { sha: '3'.repeat(40), subject: message.title, body: message.body, parentCount: 1 },
    ],
    treeMatchesApprovedHead: true,
  };
  input.main.newCommits[0].body += '\nMerge-Approval-Comment: #98';
  input.tag = tagBaseline(input, message);
  return input;
}

function mutateHistory(input, mutation) {
  const closure = {
    sha: '5'.repeat(40),
    scope: 'EPIC-042',
    subject: 'chore(EPIC-042): close milestone M42',
    body: '',
  };
  const mutations = {
    none: () => undefined,
    closure: () => input.commits.push(closure),
    'duplicate-story': () => input.commits.push(clone(input.commits[0])),
    'two-closures': () => input.commits.push(closure, { ...closure, sha: '6'.repeat(40) }),
    'second-pr': () => (input.pullRequest.canonicalCount = 2),
    'story-map': () =>
      (input.pullRequest.body = input.pullRequest.body.replace('1'.repeat(40), '9'.repeat(40))),
    'queue-unrelated': () => (input.queue.unrelatedChanges = true),
    'queue-head': () => (input.queue.containsHead = false),
    'main-count': () => input.main.newCommits.push(clone(input.main.newCommits[0])),
    'main-tree': () => (input.main.treeMatchesApprovedHead = false),
    'main-parent': () => (input.main.newCommits[0].parentCount = 2),
    'tag-lightweight': () => (input.tag.annotated = false),
    'tag-version': () => (input.tag.name = 'v0.43.1'),
    'tag-digest': () => (input.tag.artifactDigest = 'sha256:nope'),
    'tag-observed': () => (input.tag.observedArtifactDigest = `sha256:${'8'.repeat(64)}`),
    'tag-approval-absent': () => (input.tag.approval = undefined),
    'tag-reused-approval': () => {
      input.tag.approvalCommentId = input.tag.mergeApprovalCommentId;
      input.tag.approval = clone(input.tag.mergeApproval);
    },
    'tag-merge-approval-edited': () => (input.tag.mergeApproval.updatedAt = '2026-09-22T05:01:00Z'),
    'tag-inspection-absent': () => (input.tag.inspection = undefined),
    'tag-tree': () => (input.tag.treeMatchesInspectedHead = false),
  };
  mutations[mutation]();
}

function record(name, valid, findings) {
  if ((findings.length === 0) !== valid)
    failures.push(`${name}: expected valid=${valid}, got ${findings.join(' | ') || 'valid'}.`);
}

function commitlintCommandFindings(subject) {
  const invocation = npmProcess(['run', 'commitlint:raw', '--', '--verbose']);
  const result = spawnSync(invocation.command, invocation.arguments, {
    encoding: 'utf8',
    input: `${subject}\n`,
  });
  return result.status === 0
    ? []
    : [(result.stdout + result.stderr).trim() || `commitlint exited ${result.status}`];
}

function fixtureQualityExpectation(input) {
  return {
    commitSha: input.headSha,
    event: input.mode === 'main' ? 'push' : 'pull_request',
    headBranch: input.mode === 'main' ? 'main' : input.branch,
    workflowId: 42,
    workflowPath: '.github/workflows/ci.yml',
    workflowRef: 'main',
  };
}

function fixtureCheckRuns(mutation, expectation) {
  const workflowRun = (suiteId, runNumber, conclusion = 'success') => ({
    id: runNumber,
    workflowId: expectation.workflowId,
    workflowPath: expectation.workflowPath,
    workflowState: 'active',
    checkSuiteId: suiteId,
    headSha: expectation.commitSha,
    headBranch: expectation.headBranch,
    path: expectation.workflowPath,
    event: expectation.event,
    status: 'completed',
    conclusion,
    runNumber,
    runAttempt: 1,
  });
  const checks = qualityChecks.map((name) => ({
    id: 200,
    name,
    head_sha: expectation.commitSha,
    status: 'completed',
    conclusion: mutation === 'check' && name === 'security' ? 'failure' : 'success',
    check_suite: { id: 20 },
    workflowRun: workflowRun(
      20,
      20,
      ['check', 'forged-workflow'].includes(mutation) ? 'failure' : 'success',
    ),
  }));
  if (mutation === 'new-suite') {
    checks.push(
      ...qualityChecks.map((name) => ({
        id: 100,
        name,
        head_sha: expectation.commitSha,
        status: 'completed',
        conclusion: name === 'history' ? 'failure' : 'success',
        check_suite: { id: 10 },
        workflowRun: workflowRun(10, 10, 'failure'),
      })),
    );
  }
  if (mutation === 'forged-workflow') {
    checks.push(
      ...qualityChecks.map((name) => ({
        id: 300,
        name,
        head_sha: expectation.commitSha,
        status: 'completed',
        conclusion: 'success',
        check_suite: { id: 30 },
        workflowRun: {
          ...workflowRun(30, 30),
          workflowId: 99,
          workflowPath: '.github/workflows/forged.yml',
          path: '.github/workflows/forged.yml',
        },
      })),
    );
    checks.find((check) => check.check_suite.id === 20 && check.name === 'security').conclusion =
      'failure';
  }
  if (mutation === 'same-suite-retry') {
    checks.push({
      id: 201,
      name: 'history',
      head_sha: expectation.commitSha,
      status: 'completed',
      conclusion: 'success',
      check_suite: { id: 20 },
      workflowRun: workflowRun(20, 20),
    });
  }
  return checks;
}

function fixtureWorkflowRuns(mutation, checks, expectation) {
  const runs = [
    ...new Map(
      checks
        .map((check) => check.workflowRun)
        .filter((run) => run.workflowId === expectation.workflowId)
        .map((run) => [run.id, run]),
    ).values(),
  ];
  if (mutation === 'newer-failed-run') {
    runs.push({
      ...runs[0],
      id: 30,
      checkSuiteId: 30,
      runNumber: 30,
      conclusion: 'failure',
    });
  }
  if (mutation === 'newer-pending-run') {
    runs.push({
      ...runs[0],
      id: 30,
      checkSuiteId: 30,
      runNumber: 30,
      status: 'in_progress',
      conclusion: null,
    });
  }
  return runs;
}

function hostedPublisherEnvironment() {
  return {
    name: releasePublisher.environment,
    protection_rules: [
      {
        type: 'required_reviewers',
        prevent_self_review: releasePublisher.preventSelfReview,
        reviewers: [{ type: 'User', reviewer: { login: releasePublisher.requiredReviewer } }],
      },
    ],
    deployment_branch_policy: { protected_branches: true, custom_branch_policies: false },
  };
}

async function deployKeyPaginationFindings(fixture) {
  const intended = {
    title: releasePublisher.deployKeyTitle,
    read_only: false,
    enabled: true,
  };
  const firstPage = Array.from({ length: 100 }, (_, id) => ({
    title: `read-key-${id}`,
    read_only: true,
    enabled: true,
  }));
  const secondPage =
    fixture.mutation === 'hidden-write-key'
      ? [intended, { title: 'unexpected-writer', read_only: false, enabled: true }]
      : [intended];
  const keys = await fetchAllDeployKeys(async (pathname) => {
    const page = Number(new URL(`https://example.invalid${pathname}`).searchParams.get('page'));
    return page === 1 ? firstPage : secondPage;
  });
  return validateHostedReleasePublisher({
    keys,
    environment: hostedPublisherEnvironment(),
    secrets: [{ name: releasePublisher.secretName }],
    policy: releasePublisher,
  });
}

async function hostedSecretIsolationFindings(fixture) {
  const firstPage = Array.from({ length: 100 }, (_, id) => ({ name: `UNRELATED_${id}` }));
  const secondPage =
    fixture.mutation === 'duplicate-protected'
      ? [{ name: mediaQualification.secretAccessKeySecretName }]
      : [];
  const repositorySecrets = await fetchAllRepositorySecrets(async (pathname) => {
    const page = Number(new URL(`https://example.invalid${pathname}`).searchParams.get('page'));
    return { secrets: page === 1 ? firstPage : secondPage };
  });
  return validateHostedSecretIsolation({
    repositorySecrets,
    authorizationPublisher,
    releasePublisher,
    mediaQualification,
  });
}

function mergeRecordBaseline(input) {
  const approvalExpectation = {
    operation: 'merge',
    commentId: 99,
    pullNumber: input.pullRequest.number,
    targetSha: input.headSha,
    version: input.item.version,
    inspectionCommentId: 88,
    approver: approvalPolicy.approver,
  };
  const evidence = {
    artifactDigest: `sha256:${'4'.repeat(64)}`,
    assetInventoryDigest: `sha256:${'5'.repeat(64)}`,
  };
  const inspectionExpectation = {
    commentId: approvalExpectation.inspectionCommentId,
    pullNumber: input.pullRequest.number,
    targetSha: input.headSha,
    version: input.item.version,
    ownerLogin: approvalPolicy.approver,
    repository: 'karoly-pfaff/tiny-animal-rescue',
    requiredLocales: inspectionPolicy.requiredLocales,
    requiredInputs: inspectionPolicy.requiredInputs,
    requiredViewports: inspectionPolicy.requiredViewports,
    requiredJourneys: input.item.inspectionJourneys,
    artifactNamePrefix: inspectionPolicy.artifactNamePrefix,
    artifactWorkflowPath: inspectionPolicy.artifactWorkflowPath,
    artifactWorkflowEvent: inspectionPolicy.artifactWorkflowEvent,
    artifactWorkflowBranch: inspectionPolicy.artifactWorkflowBranch,
    artifactWorkflowHeadSha: 'a'.repeat(40),
    ...evidence,
  };
  const approval = {
    id: 99,
    issueNumber: input.pullRequest.number,
    authorLogin: approvalPolicy.approver,
    authorType: 'User',
    authorAssociation: 'OWNER',
    body: expectedApprovalBody(approvalExpectation),
    url: 'https://github.com/karoly-pfaff/tiny-animal-rescue/pull/7#issuecomment-99',
    createdAt: approvalTimestamp,
    updatedAt: approvalTimestamp,
  };
  return {
    approval,
    approvalExpectation,
    inspection: fixtureInspectionRecord(input, inspectionExpectation),
    inspectionExpectation,
    evidence,
  };
}

function mutateMergeRecords(records, mutation, input) {
  const mutations = {
    'approval-absent': () => (records.approval = undefined),
    'approval-stale': () =>
      (records.approval.body = records.approval.body.replace(input.headSha, '9'.repeat(40))),
    'approval-wrong-user': () => (records.approval.authorLogin = 'someone-else'),
    'approval-wrong-comment': () => (records.approval.id = 100),
    'approval-wrong-head': () => (records.approvalExpectation.targetSha = '8'.repeat(40)),
    'approval-edited': () => (records.approval.updatedAt = '2026-09-22T05:01:00Z'),
    'inspection-absent': () => (records.inspection = undefined),
    'inspection-wrong-pr': () => (records.inspection.issueNumber = 8),
    'inspection-wrong-comment': () => (records.inspection.id = 89),
    'inspection-failed': () =>
      (records.inspection.body = records.inspection.body.replace(
        'Inspection: pass',
        'Inspection: fail',
      )),
    'inspection-wrong-head': () =>
      (records.inspection.body = records.inspection.body.replace(input.headSha, '9'.repeat(40))),
    'inspection-wrong-digest': () =>
      (records.inspection.body = records.inspection.body.replace(
        records.evidence.artifactDigest,
        `sha256:${'8'.repeat(64)}`,
      )),
    'inspection-missing-viewport': () =>
      (records.inspection.body = records.inspection.body.replace(',768x1024', '')),
    'inspection-wrong-journey': () =>
      (records.inspection.body = records.inspection.body.replace(
        'Journeys: start,map,mission,shelter',
        'Journeys: start,map,mission',
      )),
    'inspection-non-provider-url': () =>
      (records.inspection.body = records.inspection.body.replace(
        fixtureInspectionDetails.evidence,
        'https://example.com/evidence/456',
      )),
    'inspection-expired-artifact': () => (records.inspection.artifact.expired = true),
    'inspection-wrong-artifact-head': () =>
      (records.inspection.artifact.workflowRun.headSha = '9'.repeat(40)),
    'inspection-wrong-artifact-name': () =>
      (records.inspection.artifact.name = 'media-qualified-x'),
    'inspection-untrusted-workflow': () =>
      (records.inspection.artifact.workflow.path = '.github/workflows/ci.yml'),
  };
  if (mutations[mutation] !== undefined) mutations[mutation]();
}

function preMergeFindings(fixture) {
  const input = historyBaseline('pull-request');
  if (fixture.mutation === 'metadata') input.pullRequest.body += '\nchanged';
  const records = mergeRecordBaseline(input);
  mutateMergeRecords(records, fixture.mutation, input);
  const qualityExpectation = fixtureQualityExpectation(input);
  const checks = fixtureCheckRuns(fixture.mutation, qualityExpectation);
  return validateMergeCandidate(input, checks, {
    ...records,
    qualityExpectation,
    qualityWorkflowRuns: fixtureWorkflowRuns(fixture.mutation, checks, qualityExpectation),
  });
}

async function checkRunAdapterFindings() {
  const commitSha = 'a'.repeat(40);
  const requests = [];
  const checkRuns = await fetchAllCheckRuns({
    commitSha,
    github: async (pathname) => {
      requests.push(pathname);
      return {
        check_runs:
          requests.length === 1
            ? Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }))
            : [{ id: 101 }],
      };
    },
  });
  const expected = [1, 2].map(
    (page) => `/commits/${commitSha}/check-runs?filter=all&per_page=100&page=${page}`,
  );
  return checkRuns.length === 101 && JSON.stringify(requests) === JSON.stringify(expected)
    ? []
    : ['check-run adapter did not request every unfiltered page'];
}

async function trustedCheckAdapterFindings() {
  const input = historyBaseline('pull-request');
  const expectation = fixtureQualityExpectation(input);
  const rawChecks = fixtureCheckRuns('none', expectation).map((check) => {
    const raw = { ...check };
    delete raw.workflowRun;
    return raw;
  });
  const requests = [];
  const result = await fetchTrustedQualityChecks({
    commitSha: expectation.commitSha,
    event: expectation.event,
    headBranch: expectation.headBranch,
    github: async (pathname) => {
      requests.push(pathname);
      if (pathname === '/actions/workflows/ci.yml') {
        return { id: expectation.workflowId, path: expectation.workflowPath, state: 'active' };
      }
      if (pathname.startsWith('/commits/')) return { check_runs: rawChecks };
      return {
        workflow_runs: [
          {
            id: 20,
            workflow_id: expectation.workflowId,
            check_suite_id: 20,
            head_sha: expectation.commitSha,
            head_branch: expectation.headBranch,
            path: expectation.workflowPath,
            event: expectation.event,
            status: 'completed',
            conclusion: 'success',
            run_number: 20,
            run_attempt: 1,
          },
        ],
      };
    },
  });
  const findings = validateRequiredQualityChecks(
    result.checkRuns,
    result.expectation,
    result.workflowRuns,
  );
  return requests.length === 3 ? findings : ['trusted-check adapter request set is incomplete'];
}

function tagRevisionAdapterFindings() {
  const calls = [];
  const targetSha = '3'.repeat(40);
  const revisions = tagRevisions('v0.43.0', (arguments_) => {
    calls.push(arguments_);
    return calls.length === 1 ? targetSha : '2'.repeat(40);
  });
  const expected = [
    ['rev-list', '-n', '1', 'refs/tags/v0.43.0'],
    ['rev-parse', `${targetSha}^`],
  ];
  return revisions.targetSha === targetSha && JSON.stringify(calls) === JSON.stringify(expected)
    ? []
    : ['tag revision adapter did not resolve the target before its policy parent'];
}

function adapterFindings(fixture) {
  const adapters = {
    'canonical-pr': () => {
      const pulls = fixture.refs.map((ref) => ({ head: { ref } }));
      return canonicalPullCount(pulls, 'epic/042-fixture') === 1
        ? []
        : ['canonical PR count is not one'];
    },
    'merge-queue': () => {
      const queue = deriveQueueEvidence({
        associatedPullNumbers: fixture.associated,
        pullNumber: 7,
        approvedHeadIsAncestor: fixture.ancestor,
        approvedPatch: fixture.approvedPatch,
        queuedPatch: fixture.queuedPatch,
      });
      return queue.associatedPullRequests === 1 && queue.containsHead && !queue.unrelatedChanges
        ? []
        : ['merge-queue evidence is invalid'];
    },
    'main-range': () => {
      const input = historyBaseline('main');
      const pushedCommits = Array.from({ length: fixture.commitCount }, (_, index) => ({
        ...input.main.newCommits[0],
        sha: String(index + 3).repeat(40),
      }));
      input.main = deriveMainEvidence({
        pushedCommits,
        parentCounts: Object.fromEntries(pushedCommits.map((commit) => [commit.sha, 1])),
        treeMatchesApprovedHead: true,
      });
      return validateHistoryPolicy(input);
    },
    'tag-artifact': () => {
      const input = historyBaseline('tag');
      input.tag = deriveTagEvidence({
        annotated: true,
        tagName: input.tag.name,
        message: input.tag.message,
        targetSha: input.tag.targetSha,
        observedArtifactDigest: `sha256:${fixture.observed.repeat(64)}`,
        observedAssetInventoryDigest: input.tag.observedAssetInventoryDigest,
        approval: input.tag.approval,
        mergeApproval: input.tag.mergeApproval,
        inspection: input.tag.inspection,
        approver: input.tag.approver,
        treeMatchesInspectedHead: input.tag.treeMatchesInspectedHead,
        repository: input.tag.repository,
        requiredLocales: input.tag.requiredLocales,
        requiredInputs: input.tag.requiredInputs,
        requiredViewports: input.tag.requiredViewports,
        artifactNamePrefix: input.tag.artifactNamePrefix,
        artifactWorkflowPath: input.tag.artifactWorkflowPath,
        artifactWorkflowEvent: input.tag.artifactWorkflowEvent,
        artifactWorkflowBranch: input.tag.artifactWorkflowBranch,
        artifactWorkflowHeadSha: input.tag.artifactWorkflowHeadSha,
      });
      return validateHistoryPolicy(input);
    },
    'pre-merge': () => preMergeFindings(fixture),
    'check-runs': () => checkRunAdapterFindings(),
    'trusted-checks': () => trustedCheckAdapterFindings(),
    'tag-revisions': () => tagRevisionAdapterFindings(),
    'secret-history': () => {
      const secret = fixture.containsSecret ? `ghp_${'a'.repeat(30)}` : 'no credential here';
      const history = scanGitHistory({
        repositoryDirectory: 'C:/fixture-repository',
        runGit: (args) => {
          const complete = ['log', '--all', '--format=%B', '-p'].every((argument) =>
            args.includes(argument),
          );
          return complete ? secret : `ghp_${'b'.repeat(30)}`;
        },
      });
      return history.labels.length === 0 ? [] : ['Git history contains a possible secret'];
    },
  };
  return adapters[fixture.kind]();
}

function hostedPublisherFindings(fixture) {
  const candidate = {
    keys: [{ title: releasePublisher.deployKeyTitle, read_only: false, enabled: true }],
    environment: hostedPublisherEnvironment(),
    secrets: [{ name: releasePublisher.secretName }],
    policy: releasePublisher,
  };
  if (fixture.mutation === 'extra-key')
    candidate.keys.push({ title: 'another-write-key', read_only: false, enabled: true });
  if (fixture.mutation === 'missing-secret') candidate.secrets = [];
  if (fixture.mutation === 'wrong-reviewer')
    candidate.environment.protection_rules[0].reviewers[0].reviewer.login = 'someone-else';
  return validateHostedReleasePublisher(candidate);
}

function hostedAuthorizationFindings(fixture) {
  const candidate = {
    environment: {
      name: authorizationPublisher.environment,
      protection_rules: [
        {
          type: 'required_reviewers',
          prevent_self_review: authorizationPublisher.preventSelfReview,
          reviewers: [
            { type: 'User', reviewer: { login: authorizationPublisher.requiredReviewer } },
          ],
        },
      ],
      deployment_branch_policy: { protected_branches: true, custom_branch_policies: false },
    },
    secrets: [
      { name: authorizationPublisher.appIdSecretName },
      { name: authorizationPublisher.privateKeySecretName },
    ],
    policy: authorizationPublisher,
  };
  if (fixture.mutation === 'missing-private-key') candidate.secrets.pop();
  if (fixture.mutation === 'unprotected-branches')
    candidate.environment.deployment_branch_policy.protected_branches = false;
  return validateHostedAuthorizationPublisher(candidate);
}

function hostedMediaFindings(fixture) {
  const candidate = {
    environment: {
      ...hostedPublisherEnvironment(),
      name: mediaQualification.environment,
      protection_rules: [
        {
          type: 'required_reviewers',
          prevent_self_review: mediaQualification.preventSelfReview,
          reviewers: [{ type: 'User', reviewer: { login: mediaQualification.requiredReviewer } }],
        },
      ],
    },
    secrets: [
      { name: mediaQualification.endpointSecretName },
      { name: mediaQualification.bucketSecretName },
      { name: mediaQualification.accessKeyIdSecretName },
      { name: mediaQualification.secretAccessKeySecretName },
    ],
    policy: mediaQualification,
  };
  if (fixture.mutation === 'missing-secret') candidate.secrets.pop();
  if (fixture.mutation === 'wrong-reviewer')
    candidate.environment.protection_rules[0].reviewers[0].reviewer.login = 'someone-else';
  return validateHostedMediaQualification(candidate);
}

for (const fixture of cases.commitSubjects) {
  const [valid, message] = commitlintSubjectCase({ subject: fixture.subject });
  record(`commit-subject/${fixture.name}`, fixture.valid, valid ? [] : [message]);
}
for (const subject of ['fix(PATCH-001): correct v0.2 asset delivery and visual evidence']) {
  record(`commitlint-command/${subject}`, true, commitlintCommandFindings(subject));
}
for (const fixture of cases.history) {
  const input = historyBaseline(fixture.mode);
  mutateHistory(input, fixture.mutation);
  record(`history/${fixture.name}`, fixture.valid, validateHistoryPolicy(input));
}
for (const branch of ['fix/PATCH-001-v0.2.1-asset-evidence-correction']) {
  const item = workItemFromBranch(branch);
  for (const mode of ['branch', 'pull-request', 'main']) {
    record(`${item.id}/${mode}`, true, validateHistoryPolicy(maintenanceBaseline(item, mode)));
  }
  record(
    `${item.id}/tag`,
    item.publishesRelease,
    validateHistoryPolicy(maintenanceBaseline(item, 'tag')),
  );
}
{
  const baseSha = '1'.repeat(40);
  const headSha = '2'.repeat(40);
  record(
    'merge/current-main-ancestry',
    true,
    validateCurrentMainAncestry({
      baseSha,
      headSha,
      comparison: {
        merge_base_commit: { sha: baseSha },
        ahead_by: 1,
        status: 'ahead',
        commits: [{ sha: headSha }],
      },
    }),
  );
  record(
    'merge/stale-main-ancestry',
    false,
    validateCurrentMainAncestry({
      baseSha,
      headSha,
      comparison: {
        merge_base_commit: { sha: '0'.repeat(40) },
        ahead_by: 1,
        status: 'diverged',
        commits: [{ sha: headSha }],
      },
    }),
  );
  record(
    'merge/stable-provider-snapshot',
    true,
    validateMergeSnapshot({
      expectedBaseSha: baseSha,
      expectedHeadSha: headSha,
      pullRequest: { state: 'open', base: { sha: baseSha }, head: { sha: headSha } },
      mainSha: baseSha,
    }),
  );
  record(
    'merge/racing-provider-snapshot',
    false,
    validateMergeSnapshot({
      expectedBaseSha: baseSha,
      expectedHeadSha: headSha,
      pullRequest: { state: 'open', base: { sha: '3'.repeat(40) }, head: { sha: headSha } },
      mainSha: '3'.repeat(40),
    }),
  );
  record('merge/exact-target-version', true, validateEvidenceVersion('0.2.0', '0.2.0'));
  record('merge/target-version-drift', false, validateEvidenceVersion('0.1.0', '0.2.0'));
}
{
  const item = workItemFromBranch('fix/PATCH-001-v0.2.1-asset-evidence-correction');
  const input = maintenanceBaseline(item, 'branch');
  input.commits[0].subject = 'docs(PATCH-001): correct v0.2 asset delivery and visual evidence';
  record('PATCH-001/reject-declared-type-drift', false, validateHistoryPolicy(input));
}
{
  const item = workItemFromBranch('fix/PATCH-001-v0.2.1-asset-evidence-correction');
  const input = maintenanceBaseline(item, 'pull-request');
  const records = mergeRecordBaseline(input);
  records.inspection = undefined;
  record(
    'PATCH-001/reject-merge-without-required-inspection',
    false,
    validateMergeCandidate(input, fixtureCheckRuns('none', fixtureQualityExpectation(input)), {
      ...records,
      qualityExpectation: fixtureQualityExpectation(input),
      qualityWorkflowRuns: fixtureWorkflowRuns(
        'none',
        fixtureCheckRuns('none', fixtureQualityExpectation(input)),
        fixtureQualityExpectation(input),
      ),
    }),
  );
}
for (const fixture of cases.watermarks) {
  record(`watermark/${fixture.name}`, fixture.valid, validateWatermarkRecord(fixture.record));
}
for (const fixture of cases.repository) {
  const candidate = {
    settings: clone(settings),
    ruleset: clone(ruleset),
    tagRuleset: clone(tagRuleset),
    tagImmutabilityRuleset: clone(tagImmutabilityRuleset),
    workflow,
    mergeWorkflow,
    publishWorkflow,
    qualifyMediaWorkflow,
    approvalPolicy: clone(approvalPolicy),
    inspectionPolicy: clone(inspectionPolicy),
    authorizationPublisher: clone(authorizationPublisher),
    releasePublisher: clone(releasePublisher),
    mediaQualification: clone(mediaQualification),
  };
  if (fixture.mutation === 'merge-method') candidate.settings.allow_merge_commit = true;
  if (fixture.mutation === 'bypass')
    candidate.ruleset.bypass_actors.push({
      actor_id: 1,
      actor_type: 'OrganizationAdmin',
      bypass_mode: 'always',
    });
  if (fixture.mutation === 'stale-checks') {
    candidate.ruleset.rules.find(
      (rule) => rule.type === 'required_status_checks',
    ).parameters.strict_required_status_checks_policy = false;
  }
  if (fixture.mutation === 'missing-authorization-check') {
    const checks = candidate.ruleset.rules.find((rule) => rule.type === 'required_status_checks')
      .parameters.required_status_checks;
    checks.splice(
      checks.findIndex((check) => check.context === 'authorization'),
      1,
    );
  }
  if (fixture.mutation === 'generic-actions-authorization') {
    candidate.ruleset.bypass_actors[0].actor_id = 15368;
    candidate.ruleset.rules
      .find((rule) => rule.type === 'required_status_checks')
      .parameters.required_status_checks.find(
        (check) => check.context === 'authorization',
      ).integration_id = 15368;
  }
  if (fixture.mutation === 'untrusted-authorization-workflow')
    candidate.mergeWorkflow = candidate.mergeWorkflow.replace(
      'actions/create-github-app-token@v3',
      'actions/create-untrusted-token@v3',
    );
  if (fixture.mutation === 'candidate-code-receives-r2-secret')
    candidate.qualifyMediaWorkflow = candidate.qualifyMediaWorkflow.replace(
      '      - run: npm ci\n        working-directory: candidate',
      '      - run: npm ci\n        working-directory: candidate\n        env:\n          LEAK: ${{ secrets.R2_SECRET_ACCESS_KEY }}',
    );
  if (fixture.mutation === 'continue-on-error')
    candidate.workflow = candidate.workflow.replace(
      '      - run: npm run lint\n',
      '      - run: npm run lint\n        continue-on-error: true\n',
    );
  if (fixture.mutation === 'candidate-command-in-secret-job')
    candidate.qualifyMediaWorkflow = candidate.qualifyMediaWorkflow.replace(
      '      - run: npm ci --ignore-scripts\n',
      '      - run: npm ci --ignore-scripts\n      - run: node candidate/exfiltrate.mjs\n',
    );
  if (fixture.mutation === 'missing-materialized-assets-mode')
    candidate.qualifyMediaWorkflow = candidate.qualifyMediaWorkflow.replace(
      "    env:\n      VITE_MATERIALIZED_ASSETS: 'true'\n",
      '',
    );
  if (fixture.mutation === 'candidate-noop-asset-validator')
    candidate.qualifyMediaWorkflow = candidate.qualifyMediaWorkflow.replace(
      'node policy/scripts/validate-materialized-assets.mjs',
      'npm run test:assets:materialized',
    );
  if (fixture.mutation === 'overprivileged-authorization-token')
    candidate.mergeWorkflow = candidate.mergeWorkflow.replace(
      'permission-issues: read',
      'permission-issues: write',
    );
  if (fixture.mutation === 'underprivileged-authorization-token')
    candidate.mergeWorkflow = candidate.mergeWorkflow.replace(
      'permission-contents: write',
      'permission-contents: read',
    );
  if (fixture.mutation === 'missing-job')
    candidate.workflow = candidate.workflow.replace('  visual:\n', '  visual-disabled:\n');
  if (fixture.mutation === 'path-filter')
    candidate.workflow = candidate.workflow.replace(
      '  pull_request:\n',
      '  pull_request:\n    paths: [sources/**]\n',
    );
  if (fixture.mutation === 'missing-schedule')
    candidate.workflow = candidate.workflow.replace("  schedule:\n    - cron: '17 4 * * 1'\n", '');
  if (fixture.mutation === 'missing-history-need')
    candidate.workflow = candidate.workflow.replace('    needs: supply-chain\n', '');
  if (fixture.mutation === 'missing-approval-input')
    candidate.mergeWorkflow = candidate.mergeWorkflow.replace(
      /[ ]{6}approval_comment:\n(?:[ ]{8}.*\n){3}/u,
      '',
    );
  if (fixture.mutation === 'tag-ruleset-bypass') {
    candidate.tagRuleset.bypass_actors[0].actor_id = 15368;
    candidate.tagRuleset.bypass_actors[0].actor_type = 'Integration';
  }
  if (fixture.mutation === 'tag-immutability-bypass')
    candidate.tagImmutabilityRuleset.bypass_actors.push({
      actor_id: null,
      actor_type: 'DeployKey',
      bypass_mode: 'always',
    });
  if (fixture.mutation === 'tag-immutability-missing-update')
    candidate.tagImmutabilityRuleset.rules = candidate.tagImmutabilityRuleset.rules.filter(
      (rule) => rule.type !== 'update',
    );
  if (fixture.mutation === 'tag-immutability-allows-update')
    candidate.tagImmutabilityRuleset.rules.find(
      (rule) => rule.type === 'update',
    ).parameters.update_allows_fetch_and_merge = true;
  if (fixture.mutation === 'missing-tag-approval-input')
    candidate.publishWorkflow = candidate.publishWorkflow.replace(
      /[ ]{6}approval_comment:\n(?:[ ]{8}.*\n){3}/u,
      '',
    );
  if (fixture.mutation === 'release-publisher-environment')
    candidate.releasePublisher.environment = 'unprotected-release';
  if (fixture.mutation === 'release-key-before-validation')
    candidate.publishWorkflow = candidate.publishWorkflow.replace(
      '      - run: >-\n          node scripts/publish-tag.mjs',
      `      - uses: actions/checkout@v7\n        with:\n          ssh-key: \${{ secrets.${releasePublisher.secretName} }}\n      - run: >-\n          node scripts/publish-tag.mjs`,
    );
  if (fixture.mutation === 'incomplete-inspection-viewports')
    candidate.inspectionPolicy.requiredViewports = ['1024x768'];
  record(`repository/${fixture.name}`, fixture.valid, validateRepositoryPolicy(candidate));
}
for (const fixture of cases.hostedReleasePublisher) {
  record(`release-publisher/${fixture.name}`, fixture.valid, hostedPublisherFindings(fixture));
}
for (const fixture of cases.deployKeyPagination) {
  record(
    `deploy-key-pagination/${fixture.name}`,
    fixture.valid,
    await deployKeyPaginationFindings(fixture),
  );
}
for (const fixture of cases.mainCheckSuites) {
  record(
    `main-check-suite/${fixture.name}`,
    fixture.valid,
    (() => {
      const expectation = fixtureQualityExpectation(historyBaseline('main'));
      const checks = fixtureCheckRuns(fixture.mutation, expectation);
      return validateRequiredQualityChecks(
        checks,
        expectation,
        fixtureWorkflowRuns(fixture.mutation, checks, expectation),
      );
    })(),
  );
}
for (const fixture of cases.hostedAuthorizationPublisher) {
  record(
    `authorization-publisher/${fixture.name}`,
    fixture.valid,
    hostedAuthorizationFindings(fixture),
  );
}
for (const fixture of cases.hostedMediaQualification) {
  record(`media-qualification/${fixture.name}`, fixture.valid, hostedMediaFindings(fixture));
}
for (const fixture of cases.hostedSecretIsolation) {
  record(
    `secret-isolation/${fixture.name}`,
    fixture.valid,
    await hostedSecretIsolationFindings(fixture),
  );
}
for (const fixture of cases.adapters) {
  record(`adapter/${fixture.name}`, fixture.valid, await adapterFindings(fixture));
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(
  `Validated ${cases.commitSubjects.length + cases.history.length + cases.watermarks.length + cases.repository.length + cases.hostedReleasePublisher.length + cases.deployKeyPagination.length + cases.mainCheckSuites.length + cases.hostedAuthorizationPublisher.length + cases.hostedMediaQualification.length + cases.hostedSecretIsolation.length + cases.adapters.length} governance fixture(s).`,
);
