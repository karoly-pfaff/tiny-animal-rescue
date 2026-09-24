import { validateContentAssets } from './content-asset-validator.ts';
import { validateContentRelationships } from './content-relationship-validator.ts';
import type { ContentPackSource } from './content-registry';
import { diagnostic } from './content-validation-diagnostic.ts';
import { isSupportedInitialRescueMission } from './initial-rescue-contract.ts';
import { validateV1Catalog } from './v1-content-catalog-validator.ts';

export { v1ReleaseCatalog } from './v1-content-catalog.ts';

export type SemanticValidationOptions = Readonly<{
  releaseCatalog?: 'v1';
}>;

export function validateContentSemantics(
  packs: readonly ContentPackSource[],
  options: SemanticValidationOptions = {},
): readonly string[] {
  const release = options.releaseCatalog === 'v1';
  return Object.freeze([
    ...validateContentRelationships(packs),
    ...validatePackDependencyPolicy(packs),
    ...validateContentAssets(packs, { release }),
    ...packs.flatMap(validatePackLocalizations),
    ...validateInitialMission(packs),
    ...(release ? validateV1Catalog(packs) : []),
  ]);
}

function validatePackDependencyPolicy(packs: readonly ContentPackSource[]): readonly string[] {
  const base = packs.find(({ id }) => id === 'base');
  return base !== undefined && base.dependencies.length > 0
    ? [diagnostic('The base pack cannot depend on an expansion pack.')]
    : [];
}

function validateInitialMission(packs: readonly ContentPackSource[]): readonly string[] {
  const declaringPacks = packs.filter(({ initialMissionId }) => initialMissionId !== undefined);
  const declarationFindings = initialMissionDeclarationFindings(declaringPacks.length);
  const shapeFindings = declaringPacks.flatMap((pack) => {
    const mission = pack.records.missions.find(({ id }) => id === pack.initialMissionId);
    return mission !== undefined && isSupportedInitialRescueMission(mission)
      ? []
      : [
          diagnostic(
            `Pack ${pack.id} initial mission must be its own two-step drag-then-tap Rescue with no prerequisites and a drag source asset.`,
          ),
        ];
  });
  return [...declarationFindings, ...shapeFindings];
}

function initialMissionDeclarationFindings(count: number): readonly string[] {
  if (count === 0) {
    return [diagnostic('Content packs must declare exactly one initial Rescue mission.')];
  }
  return count > 1
    ? [diagnostic('Content packs declare more than one initial Rescue mission.')]
    : [];
}

function validatePackLocalizations(pack: ContentPackSource): readonly string[] {
  const requiredKeys = packLocalizationKeys(pack);
  return pack.locales.flatMap((locale) => {
    const document = pack.records.localizations[locale];
    if (document === undefined) {
      return [diagnostic(`Pack ${pack.id} is missing localization document ${locale}.`)];
    }
    return requiredKeys.flatMap((key) =>
      document[key] === undefined
        ? [diagnostic(`Pack ${pack.id} locale ${locale} is missing key ${key}.`)]
        : [],
    );
  });
}

function packLocalizationKeys(pack: ContentPackSource): readonly string[] {
  return [
    pack.titleKey,
    ...pack.records.animals.flatMap(({ nameKey, shelterLocalization }) => [
      nameKey,
      shelterLocalization.happyKey,
      shelterLocalization.tapLabelKey,
    ]),
    ...pack.records.locations.flatMap(({ mapLabelKey, nameKey }) => [mapLabelKey, nameKey]),
    ...pack.records.shelterAreas.map(({ nameKey }) => nameKey),
    ...pack.records.missions.flatMap(({ localization, steps }) => [
      localization.titleKey,
      localization.introKey,
      localization.successKey,
      ...steps.map(({ promptKey }) => promptKey),
    ]),
  ];
}
