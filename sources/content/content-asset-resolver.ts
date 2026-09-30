import { parseAssetReference } from './asset-reference';
import type { ContentRegistry } from './content-registry';

type ShellAssetRole = 'start-background';

const startBackgroundRole = 'start-background' satisfies ShellAssetRole;

export function resolveContentAsset(
  registry: ContentRegistry,
  consumingPackId: string,
  reference: string,
): string | null {
  const { objectKey, ownerPackId } = requiredAssetReference(reference, consumingPackId);
  const consumingPack = requiredPack(registry, consumingPackId);
  const ownerPack = requiredPack(registry, ownerPackId);
  assertDeclaredDependency(consumingPackId, ownerPackId, consumingPack.dependencies);
  const asset = requireInventoryAsset(ownerPack.records.assets, objectKey);
  return materializedAssetUrl(ownerPackId, objectKey, asset.delivery);
}

function requiredAssetReference(reference: string, consumingPackId: string) {
  const parsed = parseAssetReference(reference, consumingPackId);
  if (parsed === undefined) {
    throw new Error('A content asset has an unsafe or malformed reference.');
  }
  if (parsed.qualified && parsed.ownerPackId === consumingPackId) {
    throw new Error('A content pack must reference its own assets without a qualifier.');
  }
  return parsed;
}

function requireInventoryAsset(
  assets: ContentRegistry['packs'][string]['records']['assets'],
  objectKey: string,
): ContentRegistry['packs'][string]['records']['assets'][number] {
  const asset = assets.find((candidate) => candidate.objectKey === objectKey);
  if (asset === undefined) {
    throw new Error('A content asset is missing from its owning pack inventory.');
  }
  return asset;
}

function requiredPack(registry: ContentRegistry, packId: string) {
  const pack = registry.packs[packId];
  if (pack === undefined) {
    throw new Error('A content asset references an unknown pack.');
  }
  return pack;
}

function assertDeclaredDependency(
  consumingPackId: string,
  ownerPackId: string,
  dependencies: readonly string[],
): void {
  if (ownerPackId !== consumingPackId && !dependencies.includes(ownerPackId)) {
    throw new Error('A content asset references an undeclared pack dependency.');
  }
}

export function resolveStartBackground(registry: ContentRegistry): string | null {
  const matches = registry.packOrder.flatMap((packId) => {
    const pack = registry.packs[packId];
    return (
      pack?.records.assets
        .filter(({ role }) => role === startBackgroundRole)
        .map(({ objectKey }) => ({ objectKey, packId })) ?? []
    );
  });
  if (matches.length !== 1) {
    throw new Error('The application shell requires exactly one start background asset.');
  }
  const match = matches[0];
  if (match === undefined) {
    throw new Error('The application shell start background could not be selected.');
  }
  return resolveContentAsset(registry, match.packId, match.objectKey);
}

function materializedAssetUrl(
  packId: string,
  objectKey: string,
  delivery: 'r2-locked' | 'r2-pending' | undefined,
): string | null {
  assertAcceptedDelivery(delivery);
  const materialized = materializationMarker();
  if (delivery === 'r2-pending' || materialized === undefined) {
    return null;
  }
  return `./content/${packId}/assets/${objectKey}`;
}

function assertAcceptedDelivery(
  delivery: 'r2-locked' | 'r2-pending' | undefined,
): asserts delivery is 'r2-locked' | 'r2-pending' {
  if (delivery !== 'r2-locked' && delivery !== 'r2-pending') {
    throw new Error('A content asset has no accepted production delivery state.');
  }
}

function materializationMarker(): 'true' | undefined {
  const materialized = import.meta.env.VITE_MATERIALIZED_ASSETS;
  if (materialized !== undefined && materialized !== 'true') {
    throw new Error('VITE_MATERIALIZED_ASSETS must be exactly true when it is defined.');
  }
  return materialized;
}
