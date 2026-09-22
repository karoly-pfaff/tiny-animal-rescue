export function requiredEnvironment(name) {
  const value = process.env[name];
  if (value === undefined || value.length === 0)
    throw new Error(`Missing required environment ${name}.`);
  return value;
}

function positiveArgument(name) {
  const index = process.argv.indexOf(name);
  const value = Number(index === -1 ? undefined : process.argv[index + 1]);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

export function requiredWorkflowArguments(command, { inspectionRequired = true } = {}) {
  const values = {
    pullNumber: positiveArgument('--pull-request'),
    inspectionCommentId: positiveArgument('--inspection-comment'),
    approvalCommentId: positiveArgument('--approval-comment'),
  };
  if (
    values.pullNumber === undefined ||
    values.approvalCommentId === undefined ||
    (inspectionRequired && values.inspectionCommentId === undefined)
  ) {
    throw new Error(
      `Usage: ${command} --pull-request <number> --inspection-comment <number> --approval-comment <number>`,
    );
  }
  return values;
}
