import assetInventory from '../../content/base/assets/manifest.json';

type FirstRescueAssetRole = 'garden-map-background' | 'start-background';
const gardenMapRole = 'garden-map-background' satisfies FirstRescueAssetRole;
const startRole = 'start-background' satisfies FirstRescueAssetRole;

function resolveAsset(role: FirstRescueAssetRole): string | null {
  const record = assetInventory.assets.find((asset) => asset.role === role);
  if (record === undefined) {
    throw new Error('A first-rescue asset is missing from the base asset inventory.');
  }
  const assetBaseUrl = import.meta.env.VITE_ASSET_BASE_URL;
  return assetBaseUrl === undefined
    ? null
    : `${assetBaseUrl.replace(/\/$/u, '')}/${record.objectKey}`;
}

export function resolveGardenMapBackground(): string | null {
  return resolveAsset(gardenMapRole);
}

export function resolveStartBackground(): string | null {
  return resolveAsset(startRole);
}
