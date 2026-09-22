import { loadRepositoryPolicyFiles } from './lib/repository-policy-files.mjs';
import {
  fetchAllDeployKeys,
  fetchAllRepositorySecrets,
  validateHostedAuthorizationPublisher,
  validateHostedMediaQualification,
  validateHostedReleasePublisher,
  validateHostedSecretIsolation,
  validateRepositoryPolicy,
} from './lib/repository-policy.mjs';
import { requiredEnvironment } from './lib/workflow-input.mjs';

const repository = requiredEnvironment('GITHUB_REPOSITORY');
const token = requiredEnvironment('GITHUB_TOKEN');
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
const authorizationAppId = Number(requiredEnvironment(authorizationPublisher.appIdEnvironment));
if (!Number.isInteger(authorizationAppId) || authorizationAppId <= 0)
  throw new Error('AUTHORIZATION_APP_ID must be a positive GitHub App ID.');

const hostedMainRuleset = structuredClone(ruleset);
hostedMainRuleset.bypass_actors[0].actor_id = authorizationAppId;
hostedMainRuleset.rules
  .find((rule) => rule.type === 'required_status_checks')
  .parameters.required_status_checks.find(
    (check) => check.context === 'authorization',
  ).integration_id = authorizationAppId;

async function githubApi(pathname, method = 'GET', body) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`GitHub API ${method} ${pathname} failed with ${response.status}.`);
  return response.json();
}

const github = (pathname, method = 'GET', body) =>
  githubApi(`/repos/${repository}${pathname}`, method, body);

await github('', 'PATCH', settings);
const rulesets = await github('/rulesets');
async function applyRuleset(candidate) {
  const existing = rulesets.find((hosted) => hosted.name === candidate.name);
  return existing === undefined
    ? github('/rulesets', 'POST', candidate)
    : github(`/rulesets/${existing.id}`, 'PUT', candidate);
}
const [applied, appliedTags, appliedTagImmutability] = await Promise.all([
  applyRuleset(hostedMainRuleset),
  applyRuleset(tagRuleset),
  applyRuleset(tagImmutabilityRuleset),
]);
const reviewer = await githubApi(`/users/${encodeURIComponent(releasePublisher.requiredReviewer)}`);
async function configureEnvironment(policy) {
  const path = `/environments/${encodeURIComponent(policy.environment)}`;
  await github(path, 'PUT', {
    wait_timer: 0,
    prevent_self_review: policy.preventSelfReview,
    reviewers: [{ type: 'User', id: reviewer.id }],
    deployment_branch_policy: { protected_branches: true, custom_branch_policies: false },
  });
  return path;
}
const [environmentPath, authorizationEnvironmentPath, mediaEnvironmentPath] = await Promise.all([
  configureEnvironment(releasePublisher),
  configureEnvironment(authorizationPublisher),
  configureEnvironment(mediaQualification),
]);
const repositoryState = await github('');
const [
  hostedRuleset,
  hostedTagRuleset,
  hostedTagImmutabilityRuleset,
  deployKeys,
  hostedEnvironment,
  environmentSecrets,
  hostedAuthorizationEnvironment,
  authorizationEnvironmentSecrets,
  hostedMediaEnvironment,
  mediaEnvironmentSecrets,
  repositorySecrets,
] = await Promise.all([
  github(`/rulesets/${applied.id}`),
  github(`/rulesets/${appliedTags.id}`),
  github(`/rulesets/${appliedTagImmutability.id}`),
  fetchAllDeployKeys(github),
  github(environmentPath),
  github(`${environmentPath}/secrets`),
  github(authorizationEnvironmentPath),
  github(`${authorizationEnvironmentPath}/secrets`),
  github(mediaEnvironmentPath),
  github(`${mediaEnvironmentPath}/secrets`),
  fetchAllRepositorySecrets(github),
]);
const findings = [
  ...validateRepositoryPolicy({
    settings: repositoryState,
    ruleset: hostedRuleset,
    workflow,
    mergeWorkflow,
    publishWorkflow,
    qualifyMediaWorkflow,
    tagRuleset: hostedTagRuleset,
    tagImmutabilityRuleset: hostedTagImmutabilityRuleset,
    approvalPolicy,
    inspectionPolicy,
    authorizationPublisher,
    releasePublisher,
    mediaQualification,
    authorizationAppId,
  }),
  ...validateHostedReleasePublisher({
    keys: deployKeys,
    environment: hostedEnvironment,
    secrets: environmentSecrets.secrets,
    policy: releasePublisher,
  }),
  ...validateHostedAuthorizationPublisher({
    environment: hostedAuthorizationEnvironment,
    secrets: authorizationEnvironmentSecrets.secrets,
    policy: authorizationPublisher,
  }),
  ...validateHostedMediaQualification({
    environment: hostedMediaEnvironment,
    secrets: mediaEnvironmentSecrets.secrets,
    policy: mediaQualification,
  }),
  ...validateHostedSecretIsolation({
    repositorySecrets,
    authorizationPublisher,
    releasePublisher,
    mediaQualification,
  }),
];
if (findings.length > 0) throw new Error(findings.join('\n'));
console.log(`Applied and verified branch/tag governance for ${repository}.`);
