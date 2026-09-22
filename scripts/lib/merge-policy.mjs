import { validateApprovalRecord } from './approval-policy.mjs';
import { validateHistoryPolicy } from './history-policy.mjs';
import { validateInspectionRecord } from './inspection-policy.mjs';
import { qualityChecks } from './repository-policy.mjs';

function validQualityRunIdentity(run, expectation) {
  if (run === undefined) return false;
  return [
    run.workflowId === expectation.workflowId,
    run.workflowPath === expectation.workflowPath,
    run.workflowState === 'active',
    run.path === expectation.workflowPath,
    run.event === expectation.event,
    run.headSha === expectation.commitSha,
    run.headBranch === expectation.headBranch,
    Number.isInteger(run.id),
    Number.isInteger(run.checkSuiteId),
    Number.isInteger(run.runNumber),
    Number.isInteger(run.runAttempt),
  ].every(Boolean);
}

export function validateRequiredQualityChecks(checkRuns, expectation, workflowRuns) {
  const findings = [];
  const relevant = checkRuns.filter((check) => qualityChecks.includes(check.name));
  const trustedRuns = workflowRuns
    .filter((run) => validQualityRunIdentity(run, expectation))
    .sort(
      (left, right) =>
        left.runNumber - right.runNumber ||
        left.runAttempt - right.runAttempt ||
        left.id - right.id,
    );
  const latestRun = trustedRuns.at(-1);
  if (
    latestRun === undefined ||
    latestRun.status !== 'completed' ||
    latestRun.conclusion !== 'success'
  ) {
    findings.push('Newest exact trusted quality workflow run is absent, pending, or failing.');
  }
  const latestSuite = relevant.filter(
    (check) =>
      check.workflowRun?.id === latestRun?.id &&
      check.check_suite?.id === check.workflowRun.checkSuiteId &&
      check.head_sha === expectation.commitSha,
  );
  for (const required of qualityChecks) {
    const matching = latestSuite.filter((check) => check.name === required);
    if (
      matching.length !== 1 ||
      matching[0].status !== 'completed' ||
      matching[0].conclusion !== 'success'
    ) {
      findings.push(
        `Required check ${required} is absent, pending, duplicate, or failing in the latest check suite.`,
      );
    }
  }
  return findings;
}

export function validateCurrentMainAncestry({ baseSha, headSha, comparison }) {
  return comparison.merge_base_commit?.sha === baseSha &&
    comparison.ahead_by > 0 &&
    comparison.status === 'ahead' &&
    comparison.commits?.at(-1)?.sha === headSha
    ? []
    : ['Pull-request head does not contain the current protected main commit.'];
}

export function validateMergeSnapshot({ expectedBaseSha, expectedHeadSha, pullRequest, mainSha }) {
  return pullRequest.state === 'open' &&
    pullRequest.head.sha === expectedHeadSha &&
    pullRequest.base.sha === expectedBaseSha &&
    mainSha === expectedBaseSha
    ? []
    : ['Pull-request head or protected main changed during authorization.'];
}

export function validateEvidenceVersion(evidenceVersion, targetVersion) {
  return evidenceVersion === targetVersion
    ? []
    : ['Candidate product/base-pack version differs from the trusted backlog target.'];
}

export function validateMergeCandidate(
  historyInput,
  checkRuns,
  {
    approval,
    approvalExpectation,
    inspection,
    inspectionExpectation,
    qualityExpectation,
    qualityWorkflowRuns,
  },
) {
  const findings = [
    ...validateHistoryPolicy(historyInput),
    ...validateApprovalRecord(approval, approvalExpectation),
  ];
  if (historyInput.item.requiresInspection) {
    findings.push(...validateInspectionRecord(inspection, inspectionExpectation));
  } else if (inspection !== undefined || inspectionExpectation !== undefined) {
    findings.push('Non-inspected work item must not claim a live inspection record.');
  }
  findings.push(
    ...validateRequiredQualityChecks(checkRuns, qualityExpectation, qualityWorkflowRuns),
  );
  return findings;
}
