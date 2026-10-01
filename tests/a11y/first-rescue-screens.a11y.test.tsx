import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import { FirstMissionScreen } from '../../sources/app/first-mission-screen';
import { MapScreen } from '../../sources/app/map-screen';
import { SaveFailureScreen } from '../../sources/app/save-failure-screen';
import { SaveRecoveryScreen } from '../../sources/app/save-recovery-screen';
import { CelebrationScreen } from '../../sources/app/celebration-screen';
import { ContentMissionScreen } from '../../sources/app/content-mission-screen';
import { ShelterScreen } from '../../sources/app/shelter-screen';
import { selectMissionCalls } from '../../sources/content/mission-call-content';
import { selectProgression } from '../../sources/content/progression-selectors';
import { testFirstRescueContent } from '../support/first-rescue-content';
import {
  testRegistryWithWorldMission,
  testWorldMission,
} from '../support/expanded-mission-content';

describe('first rescue screen accessibility', () => {
  it.each([
    <MapScreen
      effectService={{ play: vi.fn() }}
      featuredMissionId={null}
      key="map"
      locale="hu"
      missionCalls={[]}
      onOpenLocation={vi.fn()}
      onOpenMission={vi.fn()}
      onOpenShelter={vi.fn()}
      registry={testFirstRescueContent.registry}
      visibleLocationIds={['garden', 'forest', 'farm', 'pond']}
    />,
    <FirstMissionScreen
      key="mission"
      content={testFirstRescueContent}
      effectService={{ play: vi.fn() }}
      initialCompletedStepIds={[]}
      locale="en"
      onCelebrate={vi.fn()}
      onCommitReward={vi.fn(() => Promise.resolve())}
      onCommitStep={vi.fn(() => Promise.resolve())}
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
    <SaveRecoveryScreen
      key="save-recovery-corrupt"
      locale="hu"
      onRecoverCorrupt={vi.fn()}
      onRetry={vi.fn()}
      status="corrupt"
    />,
    <SaveRecoveryScreen
      key="save-recovery-future"
      locale="en"
      onRecoverCorrupt={vi.fn()}
      onRetry={vi.fn()}
      status="unsupported-version"
    />,
    <ContentMissionScreen
      key="content-mission"
      locale="en"
      mission={testWorldMission}
      narrationService={{ speak: vi.fn(), stop: vi.fn() }}
      onExit={vi.fn()}
      ownerPackId="base"
      registry={testRegistryWithWorldMission()}
    />,
  ])('has no automatically detectable violation', async (screen) => {
    const { container } = render(screen);
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('keeps the open mission-call presentation accessible', async () => {
    const state = { completedMissionIds: [], unlockedResidentIds: [] };
    const selection = selectMissionCalls(
      testFirstRescueContent.registry,
      selectProgression(testFirstRescueContent.registry, state),
      { locale: 'en', state },
    );
    const { container } = render(
      <MapScreen
        effectService={{ play: vi.fn() }}
        featuredMissionId={selection.featuredMissionId}
        locale="en"
        missionCalls={selection.calls}
        onOpenLocation={vi.fn()}
        onOpenMission={vi.fn()}
        onOpenShelter={vi.fn()}
        registry={testFirstRescueContent.registry}
        visibleLocationIds={['garden']}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Garden rescue: Mimi' }));
    expect(screen.getByRole('region', { name: 'Garden' })).toBeVisible();
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
