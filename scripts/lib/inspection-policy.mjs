const shaPattern = /^[0-9a-f]{40}$/u;
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const orderedFields = [
  'Pull-Request',
  'Head',
  'Version',
  'Artifact-Digest',
  'Asset-Inventory-Digest',
  'Browser',
  'Locales',
  'Inputs',
  'Viewports',
  'Journeys',
  'Evidence',
  'Inspector',
  'Timestamp',
  'Findings',
];

export function expectedInspectionBody(expectation, details) {
  return [
    'Tiny-Rescue-Inspection: pass',
    `Pull-Request: #${expectation.pullNumber}`,
    `Head: ${expectation.targetSha}`,
    `Version: ${expectation.version}`,
    `Artifact-Digest: ${expectation.artifactDigest}`,
    `Asset-Inventory-Digest: ${expectation.assetInventoryDigest}`,
    `Browser: ${details.browser}`,
    `Locales: ${details.locales}`,
    `Inputs: ${details.inputs}`,
    `Viewports: ${details.viewports}`,
    `Journeys: ${details.journeys}`,
    `Evidence: ${details.evidence}`,
    `Inspector: ${details.inspector}`,
    `Timestamp: ${details.timestamp}`,
    'Findings: none',
  ].join('\n');
}

function parseInspectionBody(body) {
  const [header, ...lines] = body.split('\n');
  if (header !== 'Tiny-Rescue-Inspection: pass') return undefined;
  const entries = lines.map((line) => /^(?<key>[A-Za-z-]+): (?<value>.+)$/u.exec(line)?.groups);
  if (entries.some((entry) => entry === undefined)) return undefined;
  if (entries.map(({ key }) => key).join(',') !== orderedFields.join(',')) return undefined;
  return Object.fromEntries(entries.map(({ key, value }) => [key, value]));
}

function evidenceReference(url, repository) {
  const escapedRepository = repository.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = new RegExp(
    `^https://github\\.com/${escapedRepository}/actions/runs/(?<runId>[1-9]\\d*)/artifacts/(?<artifactId>[1-9]\\d*)$`,
    'u',
  ).exec(url);
  return match === null
    ? undefined
    : { runId: Number(match.groups.runId), artifactId: Number(match.groups.artifactId) };
}

function exactList(value, expected) {
  return Array.isArray(expected) && expected.length > 0 && value === expected.join(',');
}

function validInspectionDetails(fields, expectation) {
  return (
    exactList(fields.Locales, expectation.requiredLocales) &&
    exactList(fields.Inputs, expectation.requiredInputs) &&
    exactList(fields.Viewports, expectation.requiredViewports) &&
    exactList(fields.Journeys, expectation.requiredJourneys) &&
    evidenceReference(fields.Evidence, expectation.repository) !== undefined &&
    fields.Browser.length > 0 &&
    fields.Browser.length <= 100 &&
    fields.Inspector.length > 0 &&
    fields.Inspector.length <= 100 &&
    timestampPattern.test(fields.Timestamp) &&
    fields.Findings === 'none'
  );
}

function validExpectation(expectation) {
  const scalarFieldsAreValid = [
    Number.isInteger(expectation.commentId) && expectation.commentId > 0,
    Number.isInteger(expectation.pullNumber) && expectation.pullNumber > 0,
    shaPattern.test(expectation.targetSha),
    versionPattern.test(expectation.version),
    digestPattern.test(expectation.artifactDigest),
    digestPattern.test(expectation.assetInventoryDigest),
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(expectation.ownerLogin),
    repositoryPattern.test(expectation.repository),
    typeof expectation.artifactNamePrefix === 'string' && expectation.artifactNamePrefix.length > 0,
    expectation.artifactWorkflowPath === '.github/workflows/qualify-media.yml',
    expectation.artifactWorkflowEvent === 'workflow_dispatch',
    expectation.artifactWorkflowBranch === 'main',
    shaPattern.test(expectation.artifactWorkflowHeadSha ?? ''),
  ].every(Boolean);
  const matricesAreValid = [
    expectation.requiredLocales,
    expectation.requiredInputs,
    expectation.requiredViewports,
    expectation.requiredJourneys,
  ].every((values) => Array.isArray(values) && values.length > 0);
  return scalarFieldsAreValid && matricesAreValid;
}

function inspectionIdentityFindings(record, expectation) {
  const findings = [];
  if (record.id !== expectation.commentId)
    findings.push('Inspection comment identity differs from the requested evidence.');
  if (record.issueNumber !== expectation.pullNumber)
    findings.push('Inspection comment belongs to a different pull request.');
  if (
    record.authorLogin.toLowerCase() !== expectation.ownerLogin.toLowerCase() ||
    record.authorType !== 'User' ||
    record.authorAssociation !== 'OWNER'
  )
    findings.push('Inspection comment is not a repository-owner record.');
  return findings;
}

function matchesCandidate(fields, expectation) {
  return (
    fields['Pull-Request'] === `#${expectation.pullNumber}` &&
    fields.Head === expectation.targetSha &&
    fields.Version === expectation.version &&
    fields['Artifact-Digest'] === expectation.artifactDigest &&
    fields['Asset-Inventory-Digest'] === expectation.assetInventoryDigest
  );
}

