import Ajv2020, { type AnySchema } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

import animalExample from '../../content/examples/mimi-kitten.json';
import assetExample from '../../content/examples/garden-map-background.asset.json';
import audioAssetExample from '../../content/examples/drag-snap.asset.json';
import localizationExample from '../../content/examples/hu.json';
import locationExample from '../../content/examples/garden.json';
import missionExample from '../../content/examples/garden-kitten-tree.json';
import packExample from '../../content/examples/pack.example.json';
import shelterAreaExample from '../../content/examples/indoor-room.json';
import animalSchema from '../../schemas/animal.schema.json';
import assetSchema from '../../schemas/asset-metadata.schema.json';
import localizationSchema from '../../schemas/localization.schema.json';
import locationSchema from '../../schemas/location.schema.json';
import missionSchema from '../../schemas/mission.schema.json';
import packSchema from '../../schemas/pack.schema.json';
import shelterAreaSchema from '../../schemas/shelter-area.schema.json';
import {
  normalizePackManifest,
  type PackManifestSource,
} from '../../sources/content/pack-contract';
import type { MissionRecord } from '../../sources/content/mission-contract';
import type {
  AnimalRecord,
  AssetMetadata,
  LocalizationDocument,
  LocationRecord,
  ShelterAreaRecord,
} from '../../sources/content/world-content-contracts';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

function validate(schema: AnySchema, value: unknown): boolean {
  return ajv.compile(schema)(value) === true;
}

const expectedPackSource = {
  id: 'base',
  version: '0.2.0',
  contractVersion: 1,
  titleKey: 'pack.base.title',
  locales: ['hu', 'en'],
  dependencies: [],
  content: {
    animals: 'animals',
    missions: 'missions',
    locations: 'locations',
    shelterAreas: 'shelter-areas',
  },
} as const satisfies PackManifestSource;

const expectedAnimal = {
  id: 'mimi-kitten',
  species: 'kitten',
  nameKey: 'animal.mimi-kitten.name',
  shelterAreaId: 'indoor-room',
  assets: {
    portrait: 'images/residents/mimi/canonical.png',
    idle: 'images/residents/mimi/shelter-idle.png',
    happy: 'images/residents/mimi/celebration.png',
  },
  shelterReactions: ['greet', 'pet', 'play'],
} as const satisfies AnimalRecord;

const expectedLocation = {
  id: 'garden',
  nameKey: 'location.garden.name',
  mapLabelKey: 'location.garden.map-label',
  assets: {
    mapBackground: 'images/map/garden-map.png',
    missionBackground: 'images/missions/garden-kitten-tree/background.png',
  },
} as const satisfies LocationRecord;

const expectedShelterArea = {
  id: 'indoor-room',
  nameKey: 'shelter-area.indoor-room.name',
  capacity: 4,
  assets: { background: 'images/shelter/indoor-room.png' },
} as const satisfies ShelterAreaRecord;

const expectedAsset = {
  id: 'garden-map-background',
  category: 'image',
  objectKey: 'images/map/garden-map.png',
  role: 'garden-map-background',
  ownership: 'base',
  mediaType: 'image/png',
  qaStatus: 'approved',
  licenseStatus: 'approved',
  provenanceStatus: 'approved',
  promptRecord: 'prompts/images/approved/epic-001/garden-map-background.md',
  width: 1448,
  height: 1086,
  transparent: false,
} as const satisfies AssetMetadata;

const expectedAudioAsset = {
  id: 'drag-snap',
  category: 'effect',
  objectKey: 'audio/shared/effects/interactions/drag-snap.ogg',
  role: 'interaction-feedback',
  ownership: 'base',
  mediaType: 'audio/ogg',
  qaStatus: 'not-produced',
  licenseStatus: 'pending-production',
  provenanceStatus: 'pending-production',
  promptRecord: 'prompts/effects/interaction-primitives.md',
  durationBoundsSeconds: { min: 0.2, max: 0.9 },
} as const satisfies AssetMetadata;

const expectedLocalization = {
  'animal.mimi-kitten.name': 'Mimi',
  'location.garden.map-label': 'Kert',
  'location.garden.name': 'Kert',
  'mission.garden-kitten-tree.intro': 'Mimi segítségre vár.',
  'mission.garden-kitten-tree.step.help-mimi-down': 'Koppints Mimire!',
  'mission.garden-kitten-tree.step.place-ladder': 'Húzd a létrát a fához!',
  'mission.garden-kitten-tree.success': 'Mimi biztonságban van!',
  'mission.garden-kitten-tree.title': 'Mimi a fán',
  'pack.base.title': 'Kis Állatmentők',
  'shelter-area.indoor-room.name': 'Belső szoba',
} as const satisfies LocalizationDocument;

const expectedMission = {
  id: 'garden-kitten-tree',
  type: 'rescue',
  locationId: 'garden',
  subjectAnimalId: 'mimi-kitten',
  prerequisites: [],
  scene: {
    background: 'images/missions/garden-kitten-tree/background.png',
    designWidth: 1024,
    designHeight: 768,
  },
  steps: [
    {
      id: 'place-ladder',
      type: 'drag',
      promptKey: 'mission.garden-kitten-tree.step.place-ladder',
      successCue: 'effects.interaction.drag-snap',
      hint: { type: 'pulse-after-delay', delayMs: 5000 },
      sourceId: 'ladder',
      targetId: 'tree-ladder-target',
      snapTolerance: 0.55,
    },
    {
      id: 'help-mimi-down',
      type: 'tap',
      promptKey: 'mission.garden-kitten-tree.step.help-mimi-down',
      successCue: 'effects.interaction.tap-remove',
      hint: { type: 'pulse-after-delay', delayMs: 5000 },
      targetIds: ['mimi'],
    },
  ],
  reward: {
    completeMission: true,
    unlockResidentId: 'mimi-kitten',
    worldFlags: ['mimi-rescued'],
  },
  localization: {
    titleKey: 'mission.garden-kitten-tree.title',
    introKey: 'mission.garden-kitten-tree.intro',
    successKey: 'mission.garden-kitten-tree.success',
  },
  assets: {
    required: [
      'images/missions/garden-kitten-tree/background.png',
      'images/missions/garden-kitten-tree/ladder.png',
      'images/residents/mimi/mission.png',
    ],
  },
} as const satisfies MissionRecord;

