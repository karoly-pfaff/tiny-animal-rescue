import { readFile, writeFile } from 'node:fs/promises';
import {
  firstRescueVoiceCopySource,
  serializeFirstRescueRuntimeVoiceCopy,
} from './lib/voice-runtime-copy.mjs';

const output = 'content/base/assets/first-rescue-voice-copy.json';
const manifest = JSON.parse(await readFile(firstRescueVoiceCopySource, 'utf8'));
const generated = serializeFirstRescueRuntimeVoiceCopy(manifest);

if (process.argv.includes('--check')) {
  const current = await readFile(output, 'utf8');
  if (current !== generated) {
    console.error(`${output} is stale; run npm run generate:voice-copy.`);
    process.exit(1);
  }
  console.log('First-rescue runtime voice projection is current.');
} else {
  await writeFile(output, generated);
  console.log(`Generated ${output}.`);
}
