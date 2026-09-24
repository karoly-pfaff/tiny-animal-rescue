export function semanticPacksFromDiscovery(discoveredPacks) {
  return discoveredPacks.map(({ manifest, records }) => ({
    ...manifest,
    records: {
      ...records,
      assets: records.assets ?? [],
      localizations: {},
    },
  }));
}
