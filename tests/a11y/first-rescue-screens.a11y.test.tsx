import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import { FirstMissionScreen } from '../../sources/app/first-mission-screen';
import { MapScreen } from '../../sources/app/map-screen';

describe('first rescue screen accessibility', () => {
  it.each([
    <MapScreen key="map" locale="hu" onOpenGardenMission={vi.fn()} />,
    <FirstMissionScreen key="mission" locale="en" onExit={vi.fn()} />,
  ])('has no automatically detectable violation', async (screen) => {
    const { container } = render(screen);
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
