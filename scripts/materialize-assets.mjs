import { createHash, createHmac } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  assetInventoryDigest,
  materializeVerifiedObject,
  materializationPlan,
  repositoryGit,
  verifyCandidateAssetContract,
} from './lib/media-qualification.mjs';
import { verifyMeasuredMedia } from './lib/media-file-policy.mjs';
import { requiredEnvironment } from './lib/workflow-input.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.length === 0) throw new Error(`Missing ${name}.`);
  return value;
}

const hex = (value) => createHash('sha256').update(value).digest('hex');
const hmac = (key, value, encoding) => createHmac('sha256', key).update(value).digest(encoding);

function encodedPath(value) {
  return value
    .split('/')
    .map((segment) =>
      encodeURIComponent(segment).replaceAll(
        /[!'()*]/gu,
        (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join('/');
}

function signedHeaders(url, accessKeyId, secretAccessKey) {
  const now = new Date();
  const amzDate = now.toISOString().replaceAll(/[-:]|\.\d{3}/gu, '');
  const date = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const names = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['GET', url.pathname, '', canonicalHeaders, names, payloadHash].join(
    '\n',
  );
  const scope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, hex(canonicalRequest)].join('\n');
  const dateKey = hmac(`AWS4${secretAccessKey}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = hmac(signingKey, stringToSign, 'hex');
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names}, Signature=${signature}`,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
}

async function fetchObject(endpoint, bucket, object, credentials) {
  const url = new URL(`${endpoint.origin}/${encodedPath(bucket)}/${encodedPath(object.objectKey)}`);
  const response = await fetch(url, {
    redirect: 'error',
    headers: signedHeaders(url, credentials.accessKeyId, credentials.secretAccessKey),
  });
  if (!response.ok) throw new Error(`R2 returned ${response.status} for ${object.objectKey}.`);
  const data = Buffer.from(await response.arrayBuffer());
  const digest = `sha256:${hex(data)}`;
  const contentType = response.headers.get('content-type')?.split(';')[0];
  if (data.length !== object.bytes || digest !== object.digest) {
    throw new Error(`R2 object evidence differs from the lock: ${object.objectKey}.`);
  }
  const measured = await verifyMeasuredMedia(data, { ...object, ...object.measured }, contentType);
  return { data, measured };
}

const candidate = path.resolve(argument('--candidate'));
const output = path.resolve(argument('--output'));
const endpoint = new URL(requiredEnvironment('R2_ENDPOINT'));
if (
  endpoint.protocol !== 'https:' ||
  endpoint.username.length > 0 ||
  endpoint.password.length > 0 ||
  endpoint.search.length > 0 ||
  endpoint.hash.length > 0 ||
  !['', '/'].includes(endpoint.pathname)
) {
  throw new Error('R2_ENDPOINT must be a credential-free HTTPS origin.');
}
const bucket = requiredEnvironment('R2_BUCKET');
if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u.test(bucket)) throw new Error('R2_BUCKET is invalid.');
const credentials = {
  accessKeyId: requiredEnvironment('R2_ACCESS_KEY_ID'),
  secretAccessKey: requiredEnvironment('R2_SECRET_ACCESS_KEY'),
};
const headSha = repositoryGit(candidate, ['rev-parse', 'HEAD']);
const inventoryDigest = await assetInventoryDigest(candidate);
const plan = await materializationPlan(candidate);
const receiptObjects = [];

await mkdir(output, { recursive: true });
for (const object of plan) {
  const { measured } = await materializeVerifiedObject(output, object, () =>
    fetchObject(endpoint, bucket, object, credentials),
  );
  receiptObjects.push({ ...object, measured });
}

await verifyCandidateAssetContract({ sourceRoot: candidate, assetRoot: output });

const receiptPath = path.join(output, 'artifacts/qualification/asset-materialization-receipt.json');
await mkdir(path.dirname(receiptPath), { recursive: true });
await writeFile(
  receiptPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      headSha,
      inventoryDigest,
      sourceIdentity: `${endpoint.host}/${bucket}`,
      syncedAt: new Date().toISOString(),
      objects: receiptObjects.sort((left, right) => left.path.localeCompare(right.path)),
    },
    null,
    2,
  )}\n`,
);
console.log(
  `Materialized and verified ${receiptObjects.length} production asset(s) for ${headSha}.`,
);
