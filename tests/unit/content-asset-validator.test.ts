import { describe, expect, it } from 'vitest';

import { validateContentAssets } from '../../sources/content/content-asset-validator';
import type { ContentPackSource } from '../../sources/content/content-registry';
import type { AssetMetadata } from '../../sources/content/world-content-contracts';

type ImageAsset = Extract<AssetMetadata, Readonly<{ category: 'image' }>>;
type AudioAsset = Exclude<AssetMetadata, Readonly<{ category: 'image' }>>;

describe('content asset validation', () => {
  it('accepts owned image metadata and references from every content record type', () => {
    const references = [
      'images/portrait.png',
      'images/idle.png',
      'images/happy.png',
      'images/sleeping.png',
      'images/map.png',
      'images/mission.png',
      'images/shelter.png',
      'images/scene.png',
      'images/required.png',
    ] as const;
    const pack = makePack({
      assets: references.map((objectKey, index) =>
        imageAsset({ id: `asset-${String(index + 1)}`, objectKey }),
      ),
      animals: [
        {
          id: 'animal',
          species: 'animal',
          nameKey: 'animal.name',
          shelterAreaId: 'area',
          assets: {
            portrait: references[0],
            idle: references[1],
            happy: references[2],
            sleeping: references[3],
          },
          shelterReactions: ['greet'],
        },
      ],
      locations: [
        {
          id: 'place',
          nameKey: 'place.name',
          mapLabelKey: 'place.map-label',
          assets: {
            mapBackground: references[4],
            missionBackground: references[5],
          },
        },
      ],
      shelterAreas: [
        {
          id: 'area',
          nameKey: 'area.name',
          capacity: 1,
          assets: { background: references[6] },
        },
      ],
      missions: [missionWithAssets(references[7], [references[8]])],
    });

    expect(validateContentAssets([pack])).toEqual([]);
  });

  it('rejects duplicate keys, wrong ownership, unsafe keys, and media-extension drift', () => {
    const findings = validateContentAssets([
      makePack({
        assets: [
          imageAsset({ id: 'first', objectKey: '../unsafe.png' }),
          imageAsset({
            id: 'second',
            objectKey: '../unsafe.png',
            ownership: 'other-pack',
            mediaType: 'image/webp',
          }),
        ],
      }),
    ]).join('\n');

    expect(findings).toMatch(/repeats asset object key/u);
    expect(findings).toMatch(/must be owned/u);
    expect(findings).toMatch(/unsafe pack-relative/u);
    expect(findings).toMatch(/does not match image\/webp/u);
  });

  it('validates image, shared-audio, and localized voice ownership rules', () => {
    expect(validateContentAssets([makePack({ assets: [imageAsset()] })])).toEqual([]);
    expect(
      validateContentAssets([
        makePack({
          assets: [audioAsset({ category: 'effect', objectKey: 'audio/shared/tap.ogg' })],
        }),
      ]),
    ).toEqual([]);
    expect(
      validateContentAssets([
        makePack({
          assets: [
            audioAsset({
              category: 'voice',
              objectKey: 'audio/voice/hu/prompt.ogg',
              locale: 'hu',
            }),
          ],
        }),
      ]),
    ).toEqual([]);

    const invalidDuration = audioAsset({
      category: 'music',
      objectKey: 'audio/not-shared/theme.wav',
      mediaType: 'audio/wav',
      locale: 'en',
      durationBoundsSeconds: { min: 2, max: 1 },
    });
    const missingLocale = audioAsset({ category: 'voice', objectKey: 'audio/voice/hu/prompt.ogg' });
    const wrongVoicePath = audioAsset({
      category: 'voice',
      objectKey: 'audio/voice/en/prompt.ogg',
      locale: 'hu',
    });
    const wrongSharedPath = audioAsset({
      category: 'effect',
      objectKey: 'audio/effects/not-shared.ogg',
    });
    const findings = validateContentAssets([
      makePack({ assets: [invalidDuration, missingLocale, wrongVoicePath, wrongSharedPath] }),
    ]).join('\n');

    expect(findings).toMatch(/invalid duration bounds/u);
    expect(findings).toMatch(/must not declare a locale/u);
    expect(findings).toMatch(/must live under audio\/shared/u);
    expect(findings).toMatch(/must declare a locale/u);
    expect(findings).toMatch(/locale-owned voice path/u);
  });

  it('resolves own and declared dependency references and rejects undeclared access', () => {
    const base = makePack({
      assets: [imageAsset({ objectKey: 'images/shared.png' })],
    });
    const declared = makePack(
      {
        locations: [locationWithAssets('base:images/shared.png')],
      },
      { id: 'declared-pack', dependencies: ['base'] },
    );
    expect(validateContentAssets([base, declared])).toEqual([]);

    const selfQualified = makePack({
      assets: [imageAsset({ objectKey: 'images/self.png' })],
      locations: [locationWithAssets('base:images/self.png')],
    });
    expect(validateContentAssets([selfQualified]).join('\n')).toMatch(
      /own assets without a pack qualifier/u,
    );

    const undeclared = makePack(
      { locations: [locationWithAssets('base:images/shared.png')] },
      { id: 'undeclared-pack' },
    );
    expect(validateContentAssets([base, undeclared]).join('\n')).toMatch(
      /without declaring a dependency/u,
    );
  });

  it('rejects unsafe and missing asset references', () => {
    const findings = validateContentAssets([
      makePack({
        locations: [
          locationWithAssets('https://example.test/image.png'),
          locationWithAssets('images/missing.png', 'second-location'),
        ],
      }),
    ]).join('\n');

    expect(findings).toMatch(/unsafe asset reference/u);
    expect(findings).toMatch(/references missing asset/u);
  });

  it('rejects audio metadata when a content field requires an image', () => {
    const audio = audioAsset({ objectKey: 'audio/shared/not-an-image.ogg' });
    const findings = validateContentAssets([
      makePack({
        assets: [audio],
        locations: [locationWithAssets(audio.objectKey)],
      }),
    ]).join('\n');

    expect(findings).toMatch(/used as image, but the inventory declares effect/u);
  });

  it('requires verified non-placeholder metadata for every release reference', () => {
    const ready = releaseImage();
    const pack = makePack({
      assets: [ready],
      locations: [locationWithAssets(ready.objectKey)],
    });
    expect(validateContentAssets([pack], { release: true })).toEqual([]);

    const pending = imageAsset({
      id: 'placeholder-image',
      objectKey: 'images/placeholder/image.png',
      role: 'placeholder-role',
      qaStatus: 'not-produced',
      licenseStatus: 'pending-production',
      provenanceStatus: 'pending-production',
      classification: 'presentation-only',
      delivery: 'r2-pending',
      bytes: 0,
      digest: 'sha256:not-a-digest',
    });
    const findings = validateContentAssets(
      [
        makePack({
          assets: [pending],
          locations: [locationWithAssets(pending.objectKey)],
        }),
      ],
      { release: true },
    ).join('\n');
    expect(findings).toMatch(/pending, unverified, or a placeholder/u);
  });

  it('rejects absent release byte and digest evidence', () => {
    const asset = imageAsset({
      classification: 'production-safe',
      delivery: 'r2-locked',
    });
    const findings = validateContentAssets(
      [makePack({ assets: [asset], locations: [locationWithAssets(asset.objectKey)] })],
      { release: true },
    );
    expect(findings).toHaveLength(2);
  });
});

