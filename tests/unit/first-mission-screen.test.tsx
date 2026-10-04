import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FirstMissionScreen } from '../../sources/app/first-mission-screen';
import { testFirstRescueContent } from '../support/first-rescue-content';

function renderMission(
  overrides: {
    initialCompletedStepIds?: readonly string[];
    locale?: 'en' | 'hu';
    onCelebrate?: () => void;
    onCommitReward?: () => Promise<void>;
    onCommitStep?: (stepId: string) => Promise<void>;
    onExit?: () => void;
  } = {},
) {
  const props = {
    content: testFirstRescueContent,
    effectService: { play: vi.fn() },
    initialCompletedStepIds: overrides.initialCompletedStepIds ?? [],
    locale: overrides.locale ?? ('en' as const),
    narrationService: { speak: vi.fn(), stop: vi.fn() },
    onCelebrate: overrides.onCelebrate ?? vi.fn(),
    onCommitReward: overrides.onCommitReward ?? vi.fn(() => Promise.resolve()),
    onCommitStep: overrides.onCommitStep ?? vi.fn(() => Promise.resolve()),
    onExit: overrides.onExit ?? vi.fn(),
  };
  return { ...render(<FirstMissionScreen {...props} />), props };
}

async function completeLadder(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Move the ladder to the tree!' }), {
    detail: 0,
  });
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('FirstMissionScreen protected exit', () => {
  it('ignores a tap and exits only after the deliberate hold duration', () => {
    vi.useFakeTimers();
    const onExit = vi.fn();
    renderMission({ locale: 'hu', onExit });
    const back = screen.getByRole('button', { name: 'Tartsd nyomva a térképhez' });

    fireEvent.pointerDown(back, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    void act(() => vi.advanceTimersByTime(649));
    fireEvent.pointerUp(back, { pointerId: 1 });
    void act(() => vi.advanceTimersByTime(1));
    expect(onExit).not.toHaveBeenCalled();

    fireEvent.pointerDown(back, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    void act(() => vi.advanceTimersByTime(650));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('ignores secondary mouse input and keeps the active pointer authoritative', () => {
    vi.useFakeTimers();
    const onExit = vi.fn();
    renderMission({ onExit });
    const back = screen.getByRole('button', { name: 'Hold to return to the map' });

    fireEvent.pointerDown(back, {
      button: 2,
      isPrimary: true,
      pointerId: 8,
      pointerType: 'mouse',
    });
    void act(() => vi.advanceTimersByTime(650));
    expect(onExit).not.toHaveBeenCalled();

    fireEvent.pointerDown(back, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerDown(back, {
      button: 0,
      isPrimary: false,
      pointerId: 2,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(back, { pointerId: 2 });
    void act(() => vi.advanceTimersByTime(650));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('supports keyboard and assistive click activation without weakening pointer safety', () => {
    const onExit = vi.fn();
    renderMission({ onExit });
    const back = screen.getByRole('button', { name: 'Hold to return to the map' });

    fireEvent.click(back, { detail: 1 });
    expect(onExit).not.toHaveBeenCalled();
    fireEvent.click(back, { detail: 0 });
    expect(onExit).toHaveBeenCalledOnce();
  });
});

describe('FirstMissionScreen rescue completion', () => {
  it('resumes at the first incomplete step without replaying the checkpointed ladder', () => {
    renderMission({ initialCompletedStepIds: ['place-ladder'] });

    expect(screen.queryByRole('button', { name: 'Move the ladder to the tree!' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Tap Mimi!' })).toBeEnabled();
    expect(document.querySelector('.drag-interaction')).toHaveAttribute('data-phase', 'placed');
  });

  it('remounts the ladder and advances when checkpoint persistence succeeds on retry', async () => {
    const onCommitStep = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValueOnce();
    renderMission({ onCommitStep });

    fireEvent.click(screen.getByRole('button', { name: 'Move the ladder to the tree!' }), {
      detail: 0,
    });
    await act(async () => {
      await Promise.resolve();
    });

    const retry = screen.getByRole('button', { name: 'Move the ladder to the tree!' });
    expect(onCommitStep).toHaveBeenCalledOnce();
    expect(retry).toBeEnabled();
    expect(retry).toHaveAttribute('data-phase', 'idle');
    expect(screen.getByRole('alert')).toHaveTextContent('The rescue could not be saved yet');
    expect(screen.queryByRole('button', { name: 'Tap Mimi!' })).toBeNull();

    fireEvent.click(retry, { detail: 0 });
    await act(async () => {
      await Promise.resolve();
    });

    expect(onCommitStep).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Tap Mimi!' })).toBeEnabled();
  });

  it('applies a checkpoint that resolves while hidden after the mission resumes', async () => {
    let hidden = false;
    let finishCommit: () => void = () => undefined;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    const onCommitStep = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCommit = resolve;
        }),
    );
    renderMission({ onCommitStep });

    fireEvent.click(screen.getByRole('button', { name: 'Move the ladder to the tree!' }), {
      detail: 0,
    });
    hidden = true;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    finishCommit();
    await act(async () => Promise.resolve());

    expect(screen.queryByRole('button', { name: 'Tap Mimi!' })).toBeNull();
    hidden = false;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: 'Tap Mimi!' })).toBeEnabled();
  });

  it('narrates the first required action without overlap and stops narration on exit', () => {
    const { props, unmount } = renderMission({ locale: 'hu' });

    expect(props.narrationService.speak).toHaveBeenCalledWith({
      cue: 'voice.mission.garden-kitten-tree.step.place-ladder',
      locale: 'hu',
      text: 'Húzd a létrát a fához!',
    });
    expect(props.narrationService.stop).toHaveBeenCalledOnce();
    unmount();
    expect(props.narrationService.stop).toHaveBeenCalledTimes(2);
  });

  it('replays the active prompt by replacing prior narration and restarting guidance', () => {
    const { props } = renderMission();
    const repeat = screen.getByRole('button', { name: 'Hear again' });

    fireEvent.click(repeat);

    expect(props.narrationService.speak).toHaveBeenCalledTimes(2);
    expect(props.narrationService.stop).toHaveBeenCalledTimes(2);
    expect(props.narrationService.stop.mock.invocationCallOrder[1]).toBeLessThan(
      props.narrationService.speak.mock.invocationCallOrder[1] ?? Number.POSITIVE_INFINITY,
    );
  });

  it('pauses through the browser visibility boundary and resumes narration and remaining delay', () => {
    vi.useFakeTimers();
    let hidden = false;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    const { props } = renderMission();
    const interaction = screen
      .getByRole('button', { name: 'Move the ladder to the tree!' })
      .closest('.drag-interaction');

    void act(() => vi.advanceTimersByTime(2_000));
    hidden = true;
    void act(() => document.dispatchEvent(new Event('visibilitychange')));
    void act(() => vi.advanceTimersByTime(20_000));
    expect(interaction).toHaveAttribute('data-guidance-stage', 'idle');
    expect(props.narrationService.stop).toHaveBeenCalledTimes(2);

    hidden = false;
    void act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(props.narrationService.speak).toHaveBeenCalledTimes(2);
    expect(props.narrationService.stop).toHaveBeenCalledTimes(3);
    void act(() => vi.advanceTimersByTime(2_999));
    expect(interaction).toHaveAttribute('data-guidance-stage', 'idle');
    void act(() => vi.advanceTimersByTime(1));
    expect(interaction).toHaveAttribute('data-guidance-stage', 'demonstration');
  });

  it('makes Mimi actionable only after the ladder and completes once after reward commit', async () => {
    vi.useFakeTimers();
    let finishCommit: () => void = () => undefined;
    const onCommitReward = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCommit = resolve;
        }),
    );
    const onCelebrate = vi.fn();
    const { props } = renderMission({ onCelebrate, onCommitReward });

    expect(screen.queryByRole('button', { name: 'Tap Mimi!' })).not.toBeInTheDocument();
    await completeLadder();
    expect(
      screen.queryByRole('button', { name: 'Move the ladder to the tree!' }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.drag-interaction')).toHaveAttribute('data-phase', 'placed');
    expect(document.querySelector('.drag-interaction')).toHaveAttribute(
      'data-interactive',
      'false',
    );
    expect(props.narrationService.speak).toHaveBeenCalledWith({
      cue: 'voice.mission.garden-kitten-tree.step.help-mimi-down',
      locale: 'en',
      text: 'Tap Mimi!',
    });
    const mimi = screen.getByRole('button', { name: 'Tap Mimi!' });
    fireEvent.click(mimi);
    fireEvent.click(mimi);

    expect(onCommitReward).toHaveBeenCalledOnce();
    expect(onCelebrate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Tap Mimi!' })).not.toBeInTheDocument();
    expect(document.querySelector('.mission-kitten-rescue')).toHaveAttribute(
      'data-phase',
      'saving',
    );
    finishCommit();
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(649);
      await Promise.resolve();
    });
    expect(onCelebrate).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(onCelebrate).toHaveBeenCalledOnce();
  });

  it('finishes a reward that resolves while hidden after the mission resumes', async () => {
    vi.useFakeTimers();
    let hidden = false;
    let finishCommit: () => void = () => undefined;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    const onCommitReward = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCommit = resolve;
        }),
    );
    const onCelebrate = vi.fn();
    renderMission({ onCelebrate, onCommitReward });

    await completeLadder();
    fireEvent.click(screen.getByRole('button', { name: 'Tap Mimi!' }));
    hidden = true;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    finishCommit();
    await act(async () => {
      vi.advanceTimersByTime(650);
      await Promise.resolve();
    });

    expect(onCelebrate).not.toHaveBeenCalled();
    expect(document.querySelector('.mission-kitten-rescue')).toHaveAttribute(
      'data-phase',
      'saving',
    );
    hidden = false;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(onCelebrate).toHaveBeenCalledOnce();
  });

  it('does not navigate or update state after unmount during reward persistence', async () => {
    vi.useFakeTimers();
    let finishCommit: () => void = () => undefined;
    const onCommitReward = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCommit = resolve;
        }),
    );
    const onCelebrate = vi.fn();
    const { unmount } = renderMission({ onCelebrate, onCommitReward });

    await completeLadder();
    fireEvent.click(screen.getByRole('button', { name: 'Tap Mimi!' }));
    unmount();
    finishCommit();
    await act(async () => {
      vi.advanceTimersByTime(650);
      await Promise.resolve();
    });

    expect(onCelebrate).not.toHaveBeenCalled();
  });

  it('completes under the production StrictMode lifecycle', async () => {
    vi.useFakeTimers();
    const onCelebrate = vi.fn();
    render(
      <StrictMode>
        <FirstMissionScreen
          content={testFirstRescueContent}
          effectService={{ play: vi.fn() }}
          initialCompletedStepIds={[]}
          locale="en"
          narrationService={{ speak: vi.fn(), stop: vi.fn() }}
          onCelebrate={onCelebrate}
          onCommitReward={() => Promise.resolve()}
          onCommitStep={() => Promise.resolve()}
          onExit={vi.fn()}
        />
      </StrictMode>,
    );

    await completeLadder();
    fireEvent.click(screen.getByRole('button', { name: 'Tap Mimi!' }));
    await act(async () => {
      vi.advanceTimersByTime(650);
      await Promise.resolve();
    });

    expect(onCelebrate).toHaveBeenCalledOnce();
  });

  it('keeps Mimi retryable and does not celebrate when reward persistence fails', async () => {
    vi.useFakeTimers();
    const onCommitReward = vi.fn().mockRejectedValue(new Error('write failed'));
    const onCelebrate = vi.fn();
    renderMission({ onCelebrate, onCommitReward });

    await completeLadder();
    fireEvent.click(screen.getByRole('button', { name: 'Tap Mimi!' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('alert')).toHaveTextContent('The rescue could not be saved yet');
    expect(screen.getByRole('button', { name: 'Tap Mimi!' })).toBeEnabled();
    expect(onCelebrate).not.toHaveBeenCalled();
  });
});
