import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CelebrationScreen } from '../../sources/app/celebration-screen';
import { FirstMissionScreen } from '../../sources/app/first-mission-screen';
import type { FirstRescueContent } from '../../sources/content/first-rescue-content';
import { testFirstRescueContent } from '../support/first-rescue-content';

afterEach(() => {
  vi.useRealTimers();
});

describe('content-driven first Rescue runtime', () => {
  it('uses declared step order, prompts, identifiers, cues, hint delay, and snap tolerance', () => {
    vi.useFakeTimers();
    const content = customizedContent();
    const play = vi.fn();
    const speak = vi.fn();
    render(
      <FirstMissionScreen
        content={content}
        effectService={{ play }}
        locale="en"
        narrationService={{ speak, stop: vi.fn() }}
        onCelebrate={vi.fn()}
        onCommitReward={() => Promise.resolve()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('A custom introduction.')).toBeInTheDocument();
    expect(speak).toHaveBeenCalledWith({
      cue: 'voice.fixture.drag.prompt',
      locale: 'en',
      text: 'Move the fixture object!',
    });
    const ladder = screen.getByRole('button', { name: 'Move the fixture object!' });
    expect(ladder).toHaveAttribute('data-source-id', 'fixture-source');
    const interaction = ladder.closest('.drag-interaction');
    expect(interaction).toHaveAttribute('data-success-cue', 'effects.progress.step-complete');
    expect(interaction?.querySelector('.ladder-target')).toHaveAttribute(
      'data-target-id',
      'fixture-target',
    );
    const target = interaction?.querySelector<HTMLElement>('.ladder-target');
    expect(Number.parseFloat(target?.style.height ?? '')).toBeCloseTo(19.09, 2);
    expect(Number.parseFloat(target?.style.width ?? '')).toBeCloseTo(10.91, 2);

    void act(() => vi.advanceTimersByTime(24));
    expect(interaction).toHaveAttribute('data-guidance', 'false');
    void act(() => vi.advanceTimersByTime(1));
    expect(interaction).toHaveAttribute('data-guidance', 'true');

    fireEvent.click(ladder, { detail: 0 });
    expect(play).toHaveBeenCalledWith('effects.progress.step-complete');
    const subject = screen.getByRole('button', { name: 'Tap the fixture subject!' });
    expect(subject).toHaveAttribute('data-step-id', 'fixture-tap');
    expect(subject).toHaveAttribute('data-success-cue', 'effects.interaction.obstacle-cleared');
    expect(subject).toHaveAttribute('data-target-ids', 'fixture-subject');
    expect(subject).toHaveAttribute('data-guidance', 'false');
    expect(speak).toHaveBeenLastCalledWith({
      cue: 'voice.fixture.tap.prompt',
      locale: 'en',
      text: 'Tap the fixture subject!',
    });
    void act(() => vi.advanceTimersByTime(39));
    expect(subject).toHaveAttribute('data-guidance', 'false');
    void act(() => vi.advanceTimersByTime(1));
    expect(subject).toHaveAttribute('data-guidance', 'true');

    fireEvent.click(subject);
    expect(play).toHaveBeenLastCalledWith('effects.interaction.obstacle-cleared');
  });

  it('uses the declared localized success key for celebration narration and copy', () => {
    const content = customizedContent();
    const speak = vi.fn();
    render(
      <CelebrationScreen
        content={content}
        locale="en"
        narrationService={{ speak, stop: vi.fn() }}
        onMap={vi.fn()}
        onShelter={vi.fn()}
      />,
    );

    expect(screen.getByText('The fixture rescue is complete!')).toBeInTheDocument();
    expect(speak).toHaveBeenCalledWith({
      cue: 'voice.fixture.success',
      locale: 'en',
      text: 'The fixture rescue is complete!',
    });
  });
});

function customizedContent(): FirstRescueContent {
  const dragStep = {
    ...testFirstRescueContent.dragStep,
    id: 'fixture-drag',
    hint: { type: 'pulse-after-delay' as const, delayMs: 25 },
    promptKey: 'fixture.drag.prompt',
    snapTolerance: 0.25,
    sourceId: 'fixture-source',
    successCue: 'effects.progress.step-complete' as const,
    targetId: 'fixture-target',
  };
  const tapStep = {
    ...testFirstRescueContent.tapStep,
    hint: { type: 'pulse-after-delay' as const, delayMs: 40 },
    id: 'fixture-tap',
    promptKey: 'fixture.tap.prompt',
    successCue: 'effects.interaction.obstacle-cleared' as const,
    targetIds: ['fixture-subject'],
  };
  const mission = {
    ...testFirstRescueContent.mission,
    localization: {
      ...testFirstRescueContent.mission.localization,
      introKey: 'fixture.intro',
      successKey: 'fixture.success',
    },
    steps: [dragStep, tapStep] as const,
  };
  const basePack = testFirstRescueContent.registry.packs['base'];
  if (basePack === undefined) {
    throw new Error('The base fixture pack is required.');
  }
  const english = {
    ...basePack.records.localizations['en'],
    'fixture.drag.prompt': 'Move the fixture object!',
    'fixture.intro': 'A custom introduction.',
    'fixture.success': 'The fixture rescue is complete!',
    'fixture.tap.prompt': 'Tap the fixture subject!',
  };
  const registry = {
    ...testFirstRescueContent.registry,
    packs: {
      base: {
        ...basePack,
        records: {
          ...basePack.records,
          localizations: { ...basePack.records.localizations, en: english },
        },
      },
    },
  };
  return { ...testFirstRescueContent, dragStep, mission, registry, tapStep };
}
