const shaPattern = /^[0-9a-f]{40}$/u;
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

function approvalTargetLabel(operation) {
  return operation === 'tag' ? 'Target' : 'Head';
}

function optionalArtifactLine(artifactDigest) {
  return artifactDigest === undefined ? [] : [`Artifact-Digest: ${artifactDigest}`];
}

function optionalInventoryLine(assetInventoryDigest) {
  return assetInventoryDigest === undefined
    ? []
    : [`Asset-Inventory-Digest: ${assetInventoryDigest}`];
}

function inspectionReference(inspectionCommentId) {
  return inspectionCommentId === undefined
    ? 'Inspection-Comment: none'
    : `Inspection-Comment: #${inspectionCommentId}`;
}

function validOperationDigests(expectation) {
  if (expectation.operation === 'merge') return true;
  return (
    digestPattern.test(expectation.artifactDigest ?? '') &&
    digestPattern.test(expectation.assetInventoryDigest ?? '')
  );
}

export function expectedApprovalBody(expectation) {
  return [
    `Tiny-Rescue-Approval: ${expectation.operation}`,
    `Pull-Request: #${expectation.pullNumber}`,
    `${approvalTargetLabel(expectation.operation)}: ${expectation.targetSha}`,
    `Version: ${expectation.version}`,
    inspectionReference(expectation.inspectionCommentId),
    ...optionalArtifactLine(expectation.artifactDigest),
    ...optionalInventoryLine(expectation.assetInventoryDigest),
  ].join('\n');
}

function validateExpectation(expectation) {
  const validOperation = expectation.operation === 'merge' || expectation.operation === 'tag';
  const validPull = Number.isInteger(expectation.pullNumber) && expectation.pullNumber > 0;
  const validComment = Number.isInteger(expectation.commentId) && expectation.commentId > 0;
  const validInspection =
    expectation.inspectionCommentId === undefined ||
    (Number.isInteger(expectation.inspectionCommentId) && expectation.inspectionCommentId > 0);
  const validIdentity =
    shaPattern.test(expectation.targetSha) && versionPattern.test(expectation.version);
  return (
    validOperation &&
    validPull &&
    validComment &&
    validInspection &&
    validIdentity &&
    validOperationDigests(expectation)
  );
}

function isExpectedOwner(record, approver) {
  return (
    record.authorLogin.toLowerCase() === approver.toLowerCase() &&
    record.authorType === 'User' &&
    record.authorAssociation === 'OWNER'
  );
}

function isImmutableApproval(record) {
  return (
    timestampPattern.test(record.createdAt ?? '') &&
    timestampPattern.test(record.updatedAt ?? '') &&
    record.createdAt === record.updatedAt
  );
}

export function validateApprovalRecord(record, expectation) {
  if (!validateExpectation(expectation)) return ['Approval expectation is structurally invalid.'];
  if (record === undefined) return ['Explicit provider approval is missing.'];
  const findings = [];
  if (record.id !== expectation.commentId)
    findings.push('Approval comment identity differs from the requested authorization record.');
  if (record.issueNumber !== expectation.pullNumber)
    findings.push('Approval comment belongs to a different pull request.');
  if (!isExpectedOwner(record, expectation.approver)) {
    findings.push('Approval comment is not from the configured repository owner.');
  }
  if (record.body !== expectedApprovalBody(expectation))
    findings.push('Approval comment is absent, stale, or does not match the exact candidate.');
  if (!isImmutableApproval(record)) {
    findings.push('Approval comment must be immutable after its original creation.');
  }
  return findings;
}

export function approvalRecordFromGithub(comment) {
  const issueNumber = Number(/\/issues\/(?<number>\d+)$/u.exec(comment.issue_url)?.groups?.number);
  return {
    id: comment.id,
    issueNumber,
    authorLogin: comment.user?.login ?? '',
    authorType: comment.user?.type ?? '',
    authorAssociation: comment.author_association ?? '',
    body: comment.body ?? '',
    url: comment.html_url ?? '',
    createdAt: comment.created_at ?? '',
    updatedAt: comment.updated_at ?? '',
  };
}
