import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShelterScreen } from '../../sources/app/shelter-screen';
import { testFirstRescueContent } from '../support/first-rescue-content';

afterEach(() => {
  vi.useRealTimers();
});

describe('ShelterScreen', () => {
  it('shows Mimi only after her resident unlock', () => {
    const narrationService = { speak: vi.fn(), stop: vi.fn() };
    const { rerender } = render(
      <ShelterScreen
        content={testFirstRescueContent}
        locale="en"
        narrationService={narrationService}
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
        narrationService={narrationService}
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
        narrationService={{ speak: vi.fn(), stop: vi.fn() }}
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

  it('navigates the three content-defined areas with arrows and announces the active area', () => {
    const narrationService = { speak: vi.fn(), stop: vi.fn() };
    render(
      <ShelterScreen
        content={testFirstRescueContent}
        locale="en"
        narrationService={narrationService}
        onMap={vi.fn()}
        progress={{ completedMissionIds: [], unlockedResidentIds: [], worldFlags: [] }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Indoor Room' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next shelter area' }));
    expect(screen.getByRole('heading', { name: 'Garden' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /gentle pat/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hear area name' }));
    expect(narrationService.speak).toHaveBeenCalledWith({
      cue: 'voice.shelter.shelter-garden.name',
      locale: 'en',
      text: 'Garden',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Previous shelter area' }));
    expect(screen.getByRole('heading', { name: 'Indoor Room' })).toBeVisible();
  });

  it('wraps area navigation and accepts horizontal swipe gestures', () => {
    render(
      <ShelterScreen
        content={testFirstRescueContent}
        locale="en"
        narrationService={{ speak: vi.fn(), stop: vi.fn() }}
        onMap={vi.fn()}
        progress={{ completedMissionIds: [], unlockedResidentIds: [], worldFlags: [] }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous shelter area' }));
    expect(screen.getByRole('heading', { name: 'Pondside' })).toBeVisible();

    const area = screen.getByRole('region', { name: 'Pondside' });
    fireEvent.pointerDown(area, {
      button: 0,
      clientX: 200,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(area, {
      clientX: 120,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    expect(screen.getByRole('heading', { name: 'Indoor Room' })).toBeVisible();
  });

  it('does not treat a gesture on an interactive child or a cancelled gesture as a swipe', () => {
    render(
      <ShelterScreen
        content={testFirstRescueContent}
        locale="en"
        narrationService={{ speak: vi.fn(), stop: vi.fn() }}
        onMap={vi.fn()}
        progress={{ completedMissionIds: [], unlockedResidentIds: [], worldFlags: [] }}
      />,
    );

    const area = screen.getByRole('region', { name: 'Indoor Room' });
    const repeat = screen.getByRole('button', { name: 'Hear area name' });
    fireEvent.pointerDown(repeat, {
      button: 0,
      clientX: 200,
      isPrimary: true,
      pointerId: 2,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(repeat, {
      clientX: 100,
      isPrimary: true,
      pointerId: 2,
      pointerType: 'touch',
    });
    fireEvent.pointerDown(area, {
      button: 0,
      clientX: 200,
      isPrimary: true,
      pointerId: 3,
      pointerType: 'touch',
    });
    fireEvent.pointerCancel(area, { pointerId: 3, pointerType: 'touch' });
    fireEvent.pointerUp(area, {
      clientX: 100,
      isPrimary: true,
      pointerId: 3,
      pointerType: 'touch',
    });

    expect(screen.getByRole('heading', { name: 'Indoor Room' })).toBeVisible();
  });
});
