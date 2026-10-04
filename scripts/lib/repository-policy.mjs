import { createHash } from 'node:crypto';
import { parse } from 'yaml';

export const qualityChecks = [
  'quality',
  'history',
  'tests',
  'browser',
  'visual',
  'supply-chain',
  'security',
];
const requiredChecks = [...qualityChecks, 'authorization'];
const workflowSemanticFingerprints = {
  ci: 'c81c8694a0cd34bcd5e2dcb176bc6759e545a868a158638687097e4bd5bf655d',
  merge: '555acbd0057d23f5b7f7b71f6633d0fee03cd6c49bd6060bfd8afc24c8e098e8',
  publish: '5ffe18c3f43ecb0a71e13617ac0a8e73f2850ba27ee604a718c173b27cd2023f',
  qualify: 'd6c977bab240d9c7a62871d881eef5c54194436ba3669ee47a60a8cf8411bc95',
};

function visitWorkflow(value, callback) {
  if (Array.isArray(value)) {
    for (const item of value) visitWorkflow(item, callback);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    callback(key, child);
    visitWorkflow(child, callback);
  }
}

function validateWorkflowSemantics(workflow, kind) {
  const findings = [];
  let document;
  try {
    document = parse(workflow);
  } catch (error) {
    return [`${kind} workflow is not valid YAML: ${error.message}`];
  }
  if (document === null || typeof document !== 'object' || Array.isArray(document)) {
    return [`${kind} workflow must be a YAML mapping.`];
  }
  visitWorkflow(document, (key) => {
    if (key === 'continue-on-error') {
      findings.push(`${kind} workflow may not use continue-on-error.`);
    }
  });
  const fingerprint = createHash('sha256').update(JSON.stringify(document)).digest('hex');
  if (fingerprint !== workflowSemanticFingerprints[kind]) {
    findings.push(
      `${kind} workflow differs from the exact reviewed semantic definition; update the policy fingerprint only with the reviewed workflow change.`,
    );
  }
  return findings;
}

function hasRule(ruleset, type) {
  return ruleset.rules.find((rule) => rule.type === type);
}

function statusParameters(ruleset) {
  return hasRule(ruleset, 'required_status_checks')?.parameters ?? {};
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
      'Provider auto-merge must remain disabled; only sanctioned validated merge tooling may merge.',
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
  const bypass = ruleset.bypass_actors ?? [];
  if (ruleset.enforcement !== 'active' || bypass.length !== 0) {
    findings.push(
      'Protected main may not have a bypass actor; the provider must atomically enforce current strict checks.',
    );
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
  const statuses = statusParameters(ruleset);
  const observedChecks = statuses?.required_status_checks?.map(({ context }) => context) ?? [];
  if (observedChecks.join(',') !== requiredChecks.join(','))
    findings.push('Required status-check set or order drifted.');
  const strictPolicy = [
    statuses?.strict_required_status_checks_policy === true,
    statuses?.do_not_enforce_on_create === false,
  ].every(Boolean);
  if (!strictPolicy) {
    findings.push('Required checks must be strict, current, and enforced on every change.');
  }
  const authorization = statuses?.required_status_checks?.find(
    ({ context }) => context === 'authorization',
  );
  if (authorization?.integration_id !== undefined)
    findings.push(
      'Authorization status must admit both sanctioned executors and may not be App-pinned.',
    );
  return findings;
}

function validateWorkflow(workflow) {
  const findings = validateWorkflowSemantics(workflow, 'ci');
  const forbiddenFilters = /^\s+paths(?:-ignore)?:/mu;
  if (forbiddenFilters.test(workflow)) findings.push('Required workflow may not use path filters.');
  for (const trigger of ['pull_request:', 'merge_group:', 'push:', 'schedule:']) {
    if (!workflow.includes(trigger))
      findings.push(`Required workflow is missing ${trigger.slice(0, -1)} trigger.`);
  }
  if (!/^\s{4}branches: \[main\]$/mu.test(workflow))
    findings.push('Push trigger must explicitly include main.');
  for (const check of qualityChecks) {
    if (!new RegExp(`^  ${check}:$`, 'mu').test(workflow))
      findings.push(`Workflow job ${check} is missing.`);
  }
  if (!workflow.includes('node scripts/run-ci-history.mjs'))
    findings.push('Hosted history job must use the repository history policy.');
  for (const tagEvidenceStep of [
    'node scripts/resolve-tag-qualification.mjs',
    'path: build/tag-qualification',
    'run-id: ${{ steps.tag-qualification.outputs.run_id }}',
  ]) {
    if (!workflow.includes(tagEvidenceStep))
      findings.push(
        `Tag history must consume retained qualification evidence: ${tagEvidenceStep}.`,
      );
  }
  if (!/^\s{4}needs: supply-chain$/mu.test(workflow)) {
    findings.push('History must consume the independently rebuilt supply-chain artifact.');
  }
  if (!workflow.includes('github/codeql-action/analyze@v4'))
    findings.push('Security job must publish CodeQL v4 analysis.');
  return findings;
}

function validateApprovalPolicy(policy) {
  const findings = [];
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(policy.approver ?? ''))
    findings.push('Approval policy must name one valid repository-owner login.');
  if (
    policy.agentMaterializationRequiresDirectInstruction !== true ||
    policy.combinedInstructionMayAuthorizeMergeAndTag !== true
  ) {
    findings.push('Approval policy must preserve direct-owner agent materialization rules.');
  }
  return findings;
}

