import { hydrateMaterializedAssets } from './lib/media-qualification.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.length === 0) throw new Error(`Missing ${name}.`);
  return value;
}

await hydrateMaterializedAssets({
  source: argument('--source'),
  materialized: argument('--materialized'),
  destination: argument('--destination'),
});
console.log('Verified the immutable materialization handoff and hydrated the build checkout.');
