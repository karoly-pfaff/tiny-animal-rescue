const suspiciousUnicode = /[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u;

const signaturePatterns = [
  [
    'automated authorship',
    /\b(?:generated|created|written)\s+(?:by|with)\s+(?:an?\s+)?(?:ai|agent|bot|chatgpt|claude|gemini|github copilot)\b/iu,
  ],
  ['fabricated author trailer', /^(?:co-authored-by|reviewed-by|assisted-by):/imu],
  [
    'promotional attribution',
    /\b(?:powered by|made with)\s+(?:ai|an?\s+agent|[a-z0-9_-]+\s+(?:ai|editor|generator))\b/iu,
  ],
  ['agent or editor badge', /(?:shields\.io|badge)[^\s)]*(?:ai|agent|bot|editor|generated)/iu],
  [
    'machine signature',
    /\b(?:chatgpt|github copilot|claude|gemini)\s+(?:generated|authored|signature)\b/iu,
  ],
];

const forbiddenMetadataKeys = new Set([
  'authorshipagent',
  'createdbyai',
  'generatorbadge',
  'promotionaltool',
  'watermark',
]);

const channels = new Set(['text', 'metadata', 'ocr', 'visual', 'audio', 'binary']);

function metadataFindings(value, path, findings) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => metadataFindings(entry, `${path}[${index}]`, findings));
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    const normalized = key.replaceAll(/[^a-z]/giu, '').toLowerCase();
    if (forbiddenMetadataKeys.has(normalized)) {
      findings.push(`${path}.${key}: forbidden promotional/authorship metadata field.`);
    }
    metadataFindings(entry, `${path}.${key}`, findings);
  }
}

export function validateWatermarkRecord(record) {
  const findings = [];
  if (!channels.has(record.channel)) {
    return [`${record.path}: unknown watermark inspection channel ${record.channel}.`];
  }
  const content = typeof record.content === 'string' ? record.content : '';
  if (suspiciousUnicode.test(content)) {
    findings.push(`${record.path}: suspicious hidden or bidirectional Unicode.`);
  }
  for (const [label, pattern] of signaturePatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      findings.push(`${record.path}: ${label}.`);
    }
  }
  if (record.channel === 'metadata' && record.metadata !== undefined) {
    metadataFindings(record.metadata, record.path, findings);
  }
  return findings;
}

export function isWatermarkPolicyExemption(filePath) {
  return filePath.replaceAll('\\', '/') === 'tests/fixtures/governance/governance-cases.json';
}
