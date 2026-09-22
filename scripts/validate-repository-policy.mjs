import { loadRepositoryPolicyFiles } from './lib/repository-policy-files.mjs';
import { validateRepositoryPolicy } from './lib/repository-policy.mjs';

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
const findings = validateRepositoryPolicy({
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
});
if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log('Validated repository settings, main ruleset, and required CI workflow.');
