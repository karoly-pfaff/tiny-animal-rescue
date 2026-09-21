import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getFirstRescueNarrationText,
  resolveFirstRescueNarration,
} from '../../sources/content/first-rescue-narration';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('first rescue narration resolver', () => {
  it('returns no production URL while the external asset base is unavailable', () => {
    vi.stubEnv('VITE_ASSET_BASE_URL', undefined);
    expect(
      resolveFirstRescueNarration('voice.mission.garden-kitten-tree.success', 'hu'),
    ).toBeNull();
  });

  it('resolves locale-specific semantic cues under the trusted R2 base', () => {
    vi.stubEnv('VITE_ASSET_BASE_URL', 'https://assets.example/');
    expect(
      resolveFirstRescueNarration('voice.mission.garden-kitten-tree.step.help-mimi-down', 'en'),
    ).toBe(
      'https://assets.example/audio/voice/en/missions/garden-kitten-tree/step-help-mimi-down.ogg',
    );
    expect(
      resolveFirstRescueNarration('voice.mission.garden-kitten-tree.step.place-ladder', 'hu'),
    ).toBe(
      'https://assets.example/audio/voice/hu/missions/garden-kitten-tree/step-place-ladder.ogg',
    );
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
