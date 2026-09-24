import type { ContentPackSource } from './content-registry';
import { diagnostic } from './content-validation-diagnostic.ts';
import type { AssetMetadata } from './world-content-contracts';

export type AssetValidationOptions = Readonly<{
  release?: boolean;
}>;

type AssetReference = Readonly<{
  ownerPackId: string;
  objectKey: string;
  qualified: boolean;
}>;

type AssetUsageReference = Readonly<{
  expectedCategory: AssetMetadata['category'];
  rawReference: string;
}>;

type AssetPathToken = '.mp3' | '.ogg' | '.png' | '.wav' | '.webp' | ':' | 'audio/shared/';
type AssetCategoryToken = AssetMetadata['category'];

const safePathPattern =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?!.*\\)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\/\/)[a-z0-9][a-z0-9./-]*$/u;
const packIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const placeholderPattern = /(?:^|[./-])(?:draft|fallback|placeholder|temp)(?:[./-]|$)/u;
const mp3Extension = '.mp3' satisfies AssetPathToken;
const oggExtension = '.ogg' satisfies AssetPathToken;
const pngExtension = '.png' satisfies AssetPathToken;
const wavExtension = '.wav' satisfies AssetPathToken;
const webpExtension = '.webp' satisfies AssetPathToken;
const referenceSeparator = ':' satisfies AssetPathToken;
const sharedAudioDirectory = 'audio/shared/' satisfies AssetPathToken;
const imageCategory = 'image' satisfies AssetCategoryToken;
const mediaExtensions = Object.freeze({
  'image/png': pngExtension,
  'image/webp': webpExtension,
  'audio/ogg': oggExtension,
  'audio/mpeg': mp3Extension,
  'audio/wav': wavExtension,
});

export function validateContentAssets(
  packs: readonly ContentPackSource[],
  options: AssetValidationOptions = {},
): readonly string[] {
  const inventories = new Map<string, ReadonlyMap<string, AssetMetadata>>();
  const findings = packs.flatMap((pack) => {
    const result = validateInventory(pack);
    inventories.set(pack.id, result.assetsByKey);
    return result.findings;
  });
  findings.push(...packs.flatMap((pack) => validatePackReferences(pack, inventories, options)));
  return Object.freeze(findings);
}

function validateInventory(pack: ContentPackSource): Readonly<{
  assetsByKey: ReadonlyMap<string, AssetMetadata>;
  findings: readonly string[];
}> {
  const assetsByKey = new Map<string, AssetMetadata>();
  const findings = pack.records.assets.flatMap((asset) => {
    const duplicate = assetsByKey.has(asset.objectKey);
    assetsByKey.set(asset.objectKey, asset);
    return [
      ...(duplicate
        ? [diagnostic(`Pack ${pack.id} repeats asset object key ${asset.objectKey}.`)]
        : []),
      ...validateOwnedAsset(pack.id, asset),
    ];
  });
  return { assetsByKey, findings };
}

function validateOwnedAsset(packId: string, asset: AssetMetadata): readonly string[] {
  return [
    ...(asset.ownership === packId
      ? []
      : [diagnostic(`Asset ${asset.id} must be owned by its declaring pack ${packId}.`)]),
    ...(safePathPattern.test(asset.objectKey)
      ? []
      : [diagnostic(`Asset ${asset.id} has an unsafe pack-relative object key.`)]),
    ...validateMediaMetadata(asset),
    ...validateLocaleOwnership(asset),
  ];
}

function validateMediaMetadata(asset: AssetMetadata): readonly string[] {
  const extensionFindings = asset.objectKey.endsWith(mediaExtensions[asset.mediaType])
    ? []
    : [diagnostic(`Asset ${asset.id} object key does not match ${asset.mediaType}.`)];
  const categoryFindings = asset.category === 'image' ? [] : validateAudioMetadata(asset);
  return [...extensionFindings, ...categoryFindings];
}

function validateAudioMetadata(
  asset: Exclude<AssetMetadata, Readonly<{ category: 'image' }>>,
): readonly string[] {
  const validDuration =
    asset.durationBoundsSeconds.min > 0 &&
    asset.durationBoundsSeconds.max >= asset.durationBoundsSeconds.min;
  return validDuration ? [] : [diagnostic(`Audio asset ${asset.id} has invalid duration bounds.`)];
}

function validateLocaleOwnership(asset: AssetMetadata): readonly string[] {
  if (asset.category === 'image') {
    return [];
  }
  if (asset.category === 'voice') {
    return validateVoiceOwnership(asset);
  }
  return validateSharedAudioOwnership(asset);
}

function validateVoiceOwnership(
  asset: Exclude<AssetMetadata, Readonly<{ category: 'image' }>>,
): readonly string[] {
  if (asset.locale === undefined) {
    return [diagnostic(`Voice asset ${asset.id} must declare a locale.`)];
  }
  return asset.objectKey.startsWith(`audio/voice/${asset.locale}/`)
    ? []
    : [diagnostic(`Voice asset ${asset.id} must live under its locale-owned voice path.`)];
}

