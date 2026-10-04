import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ParentSettingsScreen } from '../../sources/app/parent-settings-screen';

afterEach(() => {
  vi.useRealTimers();
});

describe('ParentSettingsScreen', () => {
  it('requires a sustained adult hold and a second progress-reset confirmation', async () => {
    vi.useFakeTimers();
    const onResetProgress = vi.fn(() => Promise.resolve());
    render(
      <ParentSettingsScreen
        locale="en"
        onBack={vi.fn()}
        onResetAll={vi.fn(() => Promise.resolve())}
        onResetProgress={onResetProgress}
      />,
    );
    const gate = screen.getByRole('button', { name: 'Press and hold' });

    fireEvent.pointerDown(gate);
    await act(() => vi.advanceTimersByTimeAsync(900));
    fireEvent.pointerUp(gate);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.queryByRole('button', { name: /Start the game again/u })).toBeNull();

    fireEvent.pointerDown(gate);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    fireEvent.pointerUp(gate);
    const progressChoice = screen.getByRole('button', { name: /Start the game again/u });
    expect(progressChoice).toHaveFocus();
    fireEvent.click(progressChoice);

    expect(onResetProgress).not.toHaveBeenCalled();
    let dialog = screen.getByRole('dialog', { name: 'Start the game again?' });
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    const confirm = within(dialog).getByRole('button', { name: 'Reset progress' });
    await act(() => Promise.resolve());
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await act(() => Promise.resolve());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(progressChoice).toHaveFocus();

    fireEvent.click(progressChoice);
    dialog = screen.getByRole('dialog', { name: 'Start the game again?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset progress' }));
    await act(() => Promise.resolve());

    expect(onResetProgress).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Settings stayed unchanged');
  });

  it('supports keyboard holds and cancels interrupted keyboard and touch holds', async () => {
    vi.useFakeTimers();
    render(
      <ParentSettingsScreen
        locale="en"
        onBack={vi.fn()}
        onResetAll={vi.fn(() => Promise.resolve())}
        onResetProgress={vi.fn(() => Promise.resolve())}
      />,
    );
    const gate = screen.getByRole('button', { name: 'Press and hold' });

    fireEvent.keyDown(gate, { key: ' ' });
    await act(() => vi.advanceTimersByTimeAsync(900));
    fireEvent.keyUp(gate, { key: ' ' });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.queryByRole('button', { name: /Start the game again/u })).toBeNull();

    fireEvent.pointerDown(gate, { pointerId: 4, pointerType: 'touch' });
    await act(() => vi.advanceTimersByTimeAsync(900));
    fireEvent.pointerCancel(gate, { pointerId: 4, pointerType: 'touch' });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.queryByRole('button', { name: /Start the game again/u })).toBeNull();

    fireEvent.keyDown(gate, { key: 'Enter' });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.getByRole('button', { name: /Start the game again/u })).toHaveFocus();
  });

  it('keeps the confirmation visible and reports a failed full reset', async () => {
    vi.useFakeTimers();
    render(
      <ParentSettingsScreen
        locale="en"
        onBack={vi.fn()}
        onResetAll={() => Promise.reject(new Error('storage failed'))}
        onResetProgress={vi.fn(() => Promise.resolve())}
      />,
    );
    const gate = screen.getByRole('button', { name: 'Press and hold' });
    fireEvent.pointerDown(gate);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    fireEvent.pointerUp(gate);
    fireEvent.click(screen.getByRole('button', { name: /^Reset everything/u }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
    await act(() => Promise.resolve());

    const dialog = screen.getByRole('dialog', { name: 'Reset everything?' });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('did not finish');
    expect(dialog).toBeVisible();
  });
});
