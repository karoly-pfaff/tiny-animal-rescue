import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyMeasuredMedia } from './lib/media-file-policy.mjs';
import {
  assetInventoryDigest,
  candidateVersion,
  materializeVerifiedObject,
  qualifiedArtifactName,
  repositoryGit,
  stageQualifiedMedia,
  verifyMaterializationReceipt,
  verifyQualifiedMedia,
} from './lib/media-qualification.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'tiny-rescue-media-fixture-'));
const sourceRoot = path.join(root, 'source');
const assetRoot = path.join(root, 'materialized');
const assetPath = 'content/base/assets/images/fixture.png';
const audioPath = 'content/base/assets/audio/fixture.wav';
const asset = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2JgAAAABJRU5ErkJggg==',
  'base64',
);
const digestFor = (data) => `sha256:${createHash('sha256').update(data).digest('hex')}`;
const lockObject = {
  objectKey: 'images/fixture.png',
  digest: digestFor(asset),
  bytes: asset.length,
  mediaType: 'image/png',
  ownership: 'base',
  licenseStatus: 'approved',
  provenanceStatus: 'approved',
  qaStatus: 'approved',
  width: 1,
  height: 1,
};
const audio = wav(100);
const forbiddenAuthorshipMarker = ['generated', 'by', 'AI'].join(' ');
const audioLockObject = {
  objectKey: 'audio/fixture.wav',
  digest: digestFor(audio),
  bytes: audio.length,
  mediaType: 'audio/wav',
  ownership: 'base',
  licenseStatus: 'approved',
  provenanceStatus: 'approved',
  qaStatus: 'approved',
  durationMilliseconds: 100,
};
const failures = [];

async function rejects(action) {
  try {
    await action();
    return false;
  } catch {
    return true;
  }
}

