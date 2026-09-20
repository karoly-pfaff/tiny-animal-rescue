import { describe, expect, it } from 'vitest';

import { resolveRoute } from '../../sources/app/routes';

describe('resolveRoute', () => {
  it.each([
    ['/', 'start'],
    ['/map', 'map'],
    ['/mission', 'mission'],
    ['/celebration', 'celebration'],
    ['/shelter', 'shelter'],
    ['/parent-settings', 'parent-settings'],
  ])('maps %s to %s', (path, expectedId) => {
    expect(resolveRoute(path).id).toBe(expectedId);
  });

  it('falls back to the start route for an unknown path', () => {
    expect(resolveRoute('/unknown')).toMatchObject({ id: 'start', path: '/' });
  });
});
