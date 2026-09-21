import assetInventory from '../../content/base/assets/manifest.json';

export function resolveStartBackground(): string | null {
  const record = assetInventory.assets.find(({ role }) => role === 'start-background');
  if (record === undefined) {
    throw new Error('The start background is missing from the base asset inventory.');
  }
  const assetBaseUrl = import.meta.env.VITE_ASSET_BASE_URL;
  return assetBaseUrl === undefined
    ? null
    : `${assetBaseUrl.replace(/\/$/u, '')}/${record.objectKey}`;
}
