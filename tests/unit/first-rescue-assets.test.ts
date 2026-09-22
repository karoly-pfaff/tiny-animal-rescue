import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resolveGardenMissionBackground,
  resolveGardenMissionLadder,
  resolveGardenMapBackground,
  resolveIndoorShelterBackground,
  resolveMimiCanonical,
  resolveMimiCelebration,
  resolveMimiMission,
  resolveMimiShelter,
  resolveStartBackground,
} from '../../sources/content/first-rescue-assets';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('first rescue visual asset resolver', () => {
  it('uses the code-native fallback when materialized media is unavailable', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', undefined);
    expect(resolveStartBackground()).toBeNull();
    expect(resolveGardenMapBackground()).toBeNull();
    expect(resolveGardenMissionBackground()).toBeNull();
    expect(resolveGardenMissionLadder()).toBeNull();
    expect(resolveMimiCanonical()).toBeNull();
    expect(resolveMimiMission()).toBeNull();
    expect(resolveMimiCelebration()).toBeNull();
    expect(resolveIndoorShelterBackground()).toBeNull();
    expect(resolveMimiShelter()).toBeNull();
  });

  it('resolves only packaged local production paths', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', 'true');
    expect(resolveStartBackground()).toBe('./content/base/assets/images/start/welcome-garden.png');
    expect(resolveGardenMapBackground()).toBe('./content/base/assets/images/map/garden-map.png');
    expect(resolveGardenMissionBackground()).toBe(
      './content/base/assets/images/missions/garden-kitten-tree/background.png',
    );
    expect(resolveGardenMissionLadder()).toBe(
      './content/base/assets/images/missions/garden-kitten-tree/ladder.png',
    );
    expect(resolveMimiCanonical()).toBe(
      './content/base/assets/images/residents/mimi/canonical.png',
    );
    expect(resolveMimiMission()).toBe('./content/base/assets/images/residents/mimi/mission.png');
    expect(resolveMimiCelebration()).toBe(
      './content/base/assets/images/residents/mimi/celebration.png',
    );
    expect(resolveIndoorShelterBackground()).toBe(
      './content/base/assets/images/shelter/indoor-room.png',
    );
    expect(resolveMimiShelter()).toBe(
      './content/base/assets/images/residents/mimi/shelter-idle.png',
    );
  });

  it('rejects any configured value other than the exact materialization marker', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', 'https://assets.example');
    expect(() => resolveStartBackground()).toThrow(/must be exactly true/u);
  });
});
