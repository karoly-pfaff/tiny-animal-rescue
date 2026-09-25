import { validateContentSemantics } from '../sources/content/content-semantic-validator.ts';
import { discoverContentPacks } from './lib/content-pack-discovery.mjs';
import { semanticPacksFromDiscovery } from './lib/content-semantic-input.mjs';

let packs;
try {
  packs = await discoverContentPacks('content', {
    validateManifest: () => undefined,
    validateRecord: () => undefined,
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const findings = validateContentSemantics(semanticPacksFromDiscovery(packs), {
  releaseCatalog: 'v1',
});

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('Release content matches the exact normative v1 catalog.');
