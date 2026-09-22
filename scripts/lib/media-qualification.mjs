import { createHash, randomUUID } from 'node:crypto';
import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyzeArtifact, enumerateArtifactFiles } from './artifact-evidence.mjs';
import { detectedMediaType, verifyMeasuredMedia } from './media-file-policy.mjs';
import { validateWatermarkRecord } from './watermark-policy.mjs';

const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const shaPattern = /^[0-9a-f]{40}$/u;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const safeKeyPattern = /^[a-z0-9][a-z0-9._/-]*$/u;

export function repositoryGit(root, arguments_) {
  const result = spawnSync('git', ['-C', root, ...arguments_], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Repository Git query failed.');
  return result.stdout.trim();
}

export async function assetInventoryDigest(root) {
  const files = repositoryGit(root, ['ls-files', '--', 'content/*/assets/*.json'])
    .split('\n')
    .filter(Boolean)
    .sort();
  if (files.length === 0) throw new Error('Candidate has no tracked asset inventory.');
  const hash = createHash('sha256');
  for (const file of files) {
    hash
      .update(file)
      .update('\0')
      .update(await readFile(path.join(root, file)))
      .update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}

function fileDigest(data) {
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

export async function candidateVersion(root) {
  const [product, basePack] = await Promise.all([
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'content/base/pack.json'), 'utf8').then(JSON.parse),
  ]);
  const version = typeof product.version === 'string' ? product.version : '';
  if (
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(version) ||
    basePack.version !== version
  ) {
    throw new Error('Candidate product and base-pack versions are absent, invalid, or different.');
  }
  return version;
}

function verifyBinaryWatermark(data, logicalPath) {
  const findings = validateWatermarkRecord({
    channel: 'binary',
    path: logicalPath,
    content: data.toString('latin1'),
  });
  if (findings.length > 0) throw new Error(findings.join('\n'));
}

async function verifyObjectBytes(data, object, logicalPath) {
  if (data.length !== object.bytes || fileDigest(data) !== object.digest) {
    throw new Error(`Materialized object differs from its lock: ${object.path}.`);
  }
  const measured = await verifyMeasuredMedia(
    data,
    { ...object, ...object.measured },
    object.mediaType,
  );
  verifyBinaryWatermark(data, logicalPath);
  return measured;
}

export async function materializeVerifiedObject(root, object, download) {
  const target = path.join(root, object.path);
  try {
    const existing = await readFile(target);
    const measured = await verifyObjectBytes(existing, object, object.path);
    return { measured, reused: true };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const { data } = await download();
  const measured = await verifyObjectBytes(data, object, object.path);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.partial`;
  await writeFile(temporary, data, { flag: 'wx' });
  await rename(temporary, target);
  return { measured, reused: false };
}

function validLockIdentity(lock, packId, packVersion) {
  return [
    lock.schemaVersion === 1,
    lock.packId === packId,
    lock.packVersion === packVersion,
    lock.source === 'r2',
    Array.isArray(lock.objects),
    lock.objects?.length > 0,
  ].every(Boolean);
}

function validMeasuredDeclaration(object, image) {
  const values = image ? [object.width, object.height] : [object.durationMilliseconds];
  return values.every((value) => Number.isInteger(value) && value > 0);
}

function canonicalObjectKey(objectKey) {
  const segments = objectKey.split('/');
  return (
    safeKeyPattern.test(objectKey) &&
    segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..') &&
    path.posix.normalize(objectKey) === objectKey
  );
}

function receiptObject(object, packId, packVersion) {
  const mediaType = typeof object.mediaType === 'string' ? object.mediaType : '';
  const objectKey = typeof object.objectKey === 'string' ? object.objectKey : '';
  const image = mediaType.startsWith('image/');
  const measured = image
    ? { width: object.width, height: object.height }
    : { durationMilliseconds: object.durationMilliseconds };
  const valid = [
    canonicalObjectKey(objectKey),
    digestPattern.test(object.digest),
    Number.isInteger(object.bytes) && object.bytes > 0,
    /^(?:image|audio)\/[a-z0-9.+-]+$/u.test(mediaType),
    object.ownership === packId,
    object.licenseStatus === 'approved',
    object.provenanceStatus === 'approved',
    object.qaStatus === 'approved',
    validMeasuredDeclaration(object, image),
  ].every(Boolean);
  if (!valid) throw new Error(`Materialization lock object is invalid: ${objectKey || '?'}.`);
  return {
    packId,
    packVersion,
    path: `content/${packId}/assets/${object.objectKey}`,
    objectKey: object.objectKey,
    digest: object.digest,
    bytes: object.bytes,
    mediaType: object.mediaType,
    ownership: object.ownership,
    licenseStatus: object.licenseStatus,
    provenanceStatus: object.provenanceStatus,
    qaStatus: object.qaStatus,
    measured,
  };
}

export async function materializationPlan(root) {
  const lockFiles = repositoryGit(root, [
    'ls-files',
    '--',
    'content/*/assets/materialization-lock.json',
  ])
    .split('\n')
    .filter(Boolean)
    .sort();
  if (lockFiles.length === 0) throw new Error('Candidate has no materialization lock.');
  const objects = [];
  const paths = new Set();
  for (const file of lockFiles) {
    const packId = file.split('/')[1];
    const [lock, pack] = await Promise.all([
      readFile(path.join(root, file), 'utf8').then(JSON.parse),
      readFile(path.join(root, `content/${packId}/pack.json`), 'utf8').then(JSON.parse),
    ]);
    if (!validLockIdentity(lock, packId, pack.version)) {
      throw new Error(`${file}: materialization lock identity is invalid.`);
    }
    const packKeys = new Set();
    for (const object of lock.objects) {
      if (packKeys.has(object.objectKey)) {
        throw new Error(`${file}: duplicate materialization object key ${object.objectKey}.`);
      }
      packKeys.add(object.objectKey);
      const expected = receiptObject(object, packId, pack.version);
      if (paths.has(expected.path))
        throw new Error(`Duplicate materialization path ${expected.path}.`);
      paths.add(expected.path);
      objects.push(expected);
    }
  }
  return objects.sort((left, right) => left.path.localeCompare(right.path));
}

function assertReceiptShape(receipt, expectedHeadSha, expectedInventoryDigest) {
  const valid = [
    receipt.schemaVersion === 1,
    receipt.headSha === expectedHeadSha,
    receipt.inventoryDigest === expectedInventoryDigest,
    Array.isArray(receipt.objects),
    receipt.objects?.length > 0,
    shaPattern.test(receipt.headSha),
    digestPattern.test(receipt.inventoryDigest),
    typeof receipt.sourceIdentity === 'string',
    /^[A-Za-z0-9.-]+\/[a-z0-9][a-z0-9.-]+$/u.test(receipt.sourceIdentity),
    timestampPattern.test(receipt.syncedAt),
  ].every(Boolean);
  if (!valid) {
    throw new Error('Asset-materialization receipt identity is invalid.');
  }
}

function validReceiptObject(object, observed) {
  return [
    typeof object.path === 'string',
    /^content\/[a-z0-9-]+\/assets\/[a-z0-9][a-z0-9._/-]*$/u.test(object.path),
    !object.path.includes('/../'),
    digestPattern.test(object.digest),
    Number.isInteger(object.bytes),
    object.bytes > 0,
    !observed.has(object.path),
  ].every(Boolean);
}

export async function verifyMaterializationReceipt({
  receipt,
  sourceRoot,
  assetRoot,
  expectedHeadSha,
  expectedInventoryDigest,
}) {
  assertReceiptShape(receipt, expectedHeadSha, expectedInventoryDigest);
  const expectedObjects = await materializationPlan(sourceRoot);
  if (JSON.stringify(receipt.objects) !== JSON.stringify(expectedObjects)) {
    throw new Error(
      'Asset-materialization receipt differs from the tracked materialization locks.',
    );
  }
  const observed = new Set();
  for (const object of receipt.objects) {
    if (!validReceiptObject(object, observed)) {
      throw new Error('Asset-materialization receipt contains an invalid object record.');
    }
    observed.add(object.path);
    const data = await readFile(path.join(assetRoot, object.path));
    await verifyObjectBytes(data, object, object.path);
  }
  return fileDigest(Buffer.from(`${JSON.stringify(receipt)}\n`));
}

async function verifyPackagedObjects(root, objects) {
  for (const object of objects) {
    const data = await readFile(path.join(root, 'build/app', object.path));
    if (data.length !== object.bytes || fileDigest(data) !== object.digest) {
      throw new Error(`Packaged production object differs from trusted media: ${object.path}.`);
    }
    await verifyMeasuredMedia(data, { ...object, ...object.measured }, object.mediaType);
    verifyBinaryWatermark(data, `build/app/${object.path}`);
  }
}

const mediaExtension = /\.(?:aac|flac|gif|jpe?g|m4a|mp3|mp4|ogg|png|svg|wav|webm|webp)$/iu;

async function verifyArtifactFileClosure(file, artifactRoot, allowedPaths, packPrefixes) {
  const relative = path.relative(artifactRoot, file).replaceAll('\\', '/');
  const inPackAssetTree = packPrefixes.some((prefix) => relative.startsWith(prefix));
  const detectedType = await detectedMediaType(await readFile(file));
  const detectedMedia = /^(?:audio|image|video)\//u.test(detectedType ?? '');
  if (
    !allowedPaths.has(relative) &&
    (mediaExtension.test(relative) || inPackAssetTree || detectedMedia)
  ) {
    throw new Error(`Production artifact contains unlocked media: ${relative}.`);
  }
}

function verifyRuntimeReferences(text, allowedPaths, allowedKeys) {
  const references =
    text.match(
      /(?:\.\.\/|\.\/|\/)?[a-z0-9][a-z0-9._/-]*\.(?:aac|flac|gif|jpe?g|m4a|mp3|mp4|ogg|png|svg|wav|webm|webp)/giu,
    ) ?? [];
  for (const reference of references) {
    const normalized = reference.replace(/^(?:\.\.\/|\.\/|\/)+/u, '');
    if (!allowedPaths.has(normalized) && !allowedKeys.has(normalized)) {
      throw new Error(`Production artifact references unlocked media: ${reference}.`);
    }
  }
}

function verifyRequiredObjectReferences(text, objects) {
  for (const object of objects) {
    const packPrefix = `content/${object.packId}/assets/`;
    if (!text.includes(packPrefix) || !text.includes(object.objectKey)) {
      throw new Error(`Production artifact does not reference packaged media: ${object.path}.`);
    }
  }
}

async function verifyRuntimeAssetClosure(root, objects) {
  const artifactRoot = path.join(root, 'build/app');
  const { files, findings } = await enumerateArtifactFiles(artifactRoot);
  if (findings.length > 0) throw new Error(findings.join('\n'));
  const allowedPaths = new Set(objects.map((object) => object.path));
  const allowedKeys = new Set(objects.map((object) => object.objectKey));
  const packPrefixes = [...new Set(objects.map(({ packId }) => `content/${packId}/assets/`))];
  await Promise.all(
    files.map((file) => verifyArtifactFileClosure(file, artifactRoot, allowedPaths, packPrefixes)),
  );
  const textFiles = files.filter((file) => /\.(?:css|html|[cm]?js|json|txt)$/iu.test(file));
  const text = (await Promise.all(textFiles.map((file) => readFile(file, 'utf8')))).join('\n');
  verifyRuntimeReferences(text, allowedPaths, allowedKeys);
  verifyRequiredObjectReferences(text, objects);
}

export function qualifiedArtifactName(evidence, prefix) {
  return [
    prefix.replace(/-$/u, ''),
    evidence.headSha,
    evidence.artifactDigest.slice('sha256:'.length),
    evidence.assetInventoryDigest.slice('sha256:'.length),
  ].join('-');
}

export async function stageQualifiedMedia({
  source,
  product,
  materialized,
  policy,
  output,
  artifactNamePrefix,
}) {
  const headSha = repositoryGit(source, ['rev-parse', 'HEAD']);
  const policySha = repositoryGit(policy, ['rev-parse', 'HEAD']);
  const [inventoryDigest, version] = await Promise.all([
    assetInventoryDigest(source),
    candidateVersion(source),
  ]);
  const receiptPath = path.join(
    materialized,
    'artifacts/qualification/asset-materialization-receipt.json',
  );
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
  const receiptDigest = await verifyMaterializationReceipt({
    receipt,
    sourceRoot: source,
    assetRoot: materialized,
    expectedHeadSha: headSha,
    expectedInventoryDigest: inventoryDigest,
  });
  await mkdir(output, { recursive: true });
  await Promise.all([
    cp(path.join(product, 'build/app'), path.join(output, 'build/app'), { recursive: true }),
    cp(path.join(product, 'build/reports/playwright'), path.join(output, 'visual'), {
      recursive: true,
    }),
    cp(receiptPath, path.join(output, 'asset-materialization-receipt.json')),
  ]);
  for (const object of receipt.objects) {
    for (const target of [
      path.join(output, object.path),
      path.join(output, 'build/app', object.path),
    ]) {
      await mkdir(path.dirname(target), { recursive: true });
      await cp(path.join(materialized, object.path), target);
    }
  }
  await verifyPackagedObjects(output, receipt.objects);
  await verifyRuntimeAssetClosure(output, receipt.objects);
  const { findings, report } = await analyzeArtifact(output);
  if (findings.length > 0) throw new Error(findings.join('\n'));
  const evidence = {
    schemaVersion: 1,
    headSha,
    policySha,
    version,
    artifactDigest: `sha256:${report.digest}`,
    assetInventoryDigest: inventoryDigest,
    receiptDigest,
    objectCount: receipt.objects.length,
  };
  await writeFile(
    path.join(output, 'media-qualification.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  return { evidence, artifactName: qualifiedArtifactName(evidence, artifactNamePrefix) };
}

export async function verifyQualifiedMedia({
  source,
  qualification,
  expectedHeadSha,
  expectedPolicySha,
  artifactNamePrefix,
}) {
  const evidence = JSON.parse(
    await readFile(path.join(qualification, 'media-qualification.json'), 'utf8'),
  );
  const [inventoryDigest, version] = await Promise.all([
    assetInventoryDigest(source),
    candidateVersion(source),
  ]);
  const receipt = JSON.parse(
    await readFile(path.join(qualification, 'asset-materialization-receipt.json'), 'utf8'),
  );
  const receiptDigest = await verifyMaterializationReceipt({
    receipt,
    sourceRoot: source,
    assetRoot: qualification,
    expectedHeadSha,
    expectedInventoryDigest: inventoryDigest,
  });
  await verifyPackagedObjects(qualification, receipt.objects);
  await verifyRuntimeAssetClosure(qualification, receipt.objects);
  const { findings, report } = await analyzeArtifact(qualification);
  if (findings.length > 0) throw new Error(findings.join('\n'));
  const expected = {
    schemaVersion: 1,
    headSha: expectedHeadSha,
    policySha: expectedPolicySha,
    version,
    artifactDigest: `sha256:${report.digest}`,
    assetInventoryDigest: inventoryDigest,
    receiptDigest,
    objectCount: receipt.objects.length,
  };
  if (JSON.stringify(evidence) !== JSON.stringify(expected)) {
    throw new Error('Qualified-media evidence differs from independently recomputed evidence.');
  }
  return { ...expected, artifactName: qualifiedArtifactName(expected, artifactNamePrefix) };
}

export async function hydrateMaterializedAssets({ source, materialized, destination }) {
  const headSha = repositoryGit(source, ['rev-parse', 'HEAD']);
  const inventoryDigest = await assetInventoryDigest(source);
  const receipt = JSON.parse(
    await readFile(
      path.join(materialized, 'artifacts/qualification/asset-materialization-receipt.json'),
      'utf8',
    ),
  );
  await verifyMaterializationReceipt({
    receipt,
    sourceRoot: source,
    assetRoot: materialized,
    expectedHeadSha: headSha,
    expectedInventoryDigest: inventoryDigest,
  });
  for (const object of receipt.objects) {
    const target = path.join(destination, object.path);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(materialized, object.path), target);
  }
}
