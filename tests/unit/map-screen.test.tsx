import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MapScreen } from '../../sources/app/map-screen';
import type { EffectCue } from '../../sources/audio/effect-service';
import { testContentRegistry } from '../support/first-rescue-content';

describe('MapScreen', () => {
  it('renders the content-declared landmark identities in deterministic pack order', () => {
    renderMap('en');

    expect(screen.getByRole('button', { name: 'Shelter' })).toHaveAttribute(
      'data-silhouette',
      'shelter',
    );
    expect(screen.getByRole('button', { name: 'Garden rescue: Mimi' })).toHaveAttribute(
      'data-shape',
      'circle',
    );
    expect(screen.getByRole('button', { name: 'Forest rescues' })).toHaveAttribute(
      'data-silhouette',
      'pines',
    );
    expect(screen.getByRole('button', { name: 'Farm rescues' })).toHaveAttribute(
      'data-silhouette',
      'barn',
    );
    expect(screen.getByRole('button', { name: 'Pond rescues' })).toHaveAttribute(
      'data-shape',
      'wave',
    );
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Shelter',
      'Farm',
      'Forest',
      'Garden',
      'Pond',
    ]);
  });

  it('plays each declarative location cue before selecting that location', () => {
    const events: string[] = [];
    renderMap('hu', {
      play: (cue) => {
        events.push(`cue:${cue}`);
      },
      select: (locationId) => {
        events.push(`open:${locationId}`);
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Erdei mentések' }));
    expect(events).toEqual(['cue:effects.ambience.forest', 'open:forest']);
  });

  it('keeps hidden locations absent and uses the content-declared Shelter cue', () => {
    const play = vi.fn();
    const openShelter = vi.fn();
    render(
      <MapScreen
        effectService={{ play }}
        locale="en"
        onOpenLocation={vi.fn()}
        onOpenShelter={openShelter}
        registry={testContentRegistry}
        visibleLocationIds={['garden']}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Forest rescues' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Shelter' }));
    expect(play).toHaveBeenCalledWith('effects.ambience.rescue-center');
    expect(openShelter).toHaveBeenCalledOnce();
  });

  it('renders the resolved production background and active-call portrait when available', () => {
    render(
      <MapScreen
        activeLocationId="garden"
        activePortraitUrl="/content/base/assets/images/residents/mimi/canonical.png"
        backgroundUrl="/content/base/assets/images/map/garden-map.png"
        effectService={{ play: vi.fn() }}
        locale="en"
        onOpenLocation={vi.fn()}
        onOpenShelter={vi.fn()}
        registry={testContentRegistry}
        visibleLocationIds={['garden']}
      />,
    );

    expect(screen.getByRole('button', { name: 'Garden rescue: Mimi' })).toHaveAttribute(
      'data-active-call',
      'true',
    );
    expect(document.querySelector('.map-scene-background')).toHaveAttribute(
      'src',
      '/content/base/assets/images/map/garden-map.png',
    );
    expect(document.querySelector('.map-active-call-portrait')).toHaveAttribute(
      'src',
      '/content/base/assets/images/residents/mimi/canonical.png',
    );
  });
});

function renderMap(
  locale: 'en' | 'hu',
  callbacks: Readonly<{
    play?: (cue: EffectCue) => void;
    select?: (locationId: string) => void;
  }> = {},
) {
  return render(
    <MapScreen
      effectService={{ play: callbacks.play ?? vi.fn() }}
      locale={locale}
      onOpenLocation={callbacks.select ?? vi.fn()}
      onOpenShelter={vi.fn()}
      registry={testContentRegistry}
      visibleLocationIds={['garden', 'forest', 'farm', 'pond']}
    />,
  );
}