function validProviderIdentity(artifact, reference, workflowRun, run) {
  return [
    artifact.id === reference.artifactId,
    workflowRun.id === reference.runId,
    workflowRun.headSha === run.headSha,
    run.id === reference.runId,
  ].every(Boolean);
}

function validArtifactWorkflow(run, workflow, expectation) {
  return [
    run.event === expectation.artifactWorkflowEvent,
    run.workflowId === workflow.id,
    workflow.path === expectation.artifactWorkflowPath,
    workflow.state === 'active',
    run.path === expectation.artifactWorkflowPath,
    run.headBranch === expectation.artifactWorkflowBranch,
    run.headSha === expectation.artifactWorkflowHeadSha,
    run.status === 'completed',
    run.conclusion === 'success',
  ].every(Boolean);
}

function validRetainedArtifact(artifact, expectedName) {
  return [
    artifact.expired === false,
    Number.isInteger(artifact.sizeInBytes),
    artifact.sizeInBytes > 0,
    artifact.name === expectedName,
  ].every(Boolean);
}

function validArtifactIdentity(artifact, reference, expectation) {
  const expectedName = [
    expectation.artifactNamePrefix.replace(/-$/u, ''),
    expectation.targetSha,
    expectation.artifactDigest.slice('sha256:'.length),
    expectation.assetInventoryDigest.slice('sha256:'.length),
  ].join('-');
  const { workflowRun = {}, run = {}, workflow = {} } = artifact;
  return [
    validProviderIdentity(artifact, reference, workflowRun, run),
    validArtifactWorkflow(run, workflow, expectation),
    validRetainedArtifact(artifact, expectedName),
  ].every(Boolean);
}

function artifactFindings(record, fields, expectation) {
  const reference = evidenceReference(fields.Evidence, expectation.repository);
  const artifact = record.artifact;
  if (reference === undefined || artifact === undefined) {
    return ['Inspection evidence does not resolve to a retained provider artifact.'];
  }
  if (!validArtifactIdentity(artifact, reference, expectation)) {
    return ['Inspection artifact is expired, empty, misidentified, or belongs to another run.'];
  }
  return [];
}

export function validateInspectionRecord(record, expectation) {
  if (!validExpectation(expectation)) return ['Inspection expectation is structurally invalid.'];
  if (record === undefined) return ['Passing live inspection record is missing.'];
  const findings = inspectionIdentityFindings(record, expectation);
  const fields = parseInspectionBody(record.body);
  if (fields === undefined) return [...findings, 'Inspection comment format or result is invalid.'];
  if (!matchesCandidate(fields, expectation)) {
    findings.push('Inspection comment does not match the exact candidate and evidence digests.');
  }
  if (!validInspectionDetails(fields, expectation))
    findings.push('Inspection matrix or provider evidence URL is incomplete.');
  findings.push(...artifactFindings(record, fields, expectation));
  return findings;
}

function normalizeArtifact(candidate, run, workflow) {
  const workflowRun = candidate.workflow_run ?? {};
  const providerRun = run ?? {};
  const providerWorkflow = workflow ?? {};
  return {
    id: candidate.id,
    name: candidate.name ?? '',
    sizeInBytes: candidate.size_in_bytes,
    expired: candidate.expired,
    workflowRun: {
      id: workflowRun.id,
      headSha: workflowRun.head_sha,
    },
    run: {
      id: providerRun.id,
      event: providerRun.event,
      path: providerRun.path,
      headBranch: providerRun.head_branch,
      headSha: providerRun.head_sha,
      status: providerRun.status,
      conclusion: providerRun.conclusion,
      workflowId: providerRun.workflow_id,
    },
    workflow: {
      id: providerWorkflow.id,
      path: providerWorkflow.path,
      state: providerWorkflow.state,
    },
  };
}

async function fetchArtifact(reference, github) {
  if (reference === undefined) return undefined;
  try {
    const [artifact, run] = await Promise.all([
      github(`/actions/artifacts/${reference.artifactId}`),
      github(`/actions/runs/${reference.runId}`),
    ]);
    const workflow = await github(`/actions/workflows/${run.workflow_id}`);
    return normalizeArtifact(artifact, run, workflow);
  } catch {
    return undefined;
  }
}

export async function inspectionRecordFromGithub(comment, { github, repository }) {
  const body = githubString(comment.body);
  const issueMatch = /\/issues\/(?<number>\d+)$/u.exec(githubString(comment.issue_url));
  const fields = parseInspectionBody(body);
  const reference = fields && evidenceReference(fields.Evidence, repository);
  const artifact = await fetchArtifact(reference, github);
  return githubInspectionRecord(comment, body, issueMatch, artifact);
}

function githubString(value) {
  return typeof value === 'string' ? value : '';
}

function githubInspectionRecord(comment, body, issueMatch, artifact) {
  return {
    id: comment.id,
    issueNumber: Number(issueMatch?.groups?.number),
    authorLogin: comment.user?.login ?? '',
    authorType: comment.user?.type ?? '',
    authorAssociation: comment.author_association ?? '',
    body,
    url: githubString(comment.html_url),
    artifact,
  };
}
