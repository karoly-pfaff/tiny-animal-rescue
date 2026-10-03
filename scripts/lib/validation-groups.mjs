export const validationGroups = {
  quick: [
    'format:check',
    'lint',
    'typecheck',
    'test',
    'test:content',
    'test:assets',
    'test:voice-prompts',
    'test:a11y',
    'scan:secrets',
    'scan:watermarks',
    'build',
  ],
  full: [
    'validate:quick',
    'lint:history',
    'validate:waivers',
    'audit:dependencies',
    'audit:licenses',
    'scan:static',
    'test:e2e',
    'test:visual',
    'test:artifact',
  ],
  release: [
    'validate:full',
    'test:content:release',
    'test:assets:materialized',
    'sbom',
    'test:artifact',
  ],
};

export function validateValidationGroups(groups) {
  const findings = [];
  const full = groups.full ?? [];
  const browserMatrixInvocations = ['test:preview', 'test:e2e'].filter((script) =>
    full.includes(script),
  );
  if (browserMatrixInvocations.length !== 1) {
    findings.push(
      'Full validation must execute exactly one canonical non-visual browser matrix invocation.',
    );
  }
  for (const [name, scripts] of Object.entries(groups)) {
    if (new Set(scripts).size !== scripts.length) {
      findings.push(`Validation group ${name} contains a duplicate script invocation.`);
    }
  }
  return findings;
}
