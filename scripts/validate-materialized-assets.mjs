import path from 'node:path';
import { verifyCandidateAssetContract } from './lib/media-qualification.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.length === 0) throw new Error(`Missing ${name}.`);
  return value;
}

const sourceRoot = path.resolve(argument('--source'));
const assetRoot = path.resolve(argument('--materialized'));
const result = await verifyCandidateAssetContract({ sourceRoot, assetRoot });
console.log(`Trusted policy validated ${String(result.objectCount)} materialized asset(s).`);