describe('content contracts', () => {
  it('keeps schema examples equal to type-checked runtime records', () => {
    const examples = [
      [packSchema, packExample, expectedPackSource],
      [animalSchema, animalExample, expectedAnimal],
      [missionSchema, missionExample, expectedMission],
      [locationSchema, locationExample, expectedLocation],
      [shelterAreaSchema, shelterAreaExample, expectedShelterArea],
      [localizationSchema, localizationExample, expectedLocalization],
      [assetSchema, assetExample, expectedAsset],
      [assetSchema, audioAssetExample, expectedAudioAsset],
    ] as const;

    for (const [schema, example, expected] of examples) {
      expect(validate(schema, example)).toBe(true);
      expect(example).toEqual(expected);
    }
  });

  it('defaults omitted pack dependencies to an immutable empty list', () => {
    const source = {
      id: 'base',
      version: '0.2.0',
      contractVersion: 1,
      titleKey: 'pack.base.title',
      locales: ['hu', 'en'],
      content: packExample.content,
    } as const satisfies PackManifestSource;

    expect(validate(packSchema, source)).toBe(true);
    const pack = normalizePackManifest(source);
    expect(pack.dependencies).toEqual([]);
    expect(Object.isFrozen(pack.dependencies)).toBe(true);
    expect(Object.isFrozen(pack)).toBe(true);
    expect(Object.isFrozen(pack.content)).toBe(true);
  });

  it('rejects unknown properties in every fixed-shape schema', () => {
    const cases = [
      [packSchema, { ...packExample, unknown: true }],
      [animalSchema, { ...animalExample, unknown: true }],
      [missionSchema, { ...missionExample, unknown: true }],
      [locationSchema, { ...locationExample, unknown: true }],
      [shelterAreaSchema, { ...shelterAreaExample, unknown: true }],
      [assetSchema, { ...assetExample, unknown: true }],
      [missionSchema, { ...missionExample, scene: { ...missionExample.scene, unknown: true } }],
    ] as const;

    for (const [schema, invalid] of cases) {
      expect(validate(schema, invalid)).toBe(false);
    }
  });

  it('rejects invalid values from every enum family', () => {
    const cases = [
      [packSchema, { ...packExample, locales: ['de'] }],
      [animalSchema, { ...animalExample, shelterReactions: ['dance'] }],
      [missionSchema, { ...missionExample, type: 'contest' }],
      [missionSchema, { ...missionExample, steps: [{ ...missionExample.steps[0], type: 'spin' }] }],
      [
        missionSchema,
        {
          ...missionExample,
          steps: [{ ...missionExample.steps[0], successCue: 'effects.unknown' }],
        },
      ],
      [
        missionSchema,
        {
          ...missionExample,
          steps: [
            {
              ...missionExample.steps[0],
              hint: { ...missionExample.steps[0]?.hint, type: 'flash-after-delay' },
            },
          ],
        },
      ],
      [assetSchema, { ...assetExample, category: 'video' }],
      [assetSchema, { ...assetExample, mediaType: 'image/gif' }],
      [assetSchema, { ...assetExample, qaStatus: 'unchecked' }],
      [assetSchema, { ...assetExample, licenseStatus: 'unknown' }],
      [assetSchema, { ...assetExample, provenanceStatus: 'unknown' }],
      [assetSchema, { ...audioAssetExample, mediaType: 'audio/aac' }],
      [assetSchema, { ...audioAssetExample, locale: 'de' }],
    ] as const;

    for (const [schema, invalid] of cases) {
      expect(validate(schema, invalid)).toBe(false);
    }
  });

  it.each([
    '',
    '/absolute.png',
    'C:/absolute.png',
    'https://example.test/asset.png',
    '../outside.png',
    'images/../outside.png',
    './image.png',
    'images\\asset.png',
    'images//asset.png',
  ])('rejects unsafe pack asset path %j', (objectKey) => {
    expect(validate(assetSchema, { ...assetExample, objectKey })).toBe(false);
    expect(
      validate(animalSchema, {
        ...animalExample,
        assets: { ...animalExample.assets, portrait: objectKey },
      }),
    ).toBe(false);
  });

  it('accepts a dependency-qualified content reference but not a qualified inventory key', () => {
    const qualified = 'shared-pack:images/residents/shared.png';
    expect(
      validate(animalSchema, {
        ...animalExample,
        assets: { ...animalExample.assets, portrait: qualified },
      }),
    ).toBe(true);
    expect(validate(assetSchema, { ...assetExample, objectKey: qualified })).toBe(false);
  });

  it('requires locale ownership only for voice assets', () => {
    expect(validate(assetSchema, { ...audioAssetExample, category: 'voice' })).toBe(false);
    expect(validate(assetSchema, { ...audioAssetExample, locale: 'hu' })).toBe(false);
    expect(
      validate(assetSchema, {
        ...audioAssetExample,
        category: 'voice',
        locale: 'hu',
      }),
    ).toBe(true);
  });

  it('rejects unsupported contract versions instead of guessing', () => {
    expect(() => normalizePackManifest({ ...expectedPackSource, contractVersion: 2 })).toThrow(
      /Unsupported content contract version 2/u,
    );
  });
});
