import { describe, expect, it } from 'vitest';

import { bundledContentRegistry } from '../../sources/content/bundled-content-registry';
import { primitiveDemonstrationScene } from '../fixtures/interactions/primitive-demonstration';

describe('primitive demonstration contract', () => {
  it('declares every accepted primitive exactly once as inert contract data', () => {
    expect(primitiveDemonstrationScene.steps.map(({ type }) => type)).toEqual([
      'tap',
      'drag',
      'wipe',
      'match',
      'trace',
    ]);
    expect(JSON.parse(JSON.stringify(primitiveDemonstrationScene))).toEqual(
      primitiveDemonstrationScene,
    );
  });

  it('remains outside the bundled v1 mission registry', () => {
    const bundledMissionIds = Object.values(bundledContentRegistry.packs).flatMap(({ records }) =>
      records.missions.map(({ id }) => id),
    );

    expect(bundledMissionIds).not.toContain(primitiveDemonstrationScene.id);
  });
});