function validateMergeWorkflow(workflow, approvalPolicy, authorizationPublisher) {
  const findings = [
    ...validateWorkflowSemantics(workflow, 'merge'),
    ...validateApprovalPolicy(approvalPolicy),
  ];
  const permissions = authorizationPublisher.tokenPermissions ?? {};
  for (const input of [
    'pull_request:',
    'inspection_comment:',
    'approval_comment:',
    'qualification_run:',
  ]) {
    if (!workflow.includes(input))
      findings.push(`Merge workflow is missing ${input.slice(0, -1)} input.`);
  }
  for (const argument of [
    '--pull-request',
    '--inspection-comment',
    '--approval-comment',
    '--qualification-run',
  ]) {
    if (!workflow.includes(argument))
      findings.push(`Merge workflow is missing ${argument} binding.`);
  }
  for (const requirement of [
    "if: github.ref == 'refs/heads/main'",
    'group: merge-authorization-main',
    'cancel-in-progress: false',
    'path: policy',
    'path: candidate',
    'ref: refs/heads/main',
    'ref: refs/pull/${{ inputs.pull_request }}/head',
    '--candidate candidate',
    'npm run build',
    'node ../policy/scripts/validate-artifact.mjs',
    'node ../policy/scripts/validate-repository-policy.mjs',
    'node policy/scripts/prepare-merge-evidence.mjs',
    'node policy/scripts/verify-qualified-media.mjs',
    'pattern: media-qualified-*',
    'run-id: ${{ inputs.qualification_run }}',
    'needs: validate',
    `environment: ${authorizationPublisher.environment}`,
    'actions/create-github-app-token@v3',
    `app-id: \${{ secrets.${authorizationPublisher.appIdSecretName} }}`,
    `private-key: \${{ secrets.${authorizationPublisher.privateKeySecretName} }}`,
    `permission-actions: ${permissions.actions}`,
    `permission-checks: ${permissions.checks}`,
    `permission-contents: ${permissions.contents}`,
    `permission-issues: ${permissions.issues}`,
    `permission-pull-requests: ${permissions.pullRequests}`,
    `permission-statuses: ${permissions.statuses}`,
    '--evidence build/merge-evidence/release-evidence.json',
  ]) {
    if (!workflow.includes(requirement))
      findings.push(`Merge workflow is missing exact-candidate step: ${requirement}.`);
  }
  if (/^\s{2}(?:contents|statuses): write$/mu.test(workflow))
    findings.push('Merge workflow may not grant its generic GitHub token write permission.');
  return findings;
}

