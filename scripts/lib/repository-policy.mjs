export const requiredChecks = [
  'quality',
  'history',
  'tests',
  'browser',
  'visual',
  'supply-chain',
  'security',
];

function hasRule(ruleset, type) {
  return ruleset.rules.find((rule) => rule.type === type);
}

function validateSettings(settings) {
  const findings = [];
  const enabledMergeMethods = [
    settings.allow_merge_commit && 'merge',
    settings.allow_rebase_merge && 'rebase',
    settings.allow_squash_merge && 'squash',
  ].filter(Boolean);
  if (enabledMergeMethods.join(',') !== 'squash')
    findings.push('Repository must allow squash merge only.');
  if (settings.squash_merge_commit_title !== 'PR_TITLE')
    findings.push('Squash title must use the validated PR title.');
  if (settings.squash_merge_commit_message !== 'PR_BODY')
    findings.push('Squash body must use the validated PR body.');
  if (!settings.delete_branch_on_merge) findings.push('Merged epic branches must be deleted.');
  if (settings.allow_auto_merge !== false) {
    findings.push(
      'Provider auto-merge must remain disabled; only validated merge automation may merge.',
    );
  }
  return findings;
}

function validateRuleScope(ruleset) {
  const findings = [];
  const includedRefs = ruleset.conditions?.ref_name?.include ?? [];
  const excludedRefs = ruleset.conditions?.ref_name?.exclude ?? [];
  if (
    ruleset.target !== 'branch' ||
    includedRefs.join(',') !== '~DEFAULT_BRANCH' ||
    excludedRefs.length !== 0
  ) {
    findings.push('Ruleset must target only the default branch.');
  }
  return findings;
}

function validateBaselineProtection(ruleset) {
  const findings = [];
  if (ruleset.enforcement !== 'active' || ruleset.bypass_actors.length !== 0) {
    findings.push('Main ruleset must be active with no bypass actor.');
  }
  if (
    hasRule(ruleset, 'deletion') === undefined ||
    hasRule(ruleset, 'non_fast_forward') === undefined
  ) {
    findings.push('Main ruleset must block deletion and force pushes.');
  }
  return findings;
}

function validatePullRequestRule(ruleset) {
  const findings = [];
  const pullRequest = hasRule(ruleset, 'pull_request')?.parameters;
  if (pullRequest?.allowed_merge_methods?.join(',') !== 'squash') {
    findings.push('Main ruleset must permit squash pull-request merges only.');
  }
  if (
    pullRequest?.dismiss_stale_reviews_on_push !== true ||
    pullRequest?.required_review_thread_resolution !== true ||
    pullRequest?.required_approving_review_count !== 0
  ) {
    findings.push('Pull-request rule must dismiss stale review and resolve review threads.');
  }
  return findings;
}

function validateStatusRules(ruleset) {
  const findings = [];
  const statuses = hasRule(ruleset, 'required_status_checks')?.parameters;
  const observedChecks = statuses?.required_status_checks?.map(({ context }) => context) ?? [];
  if (observedChecks.join(',') !== requiredChecks.join(','))
    findings.push('Required status-check set or order drifted.');
  if (
    statuses?.strict_required_status_checks_policy !== true ||
    statuses?.do_not_enforce_on_create !== false
  ) {
    findings.push('Required checks must be strict, current, and enforced on every change.');
  }
  return findings;
}

function validateWorkflow(workflow) {
  const findings = [];
  const forbiddenFilters = /^\s+paths(?:-ignore)?:/mu;
  if (forbiddenFilters.test(workflow)) findings.push('Required workflow may not use path filters.');
  for (const trigger of ['pull_request:', 'merge_group:', 'push:', 'schedule:']) {
    if (!workflow.includes(trigger))
      findings.push(`Required workflow is missing ${trigger.slice(0, -1)} trigger.`);
  }
  if (!/^\s{4}branches: \[main\]$/mu.test(workflow))
    findings.push('Push trigger must explicitly include main.');
  for (const check of requiredChecks) {
    if (!new RegExp(`^  ${check}:$`, 'mu').test(workflow))
      findings.push(`Workflow job ${check} is missing.`);
  }
  if (!workflow.includes('node scripts/run-ci-history.mjs'))
    findings.push('Hosted history job must use the repository history policy.');
  if (!/^\s{4}needs: supply-chain$/mu.test(workflow)) {
    findings.push('History must consume the independently rebuilt supply-chain artifact.');
  }
  if (!workflow.includes('github/codeql-action/analyze@v4'))
    findings.push('Security job must publish CodeQL v4 analysis.');
  return findings;
}

export function validateRepositoryPolicy({ settings, ruleset, workflow }) {
  return [
    ...validateSettings(settings),
    ...validateRuleScope(ruleset),
    ...validateBaselineProtection(ruleset),
    ...validatePullRequestRule(ruleset),
    ...validateStatusRules(ruleset),
    ...validateWorkflow(workflow),
  ];
}
