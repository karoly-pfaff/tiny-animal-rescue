import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShelterScreen } from '../../sources/app/shelter-screen';
import { testFirstRescueContent } from '../support/first-rescue-content';

afterEach(() => {
  vi.useRealTimers();
});

describe('ShelterScreen', () => {
  it('shows Mimi only after her resident unlock', () => {
    const { rerender } = render(
      <ShelterScreen
        content={testFirstRescueContent}
        locale="en"
        onMap={vi.fn()}
        progress={{ completedMissionIds: [], unlockedResidentIds: [], worldFlags: [] }}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Give Mimi a gentle pat' }),
    ).not.toBeInTheDocument();

    rerender(
      <ShelterScreen
        content={testFirstRescueContent}
        locale="en"
        onMap={vi.fn()}
        progress={{
          completedMissionIds: ['garden-kitten-tree'],
          unlockedResidentIds: ['mimi-kitten'],
          worldFlags: ['mimi-rescued'],
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Give Mimi a gentle pat' })).toBeVisible();
  });

  it('gives a repeatable, gentle tap reaction', async () => {
    vi.useFakeTimers();
    render(
      <ShelterScreen
        content={testFirstRescueContent}
        locale="hu"
        onMap={vi.fn()}
        progress={{
          completedMissionIds: ['garden-kitten-tree'],
          unlockedResidentIds: ['mimi-kitten'],
          worldFlags: ['mimi-rescued'],
        }}
      />,
    );
    const mimi = screen.getByRole('button', { name: 'Simogasd meg Mimit' });

    fireEvent.click(mimi);
    expect(mimi).toHaveClass('is-happy');
    expect(screen.getByText('Mimi boldogan dorombol.')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTime(900));
    expect(mimi).not.toHaveClass('is-happy');
  });
});
