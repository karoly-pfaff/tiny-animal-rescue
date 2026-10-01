import type { ContentPackSource } from './content-registry';
import { diagnostic } from './content-validation-diagnostic.ts';
import { v1ReleaseCatalog, type V1Mission } from './v1-content-catalog.ts';

type V1RecordLabel = 'resident' | 'location' | 'shelter area' | 'mission';
type V1Locale = 'hu' | 'en';

export function validateV1Catalog(packs: readonly ContentPackSource[]): readonly string[] {
  const base = packs.find(({ id }) => id === 'base');
  if (base === undefined) {
    return [diagnostic('The v1 release catalog requires the base pack.')];
  }

  return [
    ...validateV1PackSet(packs),
    ...validateV1Ids(base),
    ...validateV1Animals(base),
    ...validateV1ShelterAreas(base),
    ...validateV1Missions(base),
    ...validateV1Locales(base),
  ];
}

function validateV1PackSet(packs: readonly ContentPackSource[]): readonly string[] {
  return packs.length === 1
    ? []
    : [diagnostic('The v1 release catalog permits exactly the base pack and no expansion packs.')];
}

function validateV1Ids(base: ContentPackSource): readonly string[] {
  return [
    ...validateExactIds({
      label: 'resident' satisfies V1RecordLabel,
      records: base.records.animals,
      expectedIds: v1ReleaseCatalog.animals.map(([id]) => id),
    }),
    ...validateExactIds({
      label: 'location' satisfies V1RecordLabel,
      records: base.records.locations,
      expectedIds: v1ReleaseCatalog.locations,
    }),
    ...validateExactIds({
      label: 'shelter area' satisfies V1RecordLabel,
      records: base.records.shelterAreas,
      expectedIds: v1ReleaseCatalog.shelterAreas,
    }),
    ...validateExactIds({
      label: 'mission' satisfies V1RecordLabel,
      records: base.records.missions,
      expectedIds: v1ReleaseCatalog.missions.map(({ id }) => id),
    }),
  ];
}

function validateV1Animals(base: ContentPackSource): readonly string[] {
  const animals = index(base.records.animals);
  return v1ReleaseCatalog.animals.flatMap(([animalId, shelterAreaId, species]) => {
    const animal = animals.get(animalId);
    if (animal === undefined) {
      return [];
    }
    const findings: string[] = [];
    if (animal.shelterAreaId !== shelterAreaId) {
      findings.push(
        diagnostic(`V1 resident ${animalId} must belong to shelter area ${shelterAreaId}.`),
      );
    }
    if (animal.species !== species) {
      findings.push(diagnostic(`V1 resident ${animalId} must use species ${species}.`));
    }
    return findings;
  });
}

function validateV1ShelterAreas(base: ContentPackSource): readonly string[] {
  const areas = index(base.records.shelterAreas);
  return v1ReleaseCatalog.shelterAreas.flatMap((areaId) => {
    const area = areas.get(areaId);
    return area !== undefined && area.capacity !== 4
      ? [diagnostic(`V1 shelter area ${areaId} must have capacity 4.`)]
      : [];
  });
}

function validateV1Missions(base: ContentPackSource): readonly string[] {
  const missions = index(base.records.missions);
  return v1ReleaseCatalog.missions.flatMap((expected) => {
    const actual = missions.get(expected.id);
    return actual === undefined ? [] : validateV1Mission(actual, expected);
  });
}

function validateV1Mission(
  actual: ContentPackSource['records']['missions'][number],
  expected: V1Mission,
): readonly string[] {
  const findings: string[] = [];
  if (actual.type !== expected.type || actual.locationId !== expected.locationId) {
    findings.push(
      diagnostic(
        `V1 mission ${expected.id} must be ${expected.type} content in ${expected.locationId}.`,
      ),
    );
  }
  if (actual.subjectAnimalId !== expected.subjectAnimalId) {
    findings.push(diagnostic(`V1 mission ${expected.id} has the wrong resident subject.`));
  }
  const actualStepTypes = actual.steps.map(({ type }) => type);
  if (!expected.stepTypeSequences.some((sequence) => sameSequence(sequence, actualStepTypes))) {
    findings.push(diagnostic(`V1 mission ${expected.id} has the wrong interaction composition.`));
  }
  return findings;
}

function validateV1Locales(base: ContentPackSource): readonly string[] {
  const exactLocales =
    base.locales.length === 2 &&
    base.locales.includes('hu' satisfies V1Locale) &&
    base.locales.includes('en' satisfies V1Locale);
  return exactLocales
    ? []
    : [diagnostic('The v1 base pack must declare exactly the hu and en locales.')];
}

function sameSequence(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length && left.every((value, valueIndex) => value === right[valueIndex])
  );
}

type ExactIdInput = Readonly<{
  label: V1RecordLabel;
  records: readonly Readonly<{ id: string }>[];
  expectedIds: readonly string[];
}>;

function validateExactIds(input: ExactIdInput): readonly string[] {
  const actual = [...input.records.map(({ id }) => id)].sort();
  const expected = [...input.expectedIds].sort();
  const exact =
    actual.length === expected.length &&
    actual.every((id, recordIndex) => id === expected[recordIndex]);
  return exact
    ? []
    : [
        diagnostic(
          `The v1 base ${input.label} IDs must be exactly ${expected.join(', ')}; found ${actual.join(', ')}.`,
        ),
      ];
}

function index<Entry extends Readonly<{ id: string }>>(
  records: readonly Entry[],
): Map<string, Entry> {
  return new Map(records.map((record) => [record.id, record]));
}
