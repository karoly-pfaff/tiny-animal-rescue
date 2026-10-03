import { describe, expect, it } from 'vitest';

import { rewritePendingAssetReferences } from '../../scripts/lib/pending-asset-boundary';

const pendingAssets = {
  base: [{ id: 'future-background', objectKey: 'images/future.png' }],
  expansion: [{ id: 'future-portrait', objectKey: 'images/portrait.webp' }],
} as const;

describe('pending production asset build boundary', () => {
  it('replaces own-pack and qualified pending references with extensionless placeholders', () => {
    const rewritten = rewritePendingAssetReferences(
      {
        inventory: { objectKey: 'images/future.png' },
        location: { background: 'images/future.png' },
        dependency: 'expansion:images/portrait.webp',
      },
      'base',
      pendingAssets,
    );

    expect(rewritten).toEqual({
      inventory: { objectKey: 'pending-assets/future-background' },
      location: { background: 'pending-assets/future-background' },
      dependency: 'expansion:pending-assets/future-portrait',
    });
    expect(JSON.stringify(rewritten)).not.toMatch(/\.(?:png|webp)/u);
  });

  it('preserves locked, unknown, and non-string content values', () => {
    expect(
      rewritePendingAssetReferences(
        {
          locked: 'images/locked.png',
          missing: 'images/missing.png',
          count: 3,
          enabled: true,
          empty: null,
        },
        'base',
        pendingAssets,
      ),
    ).toEqual({
      locked: 'images/locked.png',
      missing: 'images/missing.png',
      count: 3,
      enabled: true,
      empty: null,
    });
  });
});
