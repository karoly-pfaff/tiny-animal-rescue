import { describe, expect, it } from 'vitest';

import { selectShelterAreaPresentations } from '../../sources/app/shelter-content';
import type { ContentPackSource, ContentRegistry } from '../../sources/content/content-registry';
import { testContentRegistry } from '../support/first-rescue-content';

describe('shelter content', () => {
  it('orders the three authored areas and renders four valid residents', () => {
    const registry = registryWithResidents(4);
    const presentations = selectShelterAreaPresentations(registry, 'en', {
      completedMissionIds: [],
      unlockedResidentIds: Object.keys(registry.animals),
      worldFlags: [],
    });

    expect(presentations.map(({ id }) => id)).toEqual([
      'indoor-room',
      'shelter-garden',
      'pondside',
    ]);
    expect(presentations[0]?.residents).toHaveLength(4);
    expect(presentations[0]?.residents.map(({ id }) => id)).toEqual([
      'resident-1',
      'resident-2',
      'resident-3',
      'resident-4',
    ]);
  });

  it('fails loudly when an invalid assembled area exceeds capacity', () => {
    const registry = registryWithResidents(5);

    expect(() =>
      selectShelterAreaPresentations(registry, 'en', {
        completedMissionIds: [],
        unlockedResidentIds: Object.keys(registry.animals),
        worldFlags: [],
      }),
    ).toThrow(/exceeds its declared capacity/u);
  });

  it('sorts omitted navigation order after explicit values and then by stable ID', () => {
    const indoorRoom = testContentRegistry.shelterAreas['indoor-room'];
    if (indoorRoom === undefined) {
      throw new Error('The test registry requires the Indoor Room.');
    }
    const indoorWithoutOrder = structuredClone(indoorRoom);
    Reflect.deleteProperty(indoorWithoutOrder, 'navigationOrder');
    const registry: ContentRegistry = {
      ...testContentRegistry,
      shelterAreas: {
        ...testContentRegistry.shelterAreas,
        'indoor-room': indoorWithoutOrder,
      },
    };

    expect(
      selectShelterAreaPresentations(registry, 'en', {
        completedMissionIds: [],
        unlockedResidentIds: [],
        worldFlags: [],
      }).map(({ id }) => id),
    ).toEqual(['shelter-garden', 'pondside', 'indoor-room']);
  });

  it('renders an unlocked dependency-owned shelter-area reference', () => {
    const registry = registryWithDependencyResident();
    const indoorRoom = selectShelterAreaPresentations(registry, 'en', {
      completedMissionIds: [],
      unlockedResidentIds: ['winter-kitten'],
      worldFlags: [],
    }).find(({ id }) => id === 'indoor-room');

    expect(indoorRoom?.residents.map(({ id }) => id)).toEqual(['winter-kitten']);
  });

  it('normalizes omitted v1 slots by stable ID after reserving authored slots', () => {
    const original = registryWithResidents(3);
    const animals = Object.fromEntries(
      Object.values(original.animals).map((animal) => [
        animal.id,
        animal.id === 'resident-2' ? { ...animal, shelterSlot: 1 } : withoutShelterSlot(animal),
      ]),
    );
    const registry = { ...original, animals };

    const indoorRoom = selectShelterAreaPresentations(registry, 'en', {
      completedMissionIds: [],
      unlockedResidentIds: Object.keys(animals),
      worldFlags: [],
    }).find(({ id }) => id === 'indoor-room');

    expect(indoorRoom?.residents.map(({ id, shelterSlot }) => [id, shelterSlot])).toEqual([
      ['resident-2', 1],
      ['resident-1', 2],
      ['resident-3', 3],
    ]);
  });

  it('rejects shelter records without a declaring pack', () => {
    const registry: ContentRegistry = {
      ...testContentRegistry,
      recordOwners: {
        ...testContentRegistry.recordOwners,
        shelterAreas: {},
      },
    };

    expect(() =>
      selectShelterAreaPresentations(registry, 'en', {
        completedMissionIds: [],
        unlockedResidentIds: [],
        worldFlags: [],
      }),
    ).toThrow(/has no declaring pack/u);
  });

  it('does not resolve assets or expose presentation for a locked resident', () => {
    const mimi = requiredMimi();
    const registry: ContentRegistry = {
      ...testContentRegistry,
      animals: {
        ...testContentRegistry.animals,
        [mimi.id]: {
          ...mimi,
          assets: { ...mimi.assets, happy: 'images/locked-happy.png', idle: 'images/locked.png' },
        },
      },
    };

    const presentations = selectShelterAreaPresentations(registry, 'en', {
      completedMissionIds: [],
      unlockedResidentIds: [],
      worldFlags: [],
    });

    expect(presentations.flatMap(({ residents }) => residents)).toEqual([]);
  });
});

function registryWithResidents(count: number): ContentRegistry {
  const mimi = requiredMimi();
  const animals = Object.fromEntries(
    Array.from({ length: count }, (_, index) => {
      const id = `resident-${String(index + 1)}`;
      return [id, { ...mimi, id, shelterSlot: index + 1 }] as const;
    }).reverse(),
  );
  return {
    ...testContentRegistry,
    animals,
    recordOwners: {
      ...testContentRegistry.recordOwners,
      animals: Object.fromEntries(Object.keys(animals).map((id) => [id, 'base'])),
    },
  };
}

function registryWithDependencyResident(): ContentRegistry {
  const basePack = testContentRegistry.packs['base'];
  if (basePack === undefined) {
    throw new Error('The test registry requires the base pack.');
  }
  const mimi = requiredMimi();
  const animal = {
    ...mimi,
    id: 'winter-kitten',
    shelterAreaId: 'base:indoor-room',
    assets: {
      ...mimi.assets,
      happy: `base:${mimi.assets.happy}`,
      idle: `base:${mimi.assets.idle}`,
    },
  };
  const pack = {
    id: 'winter-rescue',
    version: '0.1.0',
    contractVersion: 1,
    titleKey: 'pack.winter-rescue.title',
    locales: ['hu', 'en'],
    dependencies: ['base'],
    content: basePack.content,
    records: {
      animals: [animal],
      assets: [],
      localizations: {
        en: dependencyResidentStrings(animal, 'Winter'),
        hu: dependencyResidentStrings(animal, 'Téli'),
      },
      locations: [],
      missions: [],
      shelterAreas: [],
    },
  } as const satisfies ContentPackSource;
  return {
    ...testContentRegistry,
    animals: { [animal.id]: animal },
    packOrder: ['base', pack.id],
    packs: { ...testContentRegistry.packs, [pack.id]: pack },
    recordOwners: {
      ...testContentRegistry.recordOwners,
      animals: { [animal.id]: pack.id },
    },
  };
}

function dependencyResidentStrings(
  animal: ReturnType<typeof requiredMimi>,
  name: string,
): Readonly<Record<string, string>> {
  return {
    [animal.nameKey]: name,
    [animal.shelterLocalization.happyKey]: `${name} is happy.`,
    [animal.shelterLocalization.tapLabelKey]: `Greet ${name}`,
  };
}

function requiredMimi() {
  const mimi = testContentRegistry.animals['mimi-kitten'];
  if (mimi === undefined) {
    throw new Error('The test registry requires Mimi.');
  }
  return mimi;
}

function withoutShelterSlot(
  animal: ContentRegistry['animals'][string],
): ContentRegistry['animals'][string] {
  const copy = structuredClone(animal);
  Reflect.deleteProperty(copy, 'shelterSlot');
  return copy;
}
