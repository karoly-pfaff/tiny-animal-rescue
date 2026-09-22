import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getFirstRescueNarrationText,
  resolveFirstRescueNarration,
} from '../../sources/content/first-rescue-narration';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('first rescue narration resolver', () => {
  it('returns no production URL while materialized assets are unavailable', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', undefined);
    expect(
      resolveFirstRescueNarration('voice.mission.garden-kitten-tree.success', 'hu'),
    ).toBeNull();
  });

  it('resolves locale-specific semantic cues under the packaged local asset tree', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', 'true');
    expect(
      resolveFirstRescueNarration('voice.mission.garden-kitten-tree.step.help-mimi-down', 'en'),
    ).toBe(
      './content/base/assets/audio/voice/en/missions/garden-kitten-tree/step-help-mimi-down.ogg',
    );
    expect(
      resolveFirstRescueNarration('voice.mission.garden-kitten-tree.step.place-ladder', 'hu'),
    ).toBe(
      './content/base/assets/audio/voice/hu/missions/garden-kitten-tree/step-place-ladder.ogg',
    );
  });

  it('fails closed instead of treating a configured value as a remote asset base', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', 'https://assets.example');
    expect(() =>
      resolveFirstRescueNarration('voice.mission.garden-kitten-tree.success', 'hu'),
    ).toThrow(/must be exactly true/u);
  });

  it('reads the exact localized fallback from the authoritative voice manifest', () => {
    expect(
      getFirstRescueNarrationText('voice.mission.garden-kitten-tree.step.place-ladder', 'en'),
    ).toBe('Drag the ladder to the tree!');
    expect(getFirstRescueNarrationText('voice.mission.garden-kitten-tree.success', 'hu')).toBe(
      'Mimi biztonságban van!',
    );
  });
});
