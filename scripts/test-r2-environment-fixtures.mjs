import assert from 'node:assert/strict';
import { r2MaterializationEnvironment } from './lib/r2-environment.mjs';

const accountId = 'a'.repeat(32);
const base = {
  R2_ACCOUNT_ID: accountId,
  R2_ACCESS_KEY_ID: 'fixture-access-key',
  R2_BUCKET: 'tiny-rescue-assets',
  R2_SECRET_ACCESS_KEY: 'fixture-secret-key',
};

const derived = r2MaterializationEnvironment(base);
assert.equal(derived.endpoint.href, `https://${accountId}.r2.cloudflarestorage.com/`);
assert.equal(derived.bucket, base.R2_BUCKET);

const overridden = r2MaterializationEnvironment({
  ...base,
  R2_ENDPOINT: `https://${accountId}.r2.cloudflarestorage.com/${base.R2_BUCKET}`,
});
assert.equal(overridden.endpoint.href, `https://${accountId}.r2.cloudflarestorage.com/`);

assert.throws(
  () => r2MaterializationEnvironment({ ...base, R2_ACCOUNT_ID: '' }),
  /Missing required environment R2_ACCOUNT_ID/u,
);
assert.throws(
  () => r2MaterializationEnvironment({ ...base, R2_ACCOUNT_ID: 'not-an-account-id' }),
  /R2_ACCOUNT_ID is invalid/u,
);
assert.throws(
  () =>
    r2MaterializationEnvironment({
      ...base,
      R2_ENDPOINT: `https://user:password@${accountId}.r2.cloudflarestorage.com`,
    }),
  /credential-free HTTPS origin/u,
);
assert.throws(
  () =>
    r2MaterializationEnvironment({
      ...base,
      R2_ENDPOINT: `https://${accountId}.r2.cloudflarestorage.com/unexpected`,
    }),
  /credential-free HTTPS origin/u,
);

console.log('R2 environment fixtures accepted account-derived and safe override endpoints.');
