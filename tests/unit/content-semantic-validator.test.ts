import { describe, expect, it } from 'vitest';

import {
  validateContentSemantics,
  v1ReleaseCatalog,
} from '../../sources/content/content-semantic-validator';
import type { ContentPackSource } from '../../sources/content/content-registry';
import type { MissionRecord } from '../../sources/content/mission-contract';
import type {
  AnimalRecord,
  LocationRecord,
  ShelterAreaRecord,
} from '../../sources/content/world-content-contracts';

describe('content semantic validation', () => {
  it('accepts a valid pack and the approved single trace exception', () => {
    expect(validateContentSemantics(validPacks())).toEqual([]);
    expect(
      validateContentSemantics(
        validPacks({
          missions: [
            makeMission({
              id: 'pond-turtle-find-water',
              steps: [makeStep('trace-only', 'trace')],
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    {
      name: 'missing shelter area',
      packs: validPacks({ animals: [makeAnimal({ shelterAreaId: 'missing-area' })] }),
      message: /missing shelter area/u,
    },
    {
      name: 'missing mission location',
      packs: validPacks({ missions: [makeMission({ locationId: 'missing-location' })] }),
      message: /missing location/u,
    },
    {
      name: 'missing mission subject',
      packs: validPacks({ missions: [makeMission({ subjectAnimalId: 'missing-animal' })] }),
      message: /missing animal/u,
    },
    {
      name: 'missing prerequisite',
      packs: validPacks({
        missions: [makeMission({ prerequisites: [{ completedMissionId: 'missing-mission' }] })],
      }),
      message: /missing prerequisite/u,
    },
    {
      name: 'one non-trace step',
      packs: validPacks({ missions: [makeMission({ steps: [makeStep('only-step', 'tap')] })] }),
      message: /must have 2–4 steps/u,
    },
    {
      name: 'unapproved single trace mission',
      packs: validPacks({
        missions: [makeMission({ steps: [makeStep('trace-only', 'trace')] })],
      }),
      message: /must have 2–4 steps/u,
    },
    {
      name: 'five steps',
      packs: validPacks({
        missions: [
          makeMission({
            steps: [
              makeStep('one'),
              makeStep('two'),
              makeStep('three'),
              makeStep('four'),
              makeStep('five'),
            ],
          }),
        ],
      }),
      message: /must have 2–4 steps/u,
    },
    {
      name: 'duplicate step ID',
      packs: validPacks({
        missions: [makeMission({ steps: [makeStep('same'), makeStep('same')] })],
      }),
      message: /repeats step ID/u,
    },
    {
      name: 'rescue without a subject',
      packs: validPacks({ missions: [makeMission({ subjectAnimalId: undefined })] }),
      message: /must declare a subject/u,
    },
    {
      name: 'rescue with the wrong unlock',
      packs: validPacks({ missions: [makeMission({ unlockResidentId: 'other-animal' })] }),
      message: /unlock exactly its subject/u,
    },
    {
      name: 'non-rescue resident unlock',
      packs: validPacks({
        missions: [makeMission({ type: 'world', unlockResidentId: 'mimi-kitten' })],
      }),
      message: /must not unlock/u,
    },
    {
      name: 'over-capacity shelter',
      packs: validPacks({
        animals: [makeAnimal(), makeAnimal({ id: 'second-animal' })],
        shelterAreas: [makeShelterArea({ capacity: 1 })],
      }),
      message: /capacity 1 but 2 residents/u,
    },
  ])('rejects $name', ({ packs, message }) => {
    expect(validateContentSemantics(packs).join('\n')).toMatch(message);
  });

  it('rejects two Rescue missions that unlock the same resident', () => {
    const packs = validPacks({
      missions: [makeMission(), makeMission({ id: 'second-rescue' })],
    });
    expect(validateContentSemantics(packs).join('\n')).toMatch(/unlocked by both/u);
  });

  it('rejects prerequisite cycles while accepting shared completed dependencies', () => {
    const rescue = makeMission();
    const first = makeMission({
      id: 'first-world',
      type: 'world',
      subjectAnimalId: undefined,
      unlockResidentId: undefined,
      prerequisites: [{ completedMissionId: rescue.id }],
    });
    const second = makeMission({
      id: 'second-world',
      type: 'world',
      subjectAnimalId: undefined,
      unlockResidentId: undefined,
      prerequisites: [{ completedMissionId: rescue.id }],
    });
    expect(validateContentSemantics(validPacks({ missions: [rescue, first, second] }))).toEqual([]);

    const cycleA = makeMission({
      id: 'cycle-a',
      type: 'world',
      subjectAnimalId: undefined,
      unlockResidentId: undefined,
      prerequisites: [{ completedMissionId: 'cycle-b' }],
    });
    const cycleB = makeMission({
      id: 'cycle-b',
      type: 'world',
      subjectAnimalId: undefined,
      unlockResidentId: undefined,
      prerequisites: [{ completedMissionId: 'cycle-a' }],
    });
    expect(validateContentSemantics(validPacks({ missions: [cycleA, cycleB] })).join('\n')).toMatch(
      /prerequisite cycle/u,
    );
  });

  it('enforces Help mission resident and Rescue dependencies, including transitive dependencies', () => {
    const rescue = makeMission();
    const bridge = makeMission({
      id: 'bridge-world',
      type: 'world',
      subjectAnimalId: undefined,
      unlockResidentId: undefined,
      prerequisites: [{ completedMissionId: rescue.id }],
    });
    const transitiveHelp = makeMission({
      id: 'help-mimi',
      type: 'help',
      unlockResidentId: undefined,
      prerequisites: [{ completedMissionId: bridge.id }],
    });
    expect(
      validateContentSemantics(validPacks({ missions: [rescue, bridge, transitiveHelp] })),
    ).toEqual([]);

    const noSubject = makeMission({
      id: 'help-no-subject',
      type: 'help',
      subjectAnimalId: undefined,
      unlockResidentId: undefined,
    });
    expect(
      validateContentSemantics(validPacks({ missions: [rescue, noSubject] })).join('\n'),
    ).toMatch(/must declare its resident subject/u);

    const noRescue = makeMission({
      id: 'help-no-rescue',
      type: 'help',
      unlockResidentId: undefined,
    });
    expect(validateContentSemantics(validPacks({ missions: [noRescue] })).join('\n')).toMatch(
      /has no Rescue mission/u,
    );

    const unrelated = makeMission({
      id: 'unrelated-world',
      type: 'world',
      subjectAnimalId: undefined,
      unlockResidentId: undefined,
    });
    const unrelatedHelp = makeMission({
      id: 'help-unrelated',
      type: 'help',
      unlockResidentId: undefined,
      prerequisites: [
        { completedMissionId: unrelated.id },
        { completedMissionId: 'missing-mission' },
      ],
    });
    expect(
      validateContentSemantics(validPacks({ missions: [rescue, unrelated, unrelatedHelp] })).join(
        '\n',
      ),
    ).toMatch(/must depend on Rescue mission/u);

    const loopingHelp = makeMission({
      id: 'help-looping',
      type: 'help',
      unlockResidentId: undefined,
      prerequisites: [{ completedMissionId: unrelated.id }, { completedMissionId: unrelated.id }],
    });
    expect(
      validateContentSemantics(validPacks({ missions: [rescue, unrelated, loopingHelp] })).join(
        '\n',
      ),
    ).toMatch(/must depend on Rescue mission/u);
  });
});

describe('v1 release catalog validation', () => {
  it('defines and accepts the exact normative v1 catalog', () => {
    expect(v1ReleaseCatalog.animals).toHaveLength(12);
    expect(v1ReleaseCatalog.missions).toHaveLength(16);
    expect(v1ReleaseCatalog.locations).toEqual(['garden', 'forest', 'farm', 'pond']);
    expect(validateContentSemantics([makeV1Pack()], { releaseCatalog: 'v1' })).toEqual([]);
  });

  it('requires the base pack', () => {
    const expansion = { ...makeV1Pack(), id: 'expansion' };
    expect(validateContentSemantics([expansion], { releaseCatalog: 'v1' }).join('\n')).toMatch(
      /requires the base pack/u,
    );
  });

  it('rejects an expansion pack alongside the exact base catalog', () => {
    const expansion = {
      ...makePack({}),
      id: 'expansion',
      dependencies: ['base'],
    };
    expect(
      validateContentSemantics([makeV1Pack(), expansion], { releaseCatalog: 'v1' }).join('\n'),
    ).toMatch(/no expansion packs/u);
  });

  it.each([
    ['resident', withoutRecord(makeV1Pack(), 'animals')],
    ['location', withoutRecord(makeV1Pack(), 'locations')],
    ['shelter area', withoutRecord(makeV1Pack(), 'shelterAreas')],
    ['mission', withoutRecord(makeV1Pack(), 'missions')],
  ])('requires the exact %s ID set', (label, pack) => {
    expect(validateContentSemantics([pack], { releaseCatalog: 'v1' }).join('\n')).toMatch(
      new RegExp(`v1 base ${label} IDs`, 'u'),
    );
  });

  it('rejects a same-size but incorrect ID set', () => {
    const pack = makeV1Pack();
    const animals = [makeAnimal({ id: 'unexpected-resident' }), ...pack.records.animals.slice(1)];
    expect(
      validateContentSemantics([withRecords(pack, { animals })], { releaseCatalog: 'v1' }).join(
        '\n',
      ),
    ).toMatch(/v1 base resident IDs/u);
  });

  it('rejects incorrect resident allocation and shelter capacity', () => {
    const pack = makeV1Pack();
    const animals = pack.records.animals.map((animal) =>
      animal.id === 'mimi-kitten' ? { ...animal, shelterAreaId: 'garden' } : animal,
    );
    const shelterAreas = pack.records.shelterAreas.map((area) =>
      area.id === 'indoor-room' ? { ...area, capacity: 5 } : area,
    );
    const findings = validateContentSemantics([withRecords(pack, { animals, shelterAreas })], {
      releaseCatalog: 'v1',
    }).join('\n');
    expect(findings).toMatch(/must belong to shelter area indoor-room/u);
    expect(findings).toMatch(/must have capacity 4/u);
  });

  it('rejects a normative resident with the wrong species', () => {
    const pack = makeV1Pack();
    const animals = pack.records.animals.map((animal) =>
      animal.id === 'mimi-kitten' ? { ...animal, species: 'puppy' } : animal,
    );
    expect(
      validateContentSemantics([withRecords(pack, { animals })], { releaseCatalog: 'v1' }).join(
        '\n',
      ),
    ).toMatch(/mimi-kitten must use species kitten/u);
  });

  it('rejects incorrect mission category, location, subject, and step count', () => {
    const pack = makeV1Pack();
    const missions = pack.records.missions.map((missionRecord) =>
      missionRecord.id === 'garden-kitten-tree'
        ? makeMission({
            id: missionRecord.id,
            type: 'help',
            locationId: 'forest',
            subjectAnimalId: 'suni-hedgehog',
            unlockResidentId: undefined,
            steps: [makeStep('one'), makeStep('two'), makeStep('three')],
          })
        : missionRecord,
    );
    const findings = validateContentSemantics([withRecords(pack, { missions })], {
      releaseCatalog: 'v1',
    }).join('\n');
    expect(findings).toMatch(/must be rescue content in garden/u);
    expect(findings).toMatch(/wrong resident subject/u);
    expect(findings).toMatch(/wrong interaction composition/u);
  });

  it('rejects a tutorial whose interaction composition no longer matches its purpose', () => {
    const pack = makeV1Pack();
    const missions = pack.records.missions.map((missionRecord) =>
      missionRecord.id === 'garden-kitten-tree'
        ? { ...missionRecord, steps: [makeStep('wipe-one', 'wipe'), makeStep('wipe-two', 'wipe')] }
        : missionRecord,
    );
    expect(
      validateContentSemantics([withRecords(pack, { missions })], { releaseCatalog: 'v1' }).join(
        '\n',
      ),
    ).toMatch(/garden-kitten-tree has the wrong interaction composition/u);
  });

  const invalidLocaleCases: readonly [string, ContentPackSource['locales']][] = [
    ['only one locale', ['hu']],
    ['missing Hungarian', ['en', 'en']],
    ['missing English', ['hu', 'hu']],
  ];

  it.each(invalidLocaleCases)('rejects %s', (_name, locales) => {
    const pack = { ...makeV1Pack(), locales };
    expect(validateContentSemantics([pack], { releaseCatalog: 'v1' }).join('\n')).toMatch(
      /exactly the hu and en locales/u,
    );
  });
});

type RecordOverrides = Partial<ContentPackSource['records']>;

function validPacks(overrides: RecordOverrides = {}): readonly ContentPackSource[] {
  return [
    makePack({
      animals: [makeAnimal()],
      locations: [makeLocation()],
      missions: [makeMission()],
      shelterAreas: [makeShelterArea()],
      ...overrides,
    }),
  ];
}

function makePack(records: RecordOverrides, releaseAssets = false): ContentPackSource {
  const completeRecords = {
    animals: [],
    assets: [],
    localizations: {},
    locations: [],
    missions: [],
    shelterAreas: [],
    ...records,
  };
  const assets =
    records.assets ?? makeAssetRecords(referencedPaths(completeRecords), releaseAssets, 'base');
  return {
    id: 'base',
    version: '0.3.0',
    contractVersion: 1,
    titleKey: 'pack.base.title',
    locales: ['hu', 'en'],
    dependencies: [],
    content: {
      animals: 'animals',
      locations: 'locations',
      missions: 'missions',
      shelterAreas: 'shelter-areas',
    },
    records: {
      ...completeRecords,
      assets,
    },
  };
}

function makeAnimal(overrides: Partial<AnimalRecord> = {}): AnimalRecord {
  return {
    id: 'mimi-kitten',
    species: 'kitten',
    nameKey: 'animal.mimi-kitten.name',
    shelterAreaId: 'indoor-room',
    assets: {
      portrait: 'images/mimi-portrait.png',
      idle: 'images/mimi-idle.png',
      happy: 'images/mimi-happy.png',
    },
    shelterReactions: ['greet'],
    ...overrides,
  };
}

function makeLocation(overrides: Partial<LocationRecord> = {}): LocationRecord {
  return {
    id: 'garden',
    nameKey: 'location.garden.name',
    mapLabelKey: 'location.garden.map-label',
    assets: {
      mapBackground: 'images/garden-map.png',
      missionBackground: 'images/garden-mission.png',
    },
    ...overrides,
  };
}

function makeShelterArea(overrides: Partial<ShelterAreaRecord> = {}): ShelterAreaRecord {
  return {
    id: 'indoor-room',
    nameKey: 'shelter-area.indoor-room.name',
    capacity: 4,
    assets: { background: 'images/indoor-room.png' },
    ...overrides,
  };
}

type MissionOptions = Readonly<{
  id?: string;
  type?: MissionRecord['type'];
  locationId?: string;
  subjectAnimalId?: string | undefined;
  unlockResidentId?: string | undefined;
  prerequisites?: MissionRecord['prerequisites'];
  steps?: MissionRecord['steps'];
}>;

function makeMission(options: MissionOptions = {}): MissionRecord {
  const id = options.id ?? 'garden-kitten-tree';
  const type = options.type ?? 'rescue';
  const subjectAnimalId = Object.hasOwn(options, 'subjectAnimalId')
    ? options.subjectAnimalId
    : 'mimi-kitten';
  const unlockResidentId = Object.hasOwn(options, 'unlockResidentId')
    ? options.unlockResidentId
    : 'mimi-kitten';
  const reward =
    unlockResidentId === undefined
      ? { completeMission: true as const }
      : { completeMission: true as const, unlockResidentId };
  const common = {
    id,
    type,
    locationId: options.locationId ?? 'garden',
    prerequisites: options.prerequisites ?? [],
    scene: {
      background: `images/missions/${id}/background.png`,
      designWidth: 1024 as const,
      designHeight: 768 as const,
    },
    steps: options.steps ?? [makeStep('first'), makeStep('second')],
    reward,
    localization: {
      titleKey: `mission.${id}.title`,
      introKey: `mission.${id}.intro`,
      successKey: `mission.${id}.success`,
    },
    assets: { required: [`images/missions/${id}/background.png`] },
  };
  return subjectAnimalId === undefined ? common : { ...common, subjectAnimalId };
}

function makeStep(
  id: string,
  type: MissionRecord['steps'][number]['type'] = 'tap',
): MissionRecord['steps'][number] {
  const common = {
    id,
    promptKey: `mission.step.${id}`,
    successCue: 'effects.progress.step-complete' as const,
    hint: { type: 'pulse-after-delay' as const, delayMs: 5000 },
  };
  if (type === 'trace') {
    return { ...common, type, pathId: `${id}-path`, corridorWidth: 0.2 };
  }
  if (type === 'drag') {
    return {
      ...common,
      type,
      sourceId: `${id}-source`,
      targetId: `${id}-target`,
      snapTolerance: 0.5,
    };
  }
  if (type === 'wipe') {
    return { ...common, type, maskId: `${id}-mask`, completionRatio: 0.7 };
  }
  if (type === 'match') {
    return {
      ...common,
      type,
      pairs: [{ sourceId: `${id}-source`, targetId: `${id}-target` }],
    };
  }
  return { ...common, type, targetIds: [`${id}-target`] };
}

function makeV1Pack(): ContentPackSource {
  const rescueByAnimal = new Map(
    v1ReleaseCatalog.missions
      .filter(({ type }) => type === 'rescue')
      .map(({ id, subjectAnimalId }) => [subjectAnimalId, id]),
  );
  const animals = v1ReleaseCatalog.animals.map(([id, shelterAreaId, species]) =>
    makeAnimal({ id, species, shelterAreaId, nameKey: `animal.${id}.name` }),
  );
  const locations = v1ReleaseCatalog.locations.map((id) =>
    makeLocation({ id, nameKey: `location.${id}.name`, mapLabelKey: `location.${id}.map-label` }),
  );
  const shelterAreas = v1ReleaseCatalog.shelterAreas.map((id) =>
    makeShelterArea({ id, nameKey: `shelter-area.${id}.name` }),
  );
  const missions = v1ReleaseCatalog.missions.map((expected) => {
    const prerequisites =
      expected.type === 'help' && expected.subjectAnimalId !== undefined
        ? [{ completedMissionId: rescueByAnimal.get(expected.subjectAnimalId) ?? 'missing-rescue' }]
        : [];
    const stepTypes = expected.stepTypeSequences[0] ?? ['tap', 'tap'];
    return makeMission({
      id: expected.id,
      type: expected.type,
      locationId: expected.locationId,
      subjectAnimalId: expected.subjectAnimalId,
      unlockResidentId: expected.type === 'rescue' ? expected.subjectAnimalId : undefined,
      prerequisites,
      steps: stepTypes.map((stepType, index) => makeStep(`step-${String(index + 1)}`, stepType)),
    });
  });
  return makePack({ animals, locations, missions, shelterAreas }, true);
}

function referencedPaths(records: ContentPackSource['records']): readonly string[] {
  return [
    ...records.animals.flatMap(({ assets }) => Object.values(assets)),
    ...records.locations.flatMap(({ assets }) => Object.values(assets)),
    ...records.shelterAreas.map(({ assets }) => assets.background),
    ...records.missions.flatMap(({ scene, assets }) => [scene.background, ...assets.required]),
  ].filter((value): value is string => typeof value === 'string');
}

function makeAssetRecords(
  paths: readonly string[],
  releaseAssets: boolean,
  ownership: string,
): ContentPackSource['records']['assets'] {
  return [...new Set(paths)].map((objectKey, index) => ({
    id: `fixture-asset-${String(index + 1)}`,
    category: 'image' as const,
    objectKey,
    role: `fixture-role-${String(index + 1)}`,
    ownership,
    mediaType: 'image/png' as const,
    qaStatus: 'approved' as const,
    licenseStatus: 'approved' as const,
    provenanceStatus: 'approved' as const,
    promptRecord: `prompts/fixture-${String(index + 1)}.md`,
    width: 100,
    height: 100,
    transparent: false,
    ...(releaseAssets
      ? {
          classification: 'production-safe' as const,
          delivery: 'r2-locked' as const,
          bytes: 100,
          digest: `sha256:${'0'.repeat(64)}` as const,
        }
      : {}),
  }));
}

function withoutRecord(
  pack: ContentPackSource,
  kind: 'animals' | 'locations' | 'missions' | 'shelterAreas',
): ContentPackSource {
  return withRecords(pack, { [kind]: pack.records[kind].slice(1) });
}

function withRecords(pack: ContentPackSource, overrides: RecordOverrides): ContentPackSource {
  return { ...pack, records: { ...pack.records, ...overrides } };
}
