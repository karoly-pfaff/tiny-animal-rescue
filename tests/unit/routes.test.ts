import { describe, expect, it } from 'vitest';

import { missionPath, resolveRoute } from '../../sources/app/routes';

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

  it('resolves a content-addressed mission route', () => {
    const path = missionPath('garden-kitten-tree');

    expect(path).toBe('/mission/garden-kitten-tree');
    expect(resolveRoute(path)).toEqual({
      id: 'mission',
      missionId: 'garden-kitten-tree',
      path,
      titleKey: 'screen.mission.title',
    });
    expect(resolveRoute('/mission/not_valid')).toMatchObject({ id: 'start', path: '/' });
  });
});
