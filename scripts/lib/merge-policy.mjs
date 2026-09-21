import { validateHistoryPolicy } from './history-policy.mjs';
import { requiredChecks } from './repository-policy.mjs';

export function validateMergeCandidate(historyInput, checkRuns) {
  const findings = validateHistoryPolicy(historyInput);
  const relevant = checkRuns.filter((check) => requiredChecks.includes(check.name));
  const suiteIds = relevant.map((check) => check.check_suite?.id);
  const validSuiteIds = suiteIds.filter((id) => Number.isInteger(id) && id > 0);
  const latestSuiteId = validSuiteIds.length === 0 ? undefined : Math.max(...validSuiteIds);

  if (suiteIds.length !== validSuiteIds.length || latestSuiteId === undefined) {
    findings.push('Required checks have no trustworthy check-suite identity.');
  }

  const latestSuite = relevant.filter((check) => check.check_suite?.id === latestSuiteId);
  for (const required of requiredChecks) {
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
