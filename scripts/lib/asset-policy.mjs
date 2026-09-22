const acceptedValues = Object.freeze({
  classification: 'production-safe',
  licenseStatus: 'approved',
  ownership: 'base',
  qaStatus: 'approved',
});

const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const acceptedDelivery = new Set(['r2-locked', 'r2-pending']);

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
  const findings = Object.entries(acceptedValues)
    .filter(([field, expected]) => record[field] !== expected)
    .map(([field, expected]) => `${field} must be ${expected}.`);
  if (!acceptedDelivery.has(record.delivery)) {
    findings.push('delivery must be r2-pending or r2-locked.');
  }
  if (record.delivery === 'r2-locked') {
    if (record.provenanceStatus !== 'approved') {
      findings.push('provenanceStatus must be approved for a locked asset.');
    }
    if (record.mediaType !== 'image/png') {
      findings.push('Locked visual assets must declare image/png.');
    }
    if (!Number.isInteger(record.bytes) || record.bytes <= 0) {
      findings.push('Locked visual assets must declare a positive byte count.');
    }
    if (!digestPattern.test(record.digest ?? '')) {
      findings.push('Locked visual assets must declare a sha256 digest.');
    }
    if (typeof record.transparent !== 'boolean') {
      findings.push('Locked visual assets must declare transparency.');
    }
  }
  return findings;
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

function validateObservedMedia(record, observed) {
  if (observed === null) return [];
  const findings = [];
  if (observed.width !== record.width || observed.height !== record.height) {
    findings.push('Local working asset dimensions do not match the inventory.');
  }
  if (record.delivery === 'r2-locked') {
    if (observed.bytes !== record.bytes || observed.digest !== record.digest) {
      findings.push('Local working asset bytes or digest do not match the inventory.');
    }
    if (observed.transparent !== record.transparent) {
      findings.push('Local working asset transparency does not match the inventory.');
    }
  }
  return findings;
}

export function validateAssetRecord(record, promptText, observed) {
  return [
    ...validateIdentity(record),
    ...validateMetadata(record),
    ...validatePrompt(record, promptText),
    ...validateObservedMedia(record, observed),
  ];
}

export function validateRequiredAssetDelivery(record) {
  return record.delivery === 'r2-locked' ? [] : ['Required first-rescue assets must be r2-locked.'];
}
