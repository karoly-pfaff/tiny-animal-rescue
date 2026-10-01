import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBrowserNarrationService } from '../../sources/audio/narration-service';
import { ShelterScreen } from '../../sources/app/shelter-screen';
import { ShelterResident } from '../../sources/app/shelter-resident';
import { testFirstRescueContent } from '../support/first-rescue-content';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'speechSynthesis');
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
    const narrationService = { speak: vi.fn(), stop: vi.fn() };
    render(
      <ShelterScreen
        content={testFirstRescueContent}
        locale="hu"
        narrationService={narrationService}
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
    expect(mimi).toHaveAttribute('data-reaction', 'greet');
    expect(narrationService.speak).toHaveBeenCalledWith({
      cue: 'voice.resident.mimi-kitten.name',
      locale: 'hu',
      text: 'Mimi',
    });
    expect(screen.getByText('Mimi boldogan dorombol.')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTime(900));
    expect(mimi).not.toHaveAttribute('data-reaction');
  });

  it('cycles finite pet, feed, and play moments without persistent need state', async () => {
    vi.useFakeTimers();
    const narrationService = { speak: vi.fn(), stop: vi.fn() };
    const { unmount } = render(
      <ShelterResident
        happyAssetUrl="/happy.png"
        happyText="Mimi is happy."
        id="mimi-kitten"
        idleAssetUrl="/idle.png"
        locale="en"
        name="Mimi"
        narrationService={narrationService}
        reactions={['pet', 'feed', 'play']}
        shelterSlot={4}
        tapLabel="Spend a happy moment with Mimi"
      />,
    );
    const mimi = screen.getByRole('button', { name: 'Spend a happy moment with Mimi' });
    expect(mimi).toHaveStyle({ gridColumn: '2', gridRow: '2' });

    for (const reaction of ['pet', 'feed', 'play']) {
      fireEvent.click(mimi);
      expect(mimi).toHaveAttribute('data-reaction', reaction);
      expect(mimi.querySelector('img')).toHaveAttribute('src', '/happy.png');
      await act(() => vi.advanceTimersByTime(900));
      expect(mimi).not.toHaveAttribute('data-reaction');
      expect(mimi.querySelector('img')).toHaveAttribute('src', '/idle.png');
    }

    expect(narrationService.speak).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    unmount();
    expect(screen.queryByText('Mimi is happy.')).not.toBeInTheDocument();
  });

  it('speaks a dependency resident name through the real production resolver fallback', () => {
    vi.stubEnv('VITE_MATERIALIZED_ASSETS', 'true');
    const speak = vi.fn();
    class FakeUtterance {
      lang = '';
      constructor(readonly text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: vi.fn(), speak },
    });
    render(
      <ShelterResident
        happyAssetUrl={null}
        happyText="Winter is happy."
        id="winter-kitten"
        idleAssetUrl={null}
        locale="en"
        name="Winter"
        narrationService={createBrowserNarrationService()}
        reactions={['greet']}
        shelterSlot={1}
        tapLabel="Greet Winter"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Greet Winter' }));

    expect(speak).toHaveBeenCalledOnce();
    expect(speak.mock.calls[0]?.[0]).toMatchObject({ lang: 'en-US', text: 'Winter' });
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
