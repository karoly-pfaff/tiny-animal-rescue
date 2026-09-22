import assetInventory from '../../content/base/assets/manifest.json';

type FirstRescueAssetRole = 'garden-map-background' | 'start-background';
const gardenMapRole = 'garden-map-background' satisfies FirstRescueAssetRole;
const startRole = 'start-background' satisfies FirstRescueAssetRole;

function resolveAsset(role: FirstRescueAssetRole): string | null {
  const record = assetInventory.assets.find((asset) => asset.role === role);
  if (record === undefined) {
    throw new Error('A first-rescue asset is missing from the base asset inventory.');
  }
  const materialized = import.meta.env.VITE_MATERIALIZED_ASSETS;
  if (materialized === undefined) {
    return null;
  }
  if (materialized !== 'true') {
    throw new Error('VITE_MATERIALIZED_ASSETS must be exactly true when it is defined.');
  }
  return `./content/base/assets/${record.objectKey}`;
}

export function resolveGardenMapBackground(): string | null {
  return resolveAsset(gardenMapRole);
}

export function resolveStartBackground(): string | null {
  return resolveAsset(startRole);
}