function validateAuthorizationPublisher(policy) {
  const findings = [];
  const permissions = policy.tokenPermissions ?? {};
  const valid = [
    policy.appIdEnvironment === 'AUTHORIZATION_APP_ID',
    policy.environment === 'merge-authorization',
    policy.appIdSecretName === 'MERGE_AUTHORIZATION_APP_ID',
    policy.privateKeySecretName === 'MERGE_AUTHORIZATION_APP_PRIVATE_KEY',
    permissions.actions === 'read',
    permissions.checks === 'read',
    permissions.contents === 'write',
    permissions.issues === 'read',
    permissions.pullRequests === 'read',
    permissions.statuses === 'write',
    Object.keys(permissions).sort().join(',') ===
      'actions,checks,contents,issues,pullRequests,statuses',
    policy.requiresManualApproval === false,
    policy.requiredReviewer === undefined,
    policy.preventSelfReview === false,
  ].every(Boolean);
  if (!valid) findings.push('Authorization-app publisher policy is incomplete or inconsistent.');
  return findings;
}

function validateInspectionPolicy(policy) {
  const findings = [];
  if ((policy.requiredLocales ?? []).join(',') !== 'hu,en')
    findings.push('Live inspection must cover Hungarian and English.');
  if ((policy.requiredInputs ?? []).join(',') !== 'mouse,touch')
    findings.push('Live inspection must cover mouse and touch input.');
  if ((policy.requiredViewports ?? []).join(',') !== '1024x768,1280x800,1366x1024,768x1024') {
    findings.push('Live inspection must cover the full supported viewport matrix.');
  }
  if (
    policy.artifactNamePrefix !== 'media-qualified-' ||
    policy.artifactWorkflowPath !== '.github/workflows/qualify-media.yml' ||
    policy.artifactWorkflowEvent !== 'workflow_dispatch' ||
    policy.artifactWorkflowBranch !== 'main'
  ) {
    findings.push('Live inspection must cite the trusted retained media-qualification artifact.');
  }
  return findings;
}

function hasValidTagScope(ruleset) {
  const includedRefs = ruleset.conditions?.ref_name?.include ?? [];
  return (
    ruleset.target === 'tag' &&
    ruleset.enforcement === 'active' &&
    includedRefs.join(',') === 'refs/tags/v*'
  );
}

function hasDedicatedTagBypass(ruleset) {
  const bypass = ruleset.bypass_actors ?? [];
  const actor = bypass[0];
  return (
    bypass.length === 1 &&
    actor?.actor_id === null &&
    actor.actor_type === 'DeployKey' &&
    actor.bypass_mode === 'always'
  );
}

function validateTagRuleset(ruleset) {
  const findings = [];
  const ruleTypes = (ruleset.rules ?? []).map((rule) => rule.type).sort();
  if (!hasValidTagScope(ruleset)) {
    findings.push('Release tag ruleset must actively target refs/tags/v*.');
  }
  if (!hasDedicatedTagBypass(ruleset)) {
    findings.push('Only the dedicated release deploy-key identity may bypass tag protection.');
  }
  if (ruleTypes.join(',') !== 'creation')
    findings.push('Release publisher ruleset must restrict creation only.');
  return findings;
}

function validateTagImmutabilityRuleset(ruleset) {
  const findings = [];
  const ruleTypes = (ruleset.rules ?? []).map((rule) => rule.type).sort();
  const update = hasRule(ruleset, 'update');
  if (!hasValidTagScope(ruleset))
    findings.push('Release-tag immutability ruleset must actively target refs/tags/v*.');
  if ((ruleset.bypass_actors ?? []).length !== 0)
    findings.push('Release-tag update and deletion protection may have no bypass actor.');
  if (ruleTypes.join(',') !== 'deletion,update')
    findings.push('Release-tag immutability must restrict update and deletion.');
  if (update?.parameters?.update_allows_fetch_and_merge !== false)
    findings.push('Release-tag update protection may not allow fetch-and-merge updates.');
  return findings;
}

function validateReleasePublisherPolicy(policy) {
  const findings = [];
  if (
    policy.environment !== 'release-tag-publication' ||
    policy.secretName !== 'RELEASE_TAG_DEPLOY_KEY' ||
    policy.requiresManualApproval !== false ||
    policy.requiredReviewer !== undefined ||
    policy.preventSelfReview !== false ||
    !/^[a-z0-9][a-z0-9-]+$/u.test(policy.deployKeyTitle ?? '')
  ) {
    findings.push('Release-publisher identity policy is incomplete or inconsistent.');
  }
  return findings;
}

