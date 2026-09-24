import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import { FirstMissionScreen } from '../../sources/app/first-mission-screen';
import { MapScreen } from '../../sources/app/map-screen';
import { SaveFailureScreen } from '../../sources/app/save-failure-screen';
import { CelebrationScreen } from '../../sources/app/celebration-screen';
import { ShelterScreen } from '../../sources/app/shelter-screen';
import { testFirstRescueContent } from '../support/first-rescue-content';

describe('first rescue screen accessibility', () => {
  it.each([
    <MapScreen
      key="map"
      content={testFirstRescueContent}
      locale="hu"
      onOpenGardenMission={vi.fn()}
      onOpenShelter={vi.fn()}
    />,
    <FirstMissionScreen
      key="mission"
      content={testFirstRescueContent}
      effectService={{ play: vi.fn() }}
      locale="en"
      onCelebrate={vi.fn()}
      onCommitReward={vi.fn(() => Promise.resolve())}
      onExit={vi.fn()}
      narrationService={{ speak: vi.fn(), stop: vi.fn() }}
    />,
    <CelebrationScreen
      key="celebration"
      content={testFirstRescueContent}
      locale="hu"
      narrationService={{ speak: vi.fn(), stop: vi.fn() }}
      onMap={vi.fn()}
      onShelter={vi.fn()}
    />,
    <ShelterScreen
      key="shelter"
      content={testFirstRescueContent}
      locale="en"
      onMap={vi.fn()}
      progress={{
        completedMissionIds: ['garden-kitten-tree'],
        unlockedResidentIds: ['mimi-kitten'],
        worldFlags: ['mimi-rescued'],
      }}
    />,
    <SaveFailureScreen key="save-failure" locale="hu" onRetry={vi.fn()} />,
  ])('has no automatically detectable violation', async (screen) => {
    const { container } = render(screen);
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
