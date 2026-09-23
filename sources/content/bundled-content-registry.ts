import { assembleContentRegistry, type ContentRegistry } from './content-registry';
import type { MissionRecord } from './mission-contract';
import { normalizePackManifest, type PackManifestSource } from './pack-contract';
import type { AnimalRecord, LocationRecord, ShelterAreaRecord } from './world-content-contracts';

const manifestModules = import.meta.glob<PackManifestSource>('../../content/*/pack.json', {
  eager: true,
  import: 'default',
});
const animalModules = import.meta.glob<AnimalRecord>('../../content/*/**/*.json', {
  eager: true,
  import: 'default',
});
const locationModules = import.meta.glob<LocationRecord>('../../content/*/**/*.json', {
  eager: true,
  import: 'default',
});
const missionModules = import.meta.glob<MissionRecord>('../../content/*/**/*.json', {
  eager: true,
  import: 'default',
});
const shelterAreaModules = import.meta.glob<ShelterAreaRecord>('../../content/*/**/*.json', {
  eager: true,
  import: 'default',
});

export type BundledContentModules = Readonly<{
  manifests: Readonly<Record<string, PackManifestSource>>;
  animals: Readonly<Record<string, AnimalRecord>>;
  locations: Readonly<Record<string, LocationRecord>>;
  missions: Readonly<Record<string, MissionRecord>>;
  shelterAreas: Readonly<Record<string, ShelterAreaRecord>>;
}>;

export function assembleBundledContentRegistry(modules: BundledContentModules): ContentRegistry {
  const bundledSources = Object.entries(modules.manifests)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([manifestPath, source]) => {
      const manifest = normalizePackManifest(source);
      const packDirectory = manifestPath.slice(0, -'/pack.json'.length);
      return {
        ...manifest,
        records: {
          animals: recordsWithin(modules.animals, packDirectory, manifest.content.animals),
          assets: [],
          localizations: {},
          locations: recordsWithin(modules.locations, packDirectory, manifest.content.locations),
          missions: recordsWithin(modules.missions, packDirectory, manifest.content.missions),
          shelterAreas: recordsWithin(
            modules.shelterAreas,
            packDirectory,
            manifest.content.shelterAreas,
          ),
        },
      };
    });

  return assembleContentRegistry(bundledSources);
}

export const bundledContentRegistry = assembleBundledContentRegistry({
  manifests: manifestModules,
  animals: animalModules,
  locations: locationModules,
  missions: missionModules,
  shelterAreas: shelterAreaModules,
});

function recordsWithin<Entry>(
  modules: Readonly<Record<string, Entry>>,
  packDirectory: string,
  declaredDirectory: string,
): readonly Entry[] {
  return Object.entries(modules)
    .filter(([path]) => path.startsWith(`${packDirectory}/${declaredDirectory}/`))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, record]) => record);
}