function validateTagWorkflowInputs(workflow) {
  const findings = [];
  for (const input of [
    'pull_request:',
    'inspection_comment:',
    'approval_comment:',
    'qualification_run:',
  ]) {
    if (!workflow.includes(input))
      findings.push(`Tag workflow is missing ${input.slice(0, -1)} input.`);
  }
  if (!workflow.includes('node scripts/publish-tag.mjs'))
    findings.push('Tag workflow must publish through the repository approval policy.');
  return findings;
}

function validateTagWorkflowPermissions(workflow, releasePublisher) {
  const findings = [];
  const hasReadPermissions = [
    /^\s{2}contents: read$/mu.test(workflow),
    /^\s{2}issues: read$/mu.test(workflow),
  ].every(Boolean);
  if (!hasReadPermissions)
    findings.push('Tag workflow permissions do not support protected approved publication.');
  if (!/^\s{2}actions: read$/mu.test(workflow))
    findings.push('Tag workflow needs read access to retained inspection artifacts.');
  if (!/^\s{2}checks: read$/mu.test(workflow))
    findings.push('Tag workflow needs read access to the exact squash check suite.');
  if (!workflow.includes(`    environment: ${releasePublisher.environment}`))
    findings.push('Tag workflow must use the protected release publication environment.');
  if (!workflow.includes(`ssh-key: \${{ secrets.${releasePublisher.secretName} }}`))
    findings.push('Tag workflow must use the environment-scoped release deploy key.');
  return findings;
}

function missingWorkflowRequirements(section, requirements, label) {
  return requirements
    .filter((requirement) => !section.includes(requirement))
    .map((requirement) => `${label}: ${requirement}.`);
}

function validateHistoricalTagCheckout(resolveSection, buildSection, validationSection) {
  const findings = [];
  findings.push(
    ...missingWorkflowRequirements(
      resolveSection,
      [
        'path: policy',
        'ref: ${{ github.sha }}',
        'node scripts/resolve-tag-target.mjs',
        'squash_sha: ${{ steps.target.outputs.squash_sha }}',
      ],
      'Tag workflow is missing current-policy resolver boundary',
    ),
  );
  findings.push(
    ...missingWorkflowRequirements(
      buildSection,
      [
        'needs: resolve',
        'path: candidate',
        'ref: ${{ needs.resolve.outputs.squash_sha }}',
        'working-directory: candidate',
        'npm run build',
        'npm run test:artifact',
        'name: tag-candidate-product-${{ github.run_id }}',
        'path: candidate/build/app',
      ],
      'Tag workflow is missing isolated candidate-build boundary',
    ),
  );
  const validationRequirements = [
    'path: policy',
    'ref: ${{ github.sha }}',
    'path: candidate',
    'ref: ${{ needs.resolve.outputs.squash_sha }}',
    'needs: [resolve, build]',
    'name: tag-candidate-product-${{ github.run_id }}',
    'path: candidate-product/build/app',
    '--candidate ../candidate',
    '--artifact ../candidate-product',
    'git -C policy diff --quiet',
    'git -C policy diff --cached --quiet',
    'git -C candidate diff --quiet',
    'git -C candidate diff --cached --quiet',
  ];
  findings.push(
    ...missingWorkflowRequirements(
      validationSection,
      validationRequirements,
      'Tag workflow is missing trusted validation boundary',
    ),
  );
  if ((resolveSection.match(/persist-credentials: false/gu) ?? []).length !== 1) {
    findings.push('Tag resolver checkout must not persist repository credentials.');
  }
  if ((buildSection.match(/persist-credentials: false/gu) ?? []).length !== 1) {
    findings.push('Tag build checkout must not persist repository credentials.');
  }
  if ((validationSection.match(/persist-credentials: false/gu) ?? []).length !== 2) {
    findings.push('Tag validation checkouts must not persist repository credentials.');
  }
  if (/working-directory: candidate|npm run/u.test(validationSection)) {
    findings.push('Trusted tag validation may not execute candidate package commands.');
  }
  if (/secrets\./u.test(resolveSection + buildSection + validationSection)) {
    findings.push('Tag resolution, candidate build, and validation must not receive secrets.');
  }
  return findings;
}