function validateSharedAudioOwnership(
  asset: Exclude<AssetMetadata, Readonly<{ category: 'image' }>>,
): readonly string[] {
  if (asset.locale !== undefined) {
    return [diagnostic(`Shared audio asset ${asset.id} must not declare a locale.`)];
  }
  return asset.objectKey.startsWith(sharedAudioDirectory)
    ? []
    : [diagnostic(`Shared audio asset ${asset.id} must live under audio/shared/.`)];
}

function validatePackReferences(
  pack: ContentPackSource,
  inventories: ReadonlyMap<string, ReadonlyMap<string, AssetMetadata>>,
  options: AssetValidationOptions,
): readonly string[] {
  const context = { inventories, options };
  return referencedAssets(pack).flatMap((reference) => validateReference(pack, reference, context));
}

type ReferenceContext = Readonly<{
  inventories: ReadonlyMap<string, ReadonlyMap<string, AssetMetadata>>;
  options: AssetValidationOptions;
}>;

function validateReference(
  pack: ContentPackSource,
  usage: AssetUsageReference,
  context: ReferenceContext,
): readonly string[] {
  const reference = parseReference(usage.rawReference, pack.id);
  if (reference === undefined) {
    return [diagnostic(`Pack ${pack.id} contains unsafe asset reference ${usage.rawReference}.`)];
  }
  const findings = validateReferenceDependency(pack, reference);
  const asset = context.inventories.get(reference.ownerPackId)?.get(reference.objectKey);
  if (asset === undefined) {
    return [
      ...findings,
      diagnostic(
        `Pack ${pack.id} references missing asset ${reference.ownerPackId}:${reference.objectKey}.`,
      ),
    ];
  }
  const categoryFindings = validateReferenceCategory(reference, asset, usage);
  const releaseFindings = context.options.release === true ? validateReleaseAsset(asset) : [];
  return [...findings, ...categoryFindings, ...releaseFindings];
}

function validateReferenceCategory(
  reference: AssetReference,
  asset: AssetMetadata,
  usage: AssetUsageReference,
): readonly string[] {
  return asset.category === usage.expectedCategory
    ? []
    : [
        diagnostic(
          `Asset ${reference.ownerPackId}:${reference.objectKey} is used as ${usage.expectedCategory}, but the inventory declares ${asset.category}.`,
        ),
      ];
}

function validateReferenceDependency(pack: ContentPackSource, reference: AssetReference): string[] {
  if (reference.ownerPackId === pack.id) {
    return reference.qualified
      ? [diagnostic(`Pack ${pack.id} must reference its own assets without a pack qualifier.`)]
      : [];
  }
  if (pack.dependencies.includes(reference.ownerPackId)) {
    return [];
  }
  return [
    diagnostic(
      `Pack ${pack.id} references asset pack ${reference.ownerPackId} without declaring a dependency.`,
    ),
  ];
}

function parseReference(rawReference: string, currentPackId: string): AssetReference | undefined {
  const separator = rawReference.indexOf(referenceSeparator);
  const qualified = separator !== -1;
  const ownerPackId = separator === -1 ? currentPackId : rawReference.slice(0, separator);
  const objectKey = separator === -1 ? rawReference : rawReference.slice(separator + 1);
  return packIdPattern.test(ownerPackId) && safePathPattern.test(objectKey)
    ? { ownerPackId, objectKey, qualified }
    : undefined;
}

function validateReleaseAsset(asset: AssetMetadata): readonly string[] {
  const approvedStates = [asset.qaStatus, asset.licenseStatus, asset.provenanceStatus].every(
    (status) => status === 'approved',
  );
  const verifiedDelivery = [
    asset.classification === 'production-safe',
    asset.delivery === 'r2-locked',
    validReleaseBytes(asset.bytes),
    validReleaseDigest(asset.digest),
  ].every(Boolean);
  const placeholder = placeholderPattern.test(`${asset.id}/${asset.role}/${asset.objectKey}`);
  const releasable = [approvedStates, verifiedDelivery, !placeholder].every(Boolean);
  return releasable
    ? []
    : [diagnostic(`Required release asset ${asset.id} is pending, unverified, or a placeholder.`)];
}

function validReleaseBytes(bytes: number | undefined): boolean {
  return typeof bytes === 'number' && bytes > 0;
}

function validReleaseDigest(digest: `sha256:${string}` | undefined): boolean {
  return typeof digest === 'string' && /^sha256:[0-9a-f]{64}$/u.test(digest);
}

function referencedAssets(pack: ContentPackSource): readonly AssetUsageReference[] {
  return [
    ...pack.records.animals.flatMap(({ assets }) => Object.values(assets)),
    ...pack.records.locations.flatMap(({ assets }) => Object.values(assets)),
    ...pack.records.shelterAreas.map(({ assets }) => assets.background),
    ...pack.records.missions.flatMap(({ scene, assets }) => [scene.background, ...assets.required]),
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((rawReference) => ({ expectedCategory: imageCategory, rawReference }));
}
