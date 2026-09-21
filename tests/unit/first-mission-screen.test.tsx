import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FirstMissionScreen } from '../../sources/app/first-mission-screen';

function renderMission(
  overrides: {
    locale?: 'en' | 'hu';
    onCelebrate?: () => void;
    onCommitReward?: () => Promise<void>;
    onExit?: () => void;
  } = {},
) {
  const props = {
    locale: overrides.locale ?? ('en' as const),
    narrationService: { speak: vi.fn(), stop: vi.fn() },
    onCelebrate: overrides.onCelebrate ?? vi.fn(),
    onCommitReward: overrides.onCommitReward ?? vi.fn(() => Promise.resolve()),
    onExit: overrides.onExit ?? vi.fn(),
  };
  return { ...render(<FirstMissionScreen {...props} />), props };
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
  it('narrates the first required action on entry and stops narration on exit', () => {
    const { props, unmount } = renderMission({ locale: 'hu' });

    expect(props.narrationService.speak).toHaveBeenCalledWith({
      cue: 'voice.mission.garden-kitten-tree.step.place-ladder',
      locale: 'hu',
      text: 'Húzd a létrát a fához!',
    });
    unmount();
    expect(props.narrationService.stop).toHaveBeenCalledOnce();
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

    expect(screen.queryByRole('button', { name: 'Help Mimi come down' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move the ladder to the tree' }), {
      detail: 0,
    });
    expect(props.narrationService.speak).toHaveBeenCalledWith({
      cue: 'voice.mission.garden-kitten-tree.step.help-mimi-down',
      locale: 'en',
      text: 'Tap Mimi!',
    });
    const mimi = screen.getByRole('button', { name: 'Help Mimi come down' });
    fireEvent.click(mimi);
    fireEvent.click(mimi);

    expect(onCommitReward).toHaveBeenCalledOnce();
    expect(onCelebrate).not.toHaveBeenCalled();
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

    fireEvent.click(screen.getByRole('button', { name: 'Move the ladder to the tree' }), {
      detail: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Help Mimi come down' }));
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
          locale="en"
          narrationService={{ speak: vi.fn(), stop: vi.fn() }}
          onCelebrate={onCelebrate}
          onCommitReward={() => Promise.resolve()}
          onExit={vi.fn()}
        />
      </StrictMode>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move the ladder to the tree' }), {
      detail: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Help Mimi come down' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Move the ladder to the tree' }), {
      detail: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Help Mimi come down' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('alert')).toHaveTextContent('The rescue could not be saved yet');
    expect(screen.getByRole('button', { name: 'Help Mimi come down' })).toBeEnabled();
    expect(onCelebrate).not.toHaveBeenCalled();
  });
});