function validateReleaseKeyJob(publicationSection) {
  const publicationTargetRequirements = [
    'path: ${{ runner.temp }}/release-tag',
    'ref: ${{ steps.target.outputs.sha }}',
    'policy-sha.txt',
    'predecessor-tag.txt',
    'tag-history-digest.txt',
    'test "$(git rev-parse HEAD)" = "$tag_sha"',
    'test "$remote_main_sha" = "$policy_sha"',
    'test "$current_tag_history_digest" = "$tag_history_digest"',
    'test -n "$(git ls-remote --refs --tags origin "refs/tags/$predecessor_tag")"',
    '--force-with-lease="refs/tags/$tag_name:"',
  ];
  const findings = missingWorkflowRequirements(
    publicationSection,
    publicationTargetRequirements,
    'Tag publisher is missing exact-target step',
  );
  if (/node scripts\/|npm (?:ci|run)/u.test(publicationSection)) {
    findings.push('Release-key job may not execute repository scripts or package commands.');
  }
  return findings;
}

function validateReleaseKeyBoundary(
  workflow,
  publicationStart,
  validationSection,
  releasePublisher,
) {
  const findings = [];
  const secretPosition = workflow.indexOf(
    `ssh-key: \${{ secrets.${releasePublisher.secretName} }}`,
  );
  const keyFollowsValidation = [
    workflow.includes('    needs: validate'),
    publicationStart !== -1,
    secretPosition >= publicationStart,
    validationSection.includes('pattern: media-qualified-*'),
    validationSection.includes('run-id: ${{ inputs.qualification_run }}'),
    validationSection.includes('--qualification qualified-media'),
    validationSection.includes('--qualification-run ${{ inputs.qualification_run }}'),
    validationSection.includes('--evidence build/release-evidence.json'),
    validationSection.includes('node scripts/prepare-merge-evidence.mjs'),
    validationSection.includes('actions/upload-artifact@'),
  ].every(Boolean);
  if (!keyFollowsValidation) {
    findings.push('Release deploy key must remain unavailable until validation artifact succeeds.');
  }
  return findings;
}

function validatePublishWorkflow(workflow, releasePublisher) {
  const resolveStart = workflow.indexOf('  resolve:');
  const buildStart = workflow.indexOf('  build:');
  const validationStart = workflow.indexOf('  validate:');
  const publicationStart = workflow.indexOf('  publish:');
  const resolveSection = workflow.slice(resolveStart, buildStart);
  const buildSection = workflow.slice(buildStart, validationStart);
  const validationSection = workflow.slice(validationStart, publicationStart);
  const publicationSection = workflow.slice(publicationStart);
  const findings = [];
  if (
    resolveStart === -1 ||
    buildStart <= resolveStart ||
    validationStart <= buildStart ||
    publicationStart <= validationStart
  ) {
    findings.push('Tag publication must split resolve, build, validation, and publication jobs.');
  }
  for (const requirement of [
    'group: release-tag-publication',
    'cancel-in-progress: false',
    'queue: max',
  ]) {
    if (!workflow.includes(requirement))
      findings.push(`Tag workflow is missing serial publication policy: ${requirement}.`);
  }
  return [
    ...findings,
    ...validateWorkflowSemantics(workflow, 'publish'),
    ...validateTagWorkflowInputs(workflow),
    ...validateTagWorkflowPermissions(workflow, releasePublisher),
    ...validateHistoricalTagCheckout(resolveSection, buildSection, validationSection),
    ...validateReleaseKeyJob(publicationSection),
    ...validateReleaseKeyBoundary(workflow, publicationStart, validationSection, releasePublisher),
  ];
}

function validateMediaQualificationPolicy(policy, approvalPolicy, inspectionPolicy) {
  const secretNames = [
    policy.accountIdSecretName,
    policy.bucketSecretName,
    policy.accessKeyIdSecretName,
    policy.secretAccessKeySecretName,
  ];
  const valid = [
    policy.environment === 'media-qualification',
    policy.requiresManualApproval === true,
    policy.requiredReviewer === approvalPolicy.approver,
    policy.preventSelfReview === false,
    secretNames.every((name) => /^[A-Z][A-Z0-9_]+$/u.test(name ?? '')),
    new Set(secretNames).size === 4,
    policy.workflowPath === inspectionPolicy.artifactWorkflowPath,
    policy.workflowEvent === inspectionPolicy.artifactWorkflowEvent,
    policy.workflowBranch === inspectionPolicy.artifactWorkflowBranch,
    policy.artifactNamePrefix === inspectionPolicy.artifactNamePrefix,
  ].every(Boolean);
  return valid ? [] : ['Media-qualification policy is incomplete or inconsistent.'];
}

