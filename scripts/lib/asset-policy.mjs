const acceptedValues = Object.freeze({
  classification: 'production-safe',
  delivery: 'r2-pending',
  licenseStatus: 'approved',
  ownership: 'base',
  qaStatus: 'approved',
});

function isSafeObjectKey(value) {
  return (
    typeof value === 'string' &&
    /^[a-z0-9][a-z0-9./-]+$/u.test(value) &&
    !value.includes('..') &&
    !value.startsWith('/')
  );
}

function validateIdentity(record) {
  const findings = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(record.id ?? '')) {
    findings.push('Asset ID must use lower-case kebab-case.');
  }
  if (!isSafeObjectKey(record.objectKey)) {
    findings.push('Asset objectKey must be a safe relative R2 key.');
  }
  if (!Number.isInteger(record.width) || !Number.isInteger(record.height)) {
    findings.push('Asset dimensions must be integer pixels.');
  }
  return findings;
}

function validateMetadata(record) {
  return Object.entries(acceptedValues)
    .filter(([field, expected]) => record[field] !== expected)
    .map(([field, expected]) => `${field} must be ${expected}.`);
}

function validatePrompt(record, promptText) {
  const findings = [];
  if (!promptText.includes(`Asset ID: \`${record.id ?? ''}\``)) {
    findings.push('Prompt record must name the asset ID.');
  }
  if (!promptText.includes(`R2 object key: \`${record.objectKey ?? ''}\``)) {
    findings.push('Prompt record must name the R2 object key.');
  }
  if (!/no baked text.*watermark/isu.test(promptText)) {
    findings.push('Prompt record must record text and watermark QA.');
  }
  return findings;
}

function validateDimensions(record, dimensions) {
  if (
    dimensions !== null &&
    (dimensions.width !== record.width || dimensions.height !== record.height)
  ) {
    return ['Local working asset dimensions do not match the inventory.'];
  }
  return [];
}

export function validateAssetRecord(record, promptText, dimensions) {
  return [
    ...validateIdentity(record),
    ...validateMetadata(record),
    ...validatePrompt(record, promptText),
    ...validateDimensions(record, dimensions),
  ];
}
