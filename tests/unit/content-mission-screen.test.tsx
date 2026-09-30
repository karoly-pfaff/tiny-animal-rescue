import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ContentMissionScreen } from '../../sources/app/content-mission-screen';
import {
  testRegistryWithWorldMission,
  testWorldMission,
} from '../support/expanded-mission-content';

describe('ContentMissionScreen', () => {
  it('loads localized mission identity, narrates its introduction, and keeps controls available', () => {
    const narrationService = { speak: vi.fn(), stop: vi.fn() };
    const onExit = vi.fn();
    const { unmount } = render(
      <ContentMissionScreen
        locale="hu"
        mission={testWorldMission}
        narrationService={narrationService}
        onExit={onExit}
        ownerPackId="base"
        registry={testRegistryWithWorldMission()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Vidd oda a létrát' })).toBeVisible();
    expect(screen.getByRole('main')).toHaveAttribute('data-mission-id', 'garden-bring-ladder');
    expect(narrationService.speak).toHaveBeenCalledWith({
      cue: 'voice.mission.garden-bring-ladder.intro',
      locale: 'hu',
      text: 'A létrára szükség van a kertben.',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Hallgasd újra' }));
    expect(narrationService.stop).toHaveBeenCalledOnce();
    expect(narrationService.speak).toHaveBeenCalledTimes(2);
    expect(narrationService.speak).toHaveBeenLastCalledWith({
      cue: 'voice.mission.garden-bring-ladder.intro',
      locale: 'hu',
      text: 'A létrára szükség van a kertben.',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tartsd nyomva a térképhez' }), {
      detail: 0,
    });
    expect(onExit).toHaveBeenCalledOnce();

    unmount();
    expect(narrationService.stop).toHaveBeenCalledTimes(2);
  });
});
