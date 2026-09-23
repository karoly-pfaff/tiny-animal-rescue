import assetInventory from '../../content/base/assets/manifest.json';

type FirstRescueAssetRole =
  | 'garden-ladder'
  | 'garden-map-background'
  | 'garden-mission-background'
  | 'indoor-shelter-background'
  | 'mimi-canonical'
  | 'mimi-celebration'
  | 'mimi-mission'
  | 'mimi-shelter'
  | 'start-background';

const gardenLadderRole = 'garden-ladder' satisfies FirstRescueAssetRole;
const gardenMapRole = 'garden-map-background' satisfies FirstRescueAssetRole;
const gardenMissionRole = 'garden-mission-background' satisfies FirstRescueAssetRole;
const indoorShelterRole = 'indoor-shelter-background' satisfies FirstRescueAssetRole;
const mimiCanonicalRole = 'mimi-canonical' satisfies FirstRescueAssetRole;
const mimiCelebrationRole = 'mimi-celebration' satisfies FirstRescueAssetRole;
const mimiMissionRole = 'mimi-mission' satisfies FirstRescueAssetRole;
const mimiShelterRole = 'mimi-shelter' satisfies FirstRescueAssetRole;
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

export function resolveGardenMissionBackground(): string | null {
  return resolveAsset(gardenMissionRole);
}

export function resolveGardenMissionLadder(): string | null {
  return resolveAsset(gardenLadderRole);
}

export function resolveIndoorShelterBackground(): string | null {
  return resolveAsset(indoorShelterRole);
}

export function resolveMimiCanonical(): string | null {
  return resolveAsset(mimiCanonicalRole);
}

export function resolveMimiCelebration(): string | null {
  return resolveAsset(mimiCelebrationRole);
}

export function resolveMimiMission(): string | null {
  return resolveAsset(mimiMissionRole);
}

export function resolveMimiShelter(): string | null {
  return resolveAsset(mimiShelterRole);
}

export function resolveStartBackground(): string | null {
  return resolveAsset(startRole);
}
