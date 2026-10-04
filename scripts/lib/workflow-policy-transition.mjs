import { createHash } from 'node:crypto';
import { parse } from 'yaml';

const workflowPaths = {
  ci: '.github/workflows/ci.yml',
  merge: '.github/workflows/merge-epic.yml',
  publish: '.github/workflows/publish-tag.yml',
  qualify: '.github/workflows/qualify-media.yml',
};

const protectedBoundaryPaths = [
  '.github/workflows/ci.yml',
  '.github/workflows/merge-epic.yml',
  '.github/workflows/qualify-media.yml',
  'scripts/merge-epic.mjs',
  'scripts/validate-repository-policy.mjs',
  'scripts/lib/approval-policy.mjs',
  'scripts/lib/github-history.mjs',
  'scripts/lib/history-policy.mjs',
  'scripts/lib/history-repository.mjs',
  'scripts/lib/inspection-policy.mjs',
  'scripts/lib/merge-policy.mjs',
  'scripts/lib/repository-policy-files.mjs',
  'scripts/lib/workflow-policy-transition.mjs',
];

const transitionKinds = ['publish'];

export function policyTransitionDiffArguments(trustedSha) {
  return ['diff', '--name-only', `${trustedSha}..HEAD`];
}

export function validateWorkflowPolicyTransitionRoute({ ownerSession, transition }) {
  return transition !== 'none' && !ownerSession
    ? ['Workflow policy transitions require the authenticated owner-session executor.']
    : [];
}

export function workflowFingerprintFinding(kind) {
  return `${kind} workflow differs from the exact reviewed semantic definition; update the policy fingerprint only with the reviewed workflow change.`;
}

export function workflowSemanticFingerprint(workflow) {
  const document = parse(workflow);
  return createHash('sha256').update(JSON.stringify(document)).digest('hex');
}

function declaredFingerprints(source) {
  return Object.fromEntries(
    Object.keys(workflowPaths).map((kind) => {
      const pattern = new RegExp(`^\\s{2}${kind}: '([0-9a-f]{64})',$`, 'mu');
      return [kind, pattern.exec(source)?.[1]];
    }),
  );
}

function validateProtectedBoundary(changedPaths, transition) {
  const changed = new Set(changedPaths);
  const protectedPaths = protectedBoundaryPaths.filter(
    (path) => path !== workflowPaths[transition],
  );
  const drift = [
    ...protectedPaths,
    ...changedPaths.filter((path) => path.startsWith('deploy/github/')),
  ].filter((path) => changed.has(path));
  return drift.length === 0
    ? []
    : [`Policy transition changes protected merge boundary: ${[...new Set(drift)].join(', ')}.`];
}

function validateFingerprints({ candidate, trusted, transition }) {
  const findings = [];
  const candidateFingerprints = declaredFingerprints(candidate.policySource);
  const trustedFingerprints = declaredFingerprints(trusted.policySource);
  for (const kind of Object.keys(workflowPaths)) {
    const trustedHash = workflowSemanticFingerprint(trusted.workflows[kind]);
    if (trustedFingerprints[kind] !== trustedHash) {
      findings.push(`Trusted ${kind} workflow fingerprint does not match trusted YAML.`);
    }
    if (kind !== transition && candidateFingerprints[kind] !== trustedFingerprints[kind]) {
      findings.push(`Policy transition changes the unrelated ${kind} workflow fingerprint.`);
    }
  }
  const candidateHash = workflowSemanticFingerprint(candidate.workflows[transition]);
  if (candidateFingerprints[transition] !== candidateHash) {
    findings.push(`Candidate ${transition} workflow fingerprint does not match candidate YAML.`);
  }
  if (candidateFingerprints[transition] === trustedFingerprints[transition]) {
    findings.push(`Candidate ${transition} workflow fingerprint did not transition.`);
  }
  return findings;
}

export function validateWorkflowPolicyTransition(input) {
  const { candidate, changedPaths, repositoryFindings, transition, trusted } = input;
  const findings = [];
  if (!transitionKinds.includes(transition)) {
    return [`Unsupported workflow policy transition: ${transition}.`];
  }
  const expectedFinding = workflowFingerprintFinding(transition);
  if (repositoryFindings.length !== 1 || repositoryFindings[0] !== expectedFinding) {
    findings.push('Trusted repository validation found more than the declared fingerprint drift.');
  }
  const changedWorkflows = changedPaths.filter((path) => path.startsWith('.github/workflows/'));
  if (changedWorkflows.join(',') !== workflowPaths[transition]) {
    findings.push('Policy transition must change exactly its declared workflow file.');
  }
  if (!changedPaths.includes('scripts/lib/repository-policy.mjs')) {
    findings.push('Policy transition must update the repository-policy fingerprint definition.');
  }
  findings.push(...validateProtectedBoundary(changedPaths, transition));
  findings.push(...validateFingerprints({ candidate, trusted, transition }));
  return findings;
}
