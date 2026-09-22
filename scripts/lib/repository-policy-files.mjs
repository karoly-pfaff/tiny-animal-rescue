import { readFile } from 'node:fs/promises';

export async function loadRepositoryPolicyFiles() {
  const [
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
    readFile('deploy/github/repository-settings.json', 'utf8').then(JSON.parse),
    readFile('deploy/github/main-ruleset.json', 'utf8').then(JSON.parse),
    readFile('deploy/github/tag-ruleset.json', 'utf8').then(JSON.parse),
    readFile('deploy/github/tag-immutability-ruleset.json', 'utf8').then(JSON.parse),
    readFile('.github/workflows/ci.yml', 'utf8'),
    readFile('.github/workflows/merge-epic.yml', 'utf8'),
    readFile('.github/workflows/publish-tag.yml', 'utf8'),
    readFile('.github/workflows/qualify-media.yml', 'utf8'),
    readFile('deploy/github/approval-policy.json', 'utf8').then(JSON.parse),
    readFile('deploy/github/inspection-policy.json', 'utf8').then(JSON.parse),
    readFile('deploy/github/authorization-publisher.json', 'utf8').then(JSON.parse),
    readFile('deploy/github/release-publisher.json', 'utf8').then(JSON.parse),
    readFile('deploy/github/media-qualification.json', 'utf8').then(JSON.parse),
  ]);
  return {
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
  };
}