function validateQualifyMediaWorkflow(workflow, policy) {
  const findings = validateWorkflowSemantics(workflow, 'qualify');
  const materializeEnd = workflow.indexOf('  build:');
  const materialize = workflow.slice(0, materializeEnd);
  const buildEnd = workflow.indexOf('  qualify:');
  const build = workflow.slice(materializeEnd, buildEnd);
  const qualify = workflow.slice(buildEnd);
  const requirements = [
    "if: github.ref == 'refs/heads/main'",
    `environment: ${policy.environment}`,
    'ref: refs/heads/main',
    'ref: refs/pull/${{ inputs.pull_request }}/head',
    'node policy/scripts/materialize-assets.mjs',
    `R2_ACCOUNT_ID: \${{ secrets.${policy.accountIdSecretName} }}`,
    `R2_BUCKET: \${{ secrets.${policy.bucketSecretName} }}`,
    `R2_ACCESS_KEY_ID: \${{ secrets.${policy.accessKeyIdSecretName} }}`,
    `R2_SECRET_ACCESS_KEY: \${{ secrets.${policy.secretAccessKeySecretName} }}`,
    'needs: materialize',
    'node policy/scripts/hydrate-materialized-assets.mjs',
    'node policy/scripts/validate-materialized-assets.mjs',
    "VITE_MATERIALIZED_ASSETS: 'true'",
    'name: candidate-product-${{ github.run_id }}',
    'needs: [materialize, build]',
    'path: candidate-source',
    '--source candidate-source',
    '--product candidate-product',
    '--materialized materialized',
    'node policy/scripts/prepare-qualified-media.mjs',
    'retention-days: 30',
  ];
  for (const requirement of requirements) {
    if (!workflow.includes(requirement))
      findings.push(`Media qualification workflow is missing trusted boundary: ${requirement}.`);
  }
  if (materializeEnd === -1 || buildEnd === -1) {
    findings.push(
      'Media qualification must split materialization, candidate build, and finalization.',
    );
  }
  if (/working-directory: candidate|npm run/u.test(materialize)) {
    findings.push('R2 credentials may not coexist with candidate-controlled code execution.');
  }
  if (/secrets\./u.test(build) || /working-directory: candidate|npm run/u.test(qualify)) {
    findings.push(
      'Candidate execution and finalization may not receive media credentials or share a job.',
    );
  }
  if (/^\s{2}(?:contents|actions): write$/mu.test(workflow)) {
    findings.push('Media qualification may not grant its generic token write permission.');
  }
  return findings;
}

function validHostedDeployKeys(keys, policy) {
  const writeKeys = keys.filter((key) => key.read_only === false && key.enabled !== false);
  return writeKeys.length === 1 && writeKeys[0].title === policy.deployKeyTitle;
}

function validHostedEnvironment(environment, policy) {
  const reviewerRule = environment.protection_rules?.find(
    (rule) => rule.type === 'required_reviewers',
  );
  if (environment.name !== policy.environment) return false;
  if (!policy.requiresManualApproval) return reviewerRule === undefined;
  const reviewers = reviewerRule?.reviewers ?? [];
  return (
    reviewerRule?.prevent_self_review === policy.preventSelfReview &&
    reviewers.length === 1 &&
    reviewers[0].type === 'User' &&
    reviewers[0].reviewer?.login === policy.requiredReviewer
  );
}

function validDeploymentBranchPolicy(environment) {
  return (
    environment.deployment_branch_policy?.protected_branches === true &&
    environment.deployment_branch_policy?.custom_branch_policies === false
  );
}