type RecordOverrides = Partial<ContentPackSource['records']>;
type PackOptions = Readonly<{ id?: string; dependencies?: readonly string[] }>;

function makePack(records: RecordOverrides, options: PackOptions = {}): ContentPackSource {
  const id = options.id ?? 'base';
  return {
    id,
    version: '0.3.0',
    contractVersion: 1,
    titleKey: `pack.${id}.title`,
    locales: ['hu', 'en'],
    dependencies: options.dependencies ?? [],
    content: {
      animals: 'animals',
      locations: 'locations',
      missions: 'missions',
      shelterAreas: 'shelter-areas',
    },
    records: {
      animals: [],
      assets: [],
      localizations: {},
      locations: [],
      missions: [],
      shelterAreas: [],
      ...records,
    },
  };
}

function imageAsset(overrides: Partial<ImageAsset> = {}): ImageAsset {
  return {
    id: 'image-asset',
    category: 'image',
    objectKey: 'images/image.png',
    role: 'image-role',
    ownership: 'base',
    mediaType: 'image/png',
    qaStatus: 'approved',
    licenseStatus: 'approved',
    provenanceStatus: 'approved',
    promptRecord: 'prompts/image.md',
    width: 100,
    height: 100,
    transparent: false,
    ...overrides,
  };
}

function releaseImage(): ImageAsset {
  return imageAsset({
    classification: 'production-safe',
    delivery: 'r2-locked',
    bytes: 100,
    digest: `sha256:${'0'.repeat(64)}`,
  });
}

function audioAsset(overrides: Partial<AudioAsset> = {}): AudioAsset {
  const category = overrides.category ?? 'effect';
  const common = {
    id: `${category}-asset`,
    objectKey: 'audio/shared/sound.ogg',
    role: `${category}-role`,
    ownership: 'base',
    mediaType: 'audio/ogg' as const,
    qaStatus: 'approved' as const,
    licenseStatus: 'approved' as const,
    provenanceStatus: 'approved' as const,
    promptRecord: 'prompts/audio.md',
    durationBoundsSeconds: { min: 0.1, max: 1 },
    ...overrides,
  };
  if (category === 'voice') {
    return { ...common, category };
  }
  return { ...common, category };
}

function locationWithAssets(
  mapBackground: string,
  id = 'location',
): ContentPackSource['records']['locations'][number] {
  return {
    id,
    nameKey: `location.${id}.name`,
    mapLabelKey: `location.${id}.map-label`,
    assets: { mapBackground, missionBackground: mapBackground },
  };
}

function missionWithAssets(
  background: string,
  required: readonly string[],
): ContentPackSource['records']['missions'][number] {
  return {
    id: 'mission',
    type: 'world',
    locationId: 'place',
    prerequisites: [],
    scene: { background, designWidth: 1024, designHeight: 768 },
    steps: [
      {
        id: 'first',
        type: 'tap',
        promptKey: 'mission.step.first',
        successCue: 'effects.progress.step-complete',
        hint: { type: 'pulse-after-delay', delayMs: 5000 },
        targetIds: ['target'],
      },
      {
        id: 'second',
        type: 'tap',
        promptKey: 'mission.step.second',
        successCue: 'effects.progress.step-complete',
        hint: { type: 'pulse-after-delay', delayMs: 5000 },
        targetIds: ['target'],
      },
    ],
    reward: { completeMission: true },
    localization: {
      titleKey: 'mission.title',
      introKey: 'mission.intro',
      successKey: 'mission.success',
    },
    assets: { required },
  };
}
