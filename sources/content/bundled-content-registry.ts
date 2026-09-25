import { assembleContentRegistry, type ContentRegistry } from './content-registry';
import type { MissionRecord } from './mission-contract';
import { normalizePackManifest, type PackManifestSource } from './pack-contract';
import type {
  AnimalRecord,
  AssetInventory,
  AssetMetadata,
  LocalizationDocument,
  LocationRecord,
  ShelterAreaRecord,
} from './world-content-contracts';

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
const assetInventoryModules = import.meta.glob<AssetInventory>(
  '../../content/*/assets/manifest.json',
  { eager: true, import: 'default' },
);
const localizationModules = import.meta.glob<LocalizationDocument>(
  '../../content/*/locales/*.json',
  { eager: true, import: 'default' },
);

export type BundledContentModules = Readonly<{
  manifests: Readonly<Record<string, PackManifestSource>>;
  assetInventories: Readonly<Record<string, AssetInventory>>;
  animals: Readonly<Record<string, AnimalRecord>>;
  localizations: Readonly<Record<string, LocalizationDocument>>;
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
          assets: assetsWithin(modules.assetInventories, packDirectory),
          localizations: localizationsWithin(
            modules.localizations,
            packDirectory,
            manifest.locales,
          ),
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
  assetInventories: assetInventoryModules,
  animals: animalModules,
  localizations: localizationModules,
  locations: locationModules,
  missions: missionModules,
  shelterAreas: shelterAreaModules,
});

function assetsWithin(
  inventories: Readonly<Record<string, AssetInventory>>,
  packDirectory: string,
): readonly AssetMetadata[] {
  return inventories[`${packDirectory}/assets/manifest.json`]?.assets ?? [];
}

function localizationsWithin(
  documents: Readonly<Record<string, LocalizationDocument>>,
  packDirectory: string,
  locales: readonly string[],
): Readonly<Record<string, LocalizationDocument>> {
  return Object.fromEntries(
    locales.map((locale) => {
      const document = documents[`${packDirectory}/locales/${locale}.json`];
      if (document === undefined) {
        throw new Error(`Bundled content pack is missing declared locale ${locale}.`);
      }
      return [locale, document];
    }),
  );
}

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