function git(arguments_) {
  const result = spawnSync('git', ['-C', sourceRoot, ...arguments_], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Fixture Git command failed.');
}

function wav(durationMilliseconds) {
  const sampleRate = 8000;
  const sampleCount = Math.round((sampleRate * durationMilliseconds) / 1000);
  const data = Buffer.alloc(sampleCount, 128);
  const buffer = Buffer.alloc(44 + data.length);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + data.length, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(data.length, 40);
  data.copy(buffer, 44);
  return buffer;
}

function receiptObjectFromLock(object) {
  return {
    packId: 'base',
    packVersion: '0.2.0',
    path: `content/base/assets/${object.objectKey}`,
    objectKey: object.objectKey,
    digest: object.digest,
    bytes: object.bytes,
    mediaType: object.mediaType,
    ownership: object.ownership,
    licenseStatus: object.licenseStatus,
    provenanceStatus: object.provenanceStatus,
    qaStatus: object.qaStatus,
    measured: object.mediaType.startsWith('image/')
      ? { width: object.width, height: object.height }
      : { durationMilliseconds: object.durationMilliseconds },
  };
}

try {
  await Promise.all([
    mkdir(path.join(sourceRoot, 'content/base/assets'), { recursive: true }),
    mkdir(path.dirname(path.join(assetRoot, assetPath)), { recursive: true }),
    mkdir(path.dirname(path.join(assetRoot, audioPath)), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(sourceRoot, 'package.json'),
      `${JSON.stringify({ name: 'fixture', version: '0.2.0' })}\n`,
    ),
    writeFile(
      path.join(sourceRoot, 'content/base/pack.json'),
      `${JSON.stringify({ id: 'base', version: '0.2.0' })}\n`,
    ),
    writeFile(
      path.join(sourceRoot, 'content/base/assets/manifest.json'),
      `${JSON.stringify({ schemaVersion: 1, assets: [] })}\n`,
    ),
    writeFile(
      path.join(sourceRoot, 'content/base/assets/materialization-lock.json'),
      `${JSON.stringify({
        schemaVersion: 1,
        packId: 'base',
        packVersion: '0.2.0',
        source: 'r2',
        objects: [lockObject, audioLockObject],
      })}\n`,
    ),
    writeFile(path.join(assetRoot, assetPath), asset),
    writeFile(path.join(assetRoot, audioPath), audio),
  ]);
  git(['init']);
  git(['config', 'user.email', 'fixture@example.invalid']);
  git(['config', 'user.name', 'Fixture']);
  git(['add', '.']);
  git(['commit', '-m', 'test: fixture']);
  const headSha = repositoryGit(sourceRoot, ['rev-parse', 'HEAD']);
  const inventoryDigest = await assetInventoryDigest(sourceRoot);
  const baseline = {
    schemaVersion: 1,
    headSha,
    inventoryDigest,
    sourceIdentity: 'fixture.r2.example/base',
    syncedAt: '2026-09-22T00:00:00.000Z',
    objects: [lockObject, audioLockObject]
      .map(receiptObjectFromLock)
      .sort((left, right) => left.path.localeCompare(right.path)),
  };
  if ((await candidateVersion(sourceRoot)) !== '0.2.0') {
    failures.push('matching candidate product/base-pack version was rejected');
  }
  await writeFile(
    path.join(sourceRoot, 'package.json'),
    `${JSON.stringify({ name: 'fixture', version: '0.1.0' })}\n`,
  );
  if (!(await rejects(() => candidateVersion(sourceRoot)))) {
    failures.push('candidate product/base-pack version drift was accepted');
  }
  await writeFile(
    path.join(sourceRoot, 'package.json'),
    `${JSON.stringify({ name: 'fixture', version: '0.2.0' })}\n`,
  );
  const reuseRoot = path.join(root, 'idempotent-materialization');
  const reusableObject = receiptObjectFromLock(lockObject);
  let downloads = 0;
  const firstMaterialization = await materializeVerifiedObject(
    reuseRoot,
    reusableObject,
    async () => {
      downloads += 1;
      return { data: asset };
    },
  );
  const secondMaterialization = await materializeVerifiedObject(
    reuseRoot,
    reusableObject,
    async () => {
      downloads += 1;
      return { data: asset };
    },
  );
  if (firstMaterialization.reused || !secondMaterialization.reused || downloads !== 1) {
    failures.push('matching materialized bytes were not reused idempotently');
  }
  const reuseTarget = path.join(reuseRoot, reusableObject.path);
  const mismatchedExisting = Buffer.from('existing mismatch');
  await writeFile(reuseTarget, mismatchedExisting);
  if (
    !(await rejects(() =>
      materializeVerifiedObject(reuseRoot, reusableObject, async () => ({ data: asset })),
    )) ||
    !(await readFile(reuseTarget)).equals(mismatchedExisting)
  ) {
    failures.push('mismatched existing materialized bytes were replaced or accepted');
  }
  async function accepts(receipt) {
    try {
      await verifyMaterializationReceipt({
        receipt,
        sourceRoot,
        assetRoot,
        expectedHeadSha: headSha,
        expectedInventoryDigest: inventoryDigest,
      });
      return true;
    } catch {
      return false;
    }
  }

  if (!(await accepts(structuredClone(baseline)))) failures.push('valid receipt was rejected');
  const wrongHead = structuredClone(baseline);
  wrongHead.headSha = '3'.repeat(40);
  if (await accepts(wrongHead)) failures.push('wrong-head receipt was accepted');

  const substitutedAsset = Buffer.from('candidate replacement');
  await writeFile(path.join(assetRoot, assetPath), substitutedAsset);
  const substituted = structuredClone(baseline);
  const substitutedObject = substituted.objects.find((object) => object.path === assetPath);
  substitutedObject.digest = digestFor(substitutedAsset);
  substitutedObject.bytes = substitutedAsset.length;
  if (await accepts(substituted)) failures.push('receipt-plus-object substitution was accepted');
  await writeFile(path.join(assetRoot, assetPath), asset);

  const duplicate = structuredClone(baseline);
  duplicate.objects.push(structuredClone(duplicate.objects[0]));
  if (await accepts(duplicate)) failures.push('duplicate object path was accepted');
  const escaped = structuredClone(baseline);
  escaped.objects[0].path = 'content/base/assets/../outside.png';
  if (await accepts(escaped)) failures.push('escaping object path was accepted');

  try {
    await verifyMeasuredMedia(asset, lockObject, 'image/png');
  } catch {
    failures.push('valid measured image was rejected');
  }
  if (
    !(await rejects(() => verifyMeasuredMedia(asset, { ...lockObject, width: 2 }, 'image/png')))
  ) {
    failures.push('wrong measured image dimensions were accepted');
  }
  try {
    await verifyMeasuredMedia(
      audio,
      { objectKey: 'audio/fixture.wav', mediaType: 'audio/wav', durationMilliseconds: 100 },
      'audio/wav',
    );
  } catch {
    failures.push('valid measured audio duration was rejected');
  }
  if (
    !(await rejects(() =>
      verifyMeasuredMedia(
        audio,
        { objectKey: 'audio/fixture.wav', mediaType: 'audio/wav', durationMilliseconds: 200 },
        'audio/wav',
      ),
    ))
  ) {
    failures.push('wrong measured audio duration was accepted');
  }

  async function finalizerAccepts(objects, replacements = []) {
    await writeFile(
      path.join(sourceRoot, 'content/base/assets/materialization-lock.json'),
      `${JSON.stringify({
        schemaVersion: 1,
        packId: 'base',
        packVersion: '0.2.0',
        source: 'r2',
        objects,
      })}\n`,
    );
    for (const [relative, data] of replacements)
      await writeFile(path.join(assetRoot, relative), data);
    const mutatedInventory = await assetInventoryDigest(sourceRoot);
    const receipt = {
      ...baseline,
      inventoryDigest: mutatedInventory,
      objects: objects
        .map(receiptObjectFromLock)
        .sort((left, right) => left.path.localeCompare(right.path)),
    };
    const accepted = await (async () => {
      try {
        await verifyMaterializationReceipt({
          receipt,
          sourceRoot,
          assetRoot,
          expectedHeadSha: headSha,
          expectedInventoryDigest: mutatedInventory,
        });
        return true;
      } catch {
        return false;
      }
    })();
    await Promise.all([
      writeFile(
        path.join(sourceRoot, 'content/base/assets/materialization-lock.json'),
        `${JSON.stringify({
          schemaVersion: 1,
          packId: 'base',
          packVersion: '0.2.0',
          source: 'r2',
          objects: [lockObject, audioLockObject],
        })}\n`,
      ),
      writeFile(path.join(assetRoot, assetPath), asset),
      writeFile(path.join(assetRoot, audioPath), audio),
    ]);
    return accepted;
  }

  if (await finalizerAccepts([{ ...lockObject, width: 2 }, audioLockObject])) {
    failures.push('finalizer accepted wrong locked image dimensions');
  }
  if (
    await finalizerAccepts([{ ...lockObject, objectKey: 'images/./fixture.png' }, audioLockObject])
  ) {
    failures.push('finalizer accepted a non-canonical dot-segment object key');
  }
  if (await finalizerAccepts([{ ...lockObject, objectKey: 'images/' }, audioLockObject])) {
    failures.push('finalizer accepted an object key with a terminal empty segment');
  }
  if (await finalizerAccepts([lockObject, { ...audioLockObject, durationMilliseconds: 200 }])) {
    failures.push('finalizer accepted wrong locked audio duration');
  }
  const disguisedAudio = {
    ...lockObject,
    digest: digestFor(audio),
    bytes: audio.length,
  };
  if (await finalizerAccepts([disguisedAudio, audioLockObject], [[assetPath, audio]])) {
    failures.push('finalizer accepted a binary whose detected media type differs from the lock');
  }
  const watermarkedAsset = Buffer.concat([asset, Buffer.from(` ${forbiddenAuthorshipMarker} `)]);
  const watermarkedLock = {
    ...lockObject,
    digest: digestFor(watermarkedAsset),
    bytes: watermarkedAsset.length,
  };
  if (await finalizerAccepts([watermarkedLock, audioLockObject], [[assetPath, watermarkedAsset]])) {
    failures.push('finalizer accepted a measurable binary containing a forbidden watermark marker');
  }

  const product = path.join(root, 'product');
  const qualification = path.join(root, 'qualified');
  await Promise.all([
    mkdir(path.join(product, 'build/app'), { recursive: true }),
    mkdir(path.join(product, 'build/reports/playwright'), { recursive: true }),
    mkdir(path.join(assetRoot, 'artifacts/qualification'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(product, 'build/app/index.html'), '<!doctype html><title>fixture</title>'),
    writeFile(path.join(product, 'build/reports/playwright/report.txt'), 'visual pass'),
    writeFile(
      path.join(assetRoot, 'artifacts/qualification/asset-materialization-receipt.json'),
      `${JSON.stringify(baseline)}\n`,
    ),
  ]);
  if (
    !(await rejects(() =>
      stageQualifiedMedia({
        source: sourceRoot,
        product,
        materialized: assetRoot,
        policy: sourceRoot,
        output: path.join(root, 'missing-runtime-reference'),
        artifactNamePrefix: 'media-qualified-',
      }),
    ))
  ) {
    failures.push('qualified product accepted media that the runtime artifact does not reference');
  }
  await writeFile(
    path.join(product, 'build/app/index.html'),
    `<!doctype html><img src="https://assets.example/${assetPath}"><audio src="./${audioPath}"></audio>`,
  );
  if (
    !(await rejects(() =>
      stageQualifiedMedia({
        source: sourceRoot,
        product,
        materialized: assetRoot,
        policy: sourceRoot,
        output: path.join(root, 'remote-runtime-reference'),
        artifactNamePrefix: 'media-qualified-',
      }),
    ))
  ) {
    failures.push('qualified product accepted a remote production-media URL');
  }
  await writeFile(
    path.join(product, 'build/app/index.html'),
    `<!doctype html><img src="./${assetPath}"><audio src="./${audioPath}"></audio><script>new Audio("https://r2.example/object/12345")</script>`,
  );
  if (
    !(await rejects(() =>
      stageQualifiedMedia({
        source: sourceRoot,
        product,
        materialized: assetRoot,
        policy: sourceRoot,
        output: path.join(root, 'extensionless-remote-reference'),
        artifactNamePrefix: 'media-qualified-',
      }),
    ))
  ) {
    failures.push('qualified product accepted an extensionless absolute runtime URL');
  }
  await writeFile(
    path.join(product, 'build/app/index.html'),
    `<!doctype html><img src="./${assetPath}"><audio src="./${audioPath}"></audio><script>new Audio("https://react.dev/errors/substitute")</script>`,
  );
  if (
    !(await rejects(() =>
      stageQualifiedMedia({
        source: sourceRoot,
        product,
        materialized: assetRoot,
        policy: sourceRoot,
        output: path.join(root, 'allowlist-prefix-remote-reference'),
        artifactNamePrefix: 'media-qualified-',
      }),
    ))
  ) {
    failures.push('qualified product accepted an URL below an allowlisted constant');
  }
  await mkdir(path.join(product, 'build/app/build'), { recursive: true });
  await Promise.all([
    writeFile(
      path.join(product, 'build/app/index.html'),
      `<!doctype html><img src="./${assetPath}"><audio src="./${audioPath}"></audio><script src="./build/evil.mjs"></script>`,
    ),
    writeFile(
      path.join(product, 'build/app/build/evil.mjs'),
      'new Audio("https://r2.example/object/12345")',
    ),
  ]);
  if (
    !(await rejects(() =>
      stageQualifiedMedia({
        source: sourceRoot,
        product,
        materialized: assetRoot,
        policy: sourceRoot,
        output: path.join(root, 'nested-build-reference'),
        artifactNamePrefix: 'media-qualified-',
      }),
    ))
  ) {
    failures.push('qualified artifact identity omitted a nested build directory');
  }
  await rm(path.join(product, 'build/app/build'), { recursive: true, force: true });
  const substitutePath = 'content/base/assets/images/substitute.png';
  await mkdir(path.dirname(path.join(product, 'build/app', substitutePath)), { recursive: true });
  await Promise.all([
    writeFile(
      path.join(product, 'build/app/index.html'),
      `<!doctype html><meta content="./${assetPath}"><audio src="./${audioPath}"></audio><img src="./${substitutePath}">`,
    ),
    writeFile(path.join(product, 'build/app', substitutePath), asset),
  ]);
  if (
    !(await rejects(() =>
      stageQualifiedMedia({
        source: sourceRoot,
        product,
        materialized: assetRoot,
        policy: sourceRoot,
        output: path.join(root, 'active-unlocked-substitute'),
        artifactNamePrefix: 'media-qualified-',
      }),
    ))
  ) {
    failures.push('qualified product accepted a dead trusted reference plus active substitute');
  }
  await rm(path.join(product, 'build/app', substitutePath), { force: true });
  const extensionlessSubstitutePath = 'content/base/assets/images/substitute';
  await Promise.all([
    writeFile(
      path.join(product, 'build/app/index.html'),
      `<!doctype html><meta content="./${assetPath}"><audio src="./${audioPath}"></audio><img src="./${extensionlessSubstitutePath}">`,
    ),
    writeFile(path.join(product, 'build/app', extensionlessSubstitutePath), asset),
  ]);
  if (
    !(await rejects(() =>
      stageQualifiedMedia({
        source: sourceRoot,
        product,
        materialized: assetRoot,
        policy: sourceRoot,
        output: path.join(root, 'extensionless-active-substitute'),
        artifactNamePrefix: 'media-qualified-',
      }),
    ))
  ) {
    failures.push('qualified product accepted an extensionless unlocked media substitute');
  }
  await rm(path.join(product, 'build/app', extensionlessSubstitutePath), { force: true });
  const extraPath = 'content/base/assets/images/extra.png';
  await writeFile(path.join(product, 'build/app', extraPath), asset);
  await writeFile(
    path.join(product, 'build/app/index.html'),
    `<!doctype html><img src="./${assetPath}"><audio src="./${audioPath}"></audio>`,
  );
  if (
    !(await rejects(() =>
      stageQualifiedMedia({
        source: sourceRoot,
        product,
        materialized: assetRoot,
        policy: sourceRoot,
        output: path.join(root, 'extra-unlocked-binary'),
        artifactNamePrefix: 'media-qualified-',
      }),
    ))
  ) {
    failures.push('qualified product accepted an extra unlocked media binary');
  }
  await rm(path.join(product, 'build/app', extraPath), { force: true });
  await writeFile(
    path.join(product, 'build/app/index.html'),
    `<!doctype html><img src="./${assetPath}"><audio src="./${audioPath}"></audio>`,
  );
  const staged = await stageQualifiedMedia({
    source: sourceRoot,
    product,
    materialized: assetRoot,
    policy: sourceRoot,
    output: qualification,
    artifactNamePrefix: 'media-qualified-',
  });
  const verified = await verifyQualifiedMedia({
    source: sourceRoot,
    qualification,
    expectedHeadSha: headSha,
    expectedPolicySha: headSha,
    artifactNamePrefix: 'media-qualified-',
  });
  if (staged.artifactName !== verified.artifactName) {
    failures.push('staged and independently verified qualification identities differ');
  }
  await writeFile(path.join(qualification, 'build/app', assetPath), substitutedAsset);
  if (
    !(await rejects(() =>
      verifyQualifiedMedia({
        source: sourceRoot,
        qualification,
        expectedHeadSha: headSha,
        expectedPolicySha: headSha,
        artifactNamePrefix: 'media-qualified-',
      }),
    ))
  ) {
    failures.push('qualified product accepted a substituted packaged production object');
  }

  const evidence = {
    headSha,
    artifactDigest: `sha256:${'5'.repeat(64)}`,
    assetInventoryDigest: inventoryDigest,
  };
  const expectedName = `media-qualified-${headSha}-${'5'.repeat(64)}-${inventoryDigest.slice(7)}`;
  if (qualifiedArtifactName(evidence, 'media-qualified-') !== expectedName) {
    failures.push('qualified artifact name is not bound to head and digests');
  }
  await writeFile(path.join(root, 'receipt.json'), `${JSON.stringify(baseline)}\n`);
  if ((await readFile(path.join(root, 'receipt.json'), 'utf8')).includes('credential')) {
    failures.push('receipt fixture unexpectedly contains credential material');
  }
} finally {
  await rm(root, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(
  'Media qualification fixtures rejected stale, substituted, duplicate, escaping, mismeasured, watermarked, unreferenced, remote, nested, and unlocked evidence.',
);
