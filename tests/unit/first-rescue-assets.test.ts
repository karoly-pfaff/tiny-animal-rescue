import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resolveContentAsset,
  resolveStartBackground,
} from '../../sources/content/content-asset-resolver';
import type { ContentRegistry } from '../../sources/content/content-registry';
import { resolveFirstRescueAssets } from '../../sources/content/first-rescue-content';
import { testContentRegistry, testFirstRescueContent } from '../support/first-rescue-content';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('content visual asset resolver', () => {
  it('uses code-native fallbacks when materialized media is unavailable', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', undefined);

    expect(resolveStartBackground(testContentRegistry)).toBeNull();
    expect(Object.values(resolveFirstRescueAssets(testFirstRescueContent))).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('resolves only packaged local production paths declared by content', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', 'true');

    expect(resolveStartBackground(testContentRegistry)).toBe(
      './content/base/assets/images/start/welcome-garden.png',
    );
    expect(resolveFirstRescueAssets(testFirstRescueContent)).toEqual({
      ladder: './content/base/assets/images/missions/garden-kitten-tree/ladder.png',
      mapBackground: './content/base/assets/images/map/garden-map.png',
      missionAnimal: './content/base/assets/images/residents/mimi/mission.png',
      missionBackground: './content/base/assets/images/missions/garden-kitten-tree/background.png',
      residentCelebration: './content/base/assets/images/residents/mimi/celebration.png',
      residentPortrait: './content/base/assets/images/residents/mimi/canonical.png',
      residentShelter: './content/base/assets/images/residents/mimi/shelter-idle.png',
      shelterBackground: './content/base/assets/images/shelter/indoor-room.png',
    });
  });

  it('rejects an invalid materialization marker', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', 'https://assets.example');

    expect(() => resolveStartBackground(testContentRegistry)).toThrow(/must be exactly true/u);
  });

  it('rejects unknown packs, undeclared dependencies, and missing inventory records', () => {
    expect(() => resolveContentAsset(testContentRegistry, 'missing', 'images/example.png')).toThrow(
      /unknown pack/u,
    );

    const basePack = testContentRegistry.packs['base'];
    if (basePack === undefined) {
      throw new Error('The base fixture pack is required.');
    }
    const otherPack = { ...basePack, id: 'other', records: { ...basePack.records, assets: [] } };
    const twoPackRegistry: ContentRegistry = {
      ...testContentRegistry,
      packOrder: ['base', 'other'],
      packs: { base: basePack, other: otherPack },
    };
    expect(() => resolveContentAsset(twoPackRegistry, 'base', 'other:images/example.png')).toThrow(
      /undeclared pack dependency/u,
    );
    expect(() => resolveContentAsset(testContentRegistry, 'base', 'images/example.png')).toThrow(
      /missing from its owning pack inventory/u,
    );
  });

  it.each([
    '/absolute.png',
    'C:/absolute.png',
    'https://example.test/image.png',
    '../outside.png',
    'images/../outside.png',
    './image.png',
    'images\\asset.png',
    'images//asset.png',
    'base:',
    'base:images/asset.png:extra',
  ])('rejects unsafe runtime asset reference %j', (reference) => {
    expect(() => resolveContentAsset(testContentRegistry, 'base', reference)).toThrow(
      /unsafe or malformed/u,
    );
  });

  it('rejects self-qualified runtime asset references', () => {
    expect(() =>
      resolveContentAsset(testContentRegistry, 'base', 'base:images/map/garden-map.png'),
    ).toThrow(/without a qualifier/u);
  });

  it('requires one unambiguous start background', () => {
    const basePack = testContentRegistry.packs['base'];
    if (basePack === undefined) {
      throw new Error('The base fixture pack is required.');
    }
    const withoutStart: ContentRegistry = {
      ...testContentRegistry,
      packs: {
        base: {
          ...basePack,
          records: {
            ...basePack.records,
            assets: basePack.records.assets.filter(({ role }) => role !== 'start-background'),
          },
        },
      },
    };

    expect(() => resolveStartBackground(withoutStart)).toThrow(/exactly one start background/u);
  });

  it('rejects an unsafe start background inventory path', () => {
    const basePack = testContentRegistry.packs['base'];
    if (basePack === undefined) {
      throw new Error('The base fixture pack is required.');
    }
    const unsafeStart: ContentRegistry = {
      ...testContentRegistry,
      packs: {
        base: {
          ...basePack,
          records: {
            ...basePack.records,
            assets: basePack.records.assets.map((asset) =>
              asset.role === 'start-background' ? { ...asset, objectKey: '../outside.png' } : asset,
            ),
          },
        },
      },
    };

    expect(() => resolveStartBackground(unsafeStart)).toThrow(/unsafe or malformed/u);
  });
});
