import { readFile } from 'node:fs/promises';
import { commitlintSubjectCase } from './lib/commit-subject-policy.mjs';
import {
  canonicalPullCount,
  deriveMainEvidence,
  deriveQueueEvidence,
  deriveTagEvidence,
  fetchAllCheckRuns,
} from './lib/github-history.mjs';
import { generateSquashMessage, validateHistoryPolicy } from './lib/history-policy.mjs';
import { validateMergeCandidate } from './lib/merge-policy.mjs';
import { requiredChecks, validateRepositoryPolicy } from './lib/repository-policy.mjs';
import { scanGitHistory } from './lib/secret-policy.mjs';
import { validateWatermarkRecord } from './lib/watermark-policy.mjs';

const readJson = (path) => readFile(path, 'utf8').then(JSON.parse);
const [cases, settings, ruleset, workflow] = await Promise.all([
  readJson('tests/fixtures/governance/governance-cases.json'),
  readJson('deploy/github/repository-settings.json'),
  readJson('deploy/github/main-ruleset.json'),
  readFile('.github/workflows/ci.yml', 'utf8'),
]);
const clone = (value) => structuredClone(value);
const failures = [];

function historyBaseline(mode) {
  const input = {
    mode,
    branch: 'epic/042-fixture-epic',
    epic: {
      id: 'EPIC-042',
      number: '042',
      title: 'Fixture epic',
      milestone: 'M42',
      version: '0.43.0',
      aggregateGate: 'validate:full',
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
  input.tag = {
    annotated: true,
    name: 'v0.43.0',
    targetSha: '3'.repeat(40),
    squashSha: '3'.repeat(40),
    artifactDigest: `sha256:${'4'.repeat(64)}`,
    observedArtifactDigest: `sha256:${'4'.repeat(64)}`,
    message: `${message.body}\nSquash: ${'3'.repeat(40)}\nArtifact-Digest: sha256:${'4'.repeat(64)}`,
  };
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
  };
  mutations[mutation]();
}

function record(name, valid, findings) {
  if ((findings.length === 0) !== valid)
    failures.push(`${name}: expected valid=${valid}, got ${findings.join(' | ') || 'valid'}.`);
}

function preMergeFindings(fixture) {
  const input = historyBaseline('pull-request');
  if (fixture.mutation === 'metadata') input.pullRequest.body += '\nchanged';
  const checks = requiredChecks.map((name) => ({
    id: 200,
    name,
    status: 'completed',
    conclusion: fixture.mutation === 'check' && name === 'security' ? 'failure' : 'success',
    check_suite: { id: 20 },
  }));
  if (fixture.mutation === 'new-suite') {
    checks.push(
      ...requiredChecks.map((name) => ({
        id: 100,
        name,
        status: 'completed',
        conclusion: name === 'history' ? 'failure' : 'success',
        check_suite: { id: 10 },
      })),
    );
  }
  if (fixture.mutation === 'same-suite-retry') {
    checks.push({
      id: 201,
      name: 'history',
      status: 'completed',
      conclusion: 'success',
      check_suite: { id: 20 },
    });
  }
  return validateMergeCandidate(input, checks);
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

function adapterFindings(fixture) {
  const adapters = {
    'canonical-pr': () => {
      const pulls = fixture.refs.map((ref) => ({ head: { ref } }));
      return canonicalPullCount(pulls, '042') === 1 ? [] : ['canonical PR count is not one'];
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
      });
      return validateHistoryPolicy(input);
    },
    'pre-merge': () => preMergeFindings(fixture),
    'check-runs': () => checkRunAdapterFindings(),
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

for (const fixture of cases.commitSubjects) {
  const [valid, message] = commitlintSubjectCase({ subject: fixture.subject });
  record(`commit-subject/${fixture.name}`, fixture.valid, valid ? [] : [message]);
}
for (const fixture of cases.history) {
  const input = historyBaseline(fixture.mode);
  mutateHistory(input, fixture.mutation);
  record(`history/${fixture.name}`, fixture.valid, validateHistoryPolicy(input));
}
for (const fixture of cases.watermarks) {
  record(`watermark/${fixture.name}`, fixture.valid, validateWatermarkRecord(fixture.record));
}
for (const fixture of cases.repository) {
  const candidate = { settings: clone(settings), ruleset: clone(ruleset), workflow };
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
  record(`repository/${fixture.name}`, fixture.valid, validateRepositoryPolicy(candidate));
}
for (const fixture of cases.adapters) {
  record(`adapter/${fixture.name}`, fixture.valid, await adapterFindings(fixture));
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(
  `Validated ${cases.commitSubjects.length + cases.history.length + cases.watermarks.length + cases.repository.length + cases.adapters.length} governance fixture(s).`,
);