export function validateHostedReleasePublisher({ keys, environment, secrets, policy }) {
  const findings = [];
  if (!validHostedDeployKeys(keys, policy))
    findings.push('Repository must have exactly one named write-enabled release deploy key.');
  if (!validHostedEnvironment(environment, policy))
    findings.push('Release environment must not require a duplicate manual review.');
  if (!validDeploymentBranchPolicy(environment))
    findings.push('Release environment must accept protected branches only.');
  if (!secrets.some((secret) => secret.name === policy.secretName))
    findings.push('Release environment is missing its deploy-key secret.');
  return findings;
}

export function validateHostedAuthorizationPublisher({ environment, secrets, policy }) {
  const findings = [];
  if (!validHostedEnvironment(environment, policy))
    findings.push('Merge-authorization environment must not require a duplicate manual review.');
  if (!validDeploymentBranchPolicy(environment))
    findings.push('Merge-authorization environment must accept protected branches only.');
  for (const name of [policy.appIdSecretName, policy.privateKeySecretName]) {
    if (!secrets.some((secret) => secret.name === name))
      findings.push(`Merge-authorization environment is missing ${name}.`);
  }
  return findings;
}

export function validateHostedMediaQualification({ environment, secrets, policy }) {
  const findings = [];
  if (!validHostedEnvironment(environment, policy))
    findings.push('Media-qualification environment does not require the configured owner review.');
  if (!validDeploymentBranchPolicy(environment))
    findings.push('Media-qualification environment must accept protected branches only.');
  for (const name of [
    policy.accountIdSecretName,
    policy.bucketSecretName,
    policy.accessKeyIdSecretName,
    policy.secretAccessKeySecretName,
  ]) {
    if (!secrets.some((secret) => secret.name === name))
      findings.push(`Media-qualification environment is missing ${name}.`);
  }
  return findings;
}

export async function fetchAllDeployKeys(github) {
  const keys = [];
  let page = 1;
  while (true) {
    const batch = await github(`/keys?per_page=100&page=${page}`);
    keys.push(...batch);
    if (batch.length < 100) return keys;
    page += 1;
  }
}

export async function fetchAllRepositorySecrets(github) {
  const secrets = [];
  let page = 1;
  while (true) {
    const response = await github(`/actions/secrets?per_page=100&page=${page}`);
    const batch = response.secrets ?? [];
    secrets.push(...batch);
    if (batch.length < 100) return secrets;
    page += 1;
  }
}

export function validateHostedSecretIsolation({
  repositorySecrets,
  authorizationPublisher,
  releasePublisher,
  mediaQualification,
}) {
  const protectedSecretNames = new Set([
    authorizationPublisher.appIdSecretName,
    authorizationPublisher.privateKeySecretName,
    releasePublisher.secretName,
    mediaQualification.accountIdSecretName,
    mediaQualification.bucketSecretName,
    mediaQualification.accessKeyIdSecretName,
    mediaQualification.secretAccessKeySecretName,
  ]);
  return repositorySecrets
    .filter(({ name }) => protectedSecretNames.has(name))
    .map(
      ({ name }) =>
        `${name} must exist only in its protected environment, not as a repository secret.`,
    );
}

export function validateRepositoryPolicy({
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
}) {
  return [
    ...validateSettings(settings),
    ...validateRuleScope(ruleset),
    ...validateBaselineProtection(ruleset),
    ...validatePullRequestRule(ruleset),
    ...validateStatusRules(ruleset),
    ...validateWorkflow(workflow),
    ...validateMergeWorkflow(mergeWorkflow, approvalPolicy, authorizationPublisher),
    ...validateAuthorizationPublisher(authorizationPublisher),
    ...validateInspectionPolicy(inspectionPolicy),
    ...validateMediaQualificationPolicy(mediaQualification, approvalPolicy, inspectionPolicy),
    ...validateQualifyMediaWorkflow(qualifyMediaWorkflow, mediaQualification),
    ...validateTagRuleset(tagRuleset),
    ...validateTagImmutabilityRuleset(tagImmutabilityRuleset),
    ...validateReleasePublisherPolicy(releasePublisher),
    ...validatePublishWorkflow(publishWorkflow, releasePublisher),
  ];
}

export async function applyFirstRepositoryMutation(candidate, mutation) {
  const findings = validateRepositoryPolicy(candidate);
  if (findings.length > 0) {
    throw new Error(
      `Refusing provider mutation because local governance is invalid:\n${findings.join('\n')}`,
    );
  }
  return mutation();
}
