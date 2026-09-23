import type { MissionRecord } from './mission-contract';

export type V1Mission = Readonly<{
  id: string;
  type: MissionRecord['type'];
  locationId: string;
  subjectAnimalId?: string;
  stepTypeSequences: readonly (readonly MissionRecord['steps'][number]['type'][])[];
}>;

type MissionDefinition = Readonly<{
  id: string;
  type: MissionRecord['type'];
  locationId: string;
  subjectAnimalId?: string;
  stepTypeSequences: readonly (readonly MissionRecord['steps'][number]['type'][])[];
}>;

type V1CatalogDefinition = Readonly<{
  animals: readonly (readonly [id: string, shelterAreaId: string, species: string])[];
  locations: readonly string[];
  shelterAreas: readonly string[];
  missions: readonly V1Mission[];
}>;

export const v1ReleaseCatalog = Object.freeze({
  animals: Object.freeze([
    ['mimi-kitten', 'indoor-room', 'kitten'],
    ['morzsi-puppy', 'indoor-room', 'puppy'],
    ['pipi-chick', 'indoor-room', 'chick'],
    ['csipi-bird', 'indoor-room', 'small-bird'],
    ['suni-hedgehog', 'garden', 'hedgehog'],
    ['makk-squirrel', 'garden', 'squirrel'],
    ['pamacs-lamb', 'garden', 'lamb'],
    ['rozi-fawn', 'garden', 'fawn'],
    ['toto-turtle', 'pondside', 'turtle'],
    ['kiki-duckling', 'pondside', 'duckling'],
    ['breki-frog', 'pondside', 'frog'],
    ['habi-fish', 'pondside', 'fish'],
  ] as const),
  locations: Object.freeze(['garden', 'forest', 'farm', 'pond'] as const),
  shelterAreas: Object.freeze(['indoor-room', 'garden', 'pondside'] as const),
  missions: Object.freeze([
    mission({
      id: 'garden-kitten-tree',
      type: 'rescue',
      locationId: 'garden',
      subjectAnimalId: 'mimi-kitten',
      stepTypeSequences: [['drag', 'tap']],
    }),
    mission({
      id: 'forest-hedgehog-branches',
      type: 'rescue',
      locationId: 'forest',
      subjectAnimalId: 'suni-hedgehog',
      stepTypeSequences: [['tap', 'tap', 'tap']],
    }),
    mission({
      id: 'farm-chick-find-mother',
      type: 'rescue',
      locationId: 'farm',
      subjectAnimalId: 'pipi-chick',
      stepTypeSequences: [['match', 'drag']],
    }),
    mission({
      id: 'garden-puppy-tangled-leash',
      type: 'rescue',
      locationId: 'garden',
      subjectAnimalId: 'morzsi-puppy',
      stepTypeSequences: [['tap', 'tap', 'drag']],
    }),
    mission({
      id: 'forest-bird-nest',
      type: 'rescue',
      locationId: 'forest',
      subjectAnimalId: 'csipi-bird',
      stepTypeSequences: [['drag', 'drag']],
    }),
    mission({
      id: 'pond-turtle-find-water',
      type: 'rescue',
      locationId: 'pond',
      subjectAnimalId: 'toto-turtle',
      stepTypeSequences: [['trace'], ['trace', 'drag']],
    }),
    mission({
      id: 'farm-lamb-fence',
      type: 'rescue',
      locationId: 'farm',
      subjectAnimalId: 'pamacs-lamb',
      stepTypeSequences: [['tap', 'tap', 'drag']],
    }),
    mission({
      id: 'garden-frog-too-dry',
      type: 'rescue',
      locationId: 'garden',
      subjectAnimalId: 'breki-frog',
      stepTypeSequences: [['drag', 'drag']],
    }),
    mission({
      id: 'forest-squirrel-lost-acorns',
      type: 'rescue',
      locationId: 'forest',
      subjectAnimalId: 'makk-squirrel',
      stepTypeSequences: [['match', 'match', 'match']],
    }),
    mission({
      id: 'pond-duckling-reeds',
      type: 'rescue',
      locationId: 'pond',
      subjectAnimalId: 'kiki-duckling',
      stepTypeSequences: [['tap', 'tap', 'trace']],
    }),
    mission({
      id: 'forest-fawn-stuck-twig',
      type: 'rescue',
      locationId: 'forest',
      subjectAnimalId: 'rozi-fawn',
      stepTypeSequences: [['tap', 'wipe']],
    }),
    mission({
      id: 'pond-fish-small-puddle',
      type: 'rescue',
      locationId: 'pond',
      subjectAnimalId: 'habi-fish',
      stepTypeSequences: [['trace', 'drag']],
    }),
    mission({
      id: 'farm-piglet-mud-wash',
      type: 'world',
      locationId: 'farm',
      stepTypeSequences: [['drag', 'wipe']],
    }),
    mission({
      id: 'pond-clear-litter',
      type: 'world',
      locationId: 'pond',
      stepTypeSequences: [['drag', 'drag', 'drag']],
    }),
    mission({
      id: 'garden-mimi-find-ball',
      type: 'help',
      locationId: 'garden',
      subjectAnimalId: 'mimi-kitten',
      stepTypeSequences: [['tap', 'drag']],
    }),
    mission({
      id: 'forest-suni-picnic',
      type: 'help',
      locationId: 'forest',
      subjectAnimalId: 'suni-hedgehog',
      stepTypeSequences: [['match', 'match', 'match']],
    }),
  ]),
} satisfies V1CatalogDefinition);

function mission(definition: MissionDefinition): V1Mission {
  return Object.freeze({
    ...definition,
    stepTypeSequences: Object.freeze(
      definition.stepTypeSequences.map((sequence) => Object.freeze([...sequence])),
    ),
  });
}
