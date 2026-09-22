import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resolveGardenMapBackground,
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
  });

  it('resolves only packaged local production paths', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', 'true');
    expect(resolveStartBackground()).toBe('./content/base/assets/images/start/welcome-garden.png');
    expect(resolveGardenMapBackground()).toBe('./content/base/assets/images/map/garden-map.png');
  });

  it('rejects any configured value other than the exact materialization marker', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', 'https://assets.example');
    expect(() => resolveStartBackground()).toThrow(/must be exactly true/u);
  });
});
