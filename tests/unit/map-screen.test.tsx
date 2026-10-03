import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MapScreen } from '../../sources/app/map-screen';
import type { EffectCue } from '../../sources/audio/effect-service';
import type { MissionCallContent } from '../../sources/content/mission-call-content';
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
        featuredMissionId={null}
        locale="en"
        missionCalls={[]}
        onOpenLocation={vi.fn()}
        onOpenMission={vi.fn()}
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
        featuredMissionId={null}
        locale="en"
        missionCalls={[]}
        onOpenLocation={vi.fn()}
        onOpenMission={vi.fn()}
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

  it('opens localized mission cards with portrait and location cues', () => {
    const onOpenMission = vi.fn();
    const call = gardenMissionCall();
    render(
      <MapScreen
        activeLocationId="garden"
        effectService={{ play: vi.fn() }}
        featuredMissionId={call.id}
        locale="en"
        missionCalls={[call]}
        onOpenLocation={vi.fn()}
        onOpenMission={onOpenMission}
        onOpenShelter={vi.fn()}
        registry={testContentRegistry}
        visibleLocationIds={['garden']}
      />,
    );

    const garden = screen.getByRole('button', { name: 'Garden rescue: Mimi' });
    expect(garden).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(garden);
    expect(garden).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Garden' })).toBeVisible();
    const card = screen.getByRole('button', { name: 'Mimi in the tree — Garden' });
    expect(card).toHaveAttribute('data-featured', 'true');
    expect(card.querySelector('.mission-call-location-cue')).toHaveAttribute(
      'data-shape',
      'circle',
    );
    expect(card.querySelector('.mission-call-portrait')).toHaveAttribute(
      'src',
      '/content/base/assets/images/residents/mimi/canonical.png',
    );

    fireEvent.click(card);
    expect(onOpenMission).toHaveBeenCalledWith('garden-kitten-tree');
    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(screen.queryByRole('region', { name: 'Garden' })).not.toBeInTheDocument();
    expect(garden).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes an old call sheet and visibly selects an unlocked location without calls', () => {
    const call = gardenMissionCall();
    render(
      <MapScreen
        activeLocationId="garden"
        effectService={{ play: vi.fn() }}
        featuredMissionId={call.id}
        locale="en"
        missionCalls={[call]}
        onOpenLocation={vi.fn()}
        onOpenMission={vi.fn()}
        onOpenShelter={vi.fn()}
        registry={testContentRegistry}
        visibleLocationIds={['garden', 'forest', 'farm']}
      />,
    );

    const garden = screen.getByRole('button', { name: 'Garden rescue: Mimi' });
    const forest = screen.getByRole('button', { name: 'Forest rescues' });
    fireEvent.click(garden);
    expect(screen.getByRole('region', { name: 'Garden' })).toBeVisible();
    expect(garden).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(forest);
    expect(screen.queryByRole('region', { name: 'Garden' })).not.toBeInTheDocument();
    expect(forest).toHaveAttribute('aria-pressed', 'true');
    expect(forest).toHaveAttribute('data-selected-location', 'true');
    expect(forest).toHaveAttribute('aria-expanded', 'false');
    expect(garden).toHaveAttribute('aria-pressed', 'false');
  });

  it('restores a returning location and keeps its completed mission replayable', () => {
    const onInitialLocationRestored = vi.fn();
    const onOpenMission = vi.fn();
    const call = gardenMissionCall(true);
    render(
      <MapScreen
        activeLocationId="garden"
        effectService={{ play: vi.fn() }}
        featuredMissionId={null}
        initialOpenLocationId="garden"
        locale="en"
        missionCalls={[call]}
        onInitialLocationRestored={onInitialLocationRestored}
        onOpenLocation={vi.fn()}
        onOpenMission={onOpenMission}
        onOpenShelter={vi.fn()}
        registry={testContentRegistry}
        visibleLocationIds={['garden']}
      />,
    );

    const garden = screen.getByRole('button', { name: 'Garden rescue: Mimi' });
    const replay = screen.getByRole('button', { name: 'Mimi in the tree — Garden' });
    expect(garden).toHaveFocus();
    expect(garden).toHaveAttribute('aria-expanded', 'true');
    expect(replay).toHaveAttribute('data-completed', 'true');
    expect(replay).toHaveAccessibleDescription('Completed, replay available');
    expect(replay).not.toHaveAttribute('data-featured');
    expect(replay.querySelector('.mission-call-complete-cue')).toBeVisible();
    expect(onInitialLocationRestored).toHaveBeenCalledOnce();

    fireEvent.click(replay);
    expect(onOpenMission).toHaveBeenCalledWith('garden-kitten-tree');
  });
});

function gardenMissionCall(completed = false): MissionCallContent {
  const location = testContentRegistry.locations['garden'];
  if (location?.mapPresentation === undefined) {
    throw new Error('The Garden presentation fixture is required.');
  }
  return {
    completed,
    id: 'garden-kitten-tree',
    locationId: 'garden',
    locationName: 'Garden',
    locationPresentation: location.mapPresentation,
    portraitUrl: '/content/base/assets/images/residents/mimi/canonical.png',
    title: 'Mimi in the tree',
  };
}

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
      featuredMissionId={null}
      locale={locale}
      missionCalls={[]}
      onOpenLocation={callbacks.select ?? vi.fn()}
      onOpenMission={vi.fn()}
      onOpenShelter={vi.fn()}
      registry={testContentRegistry}
      visibleLocationIds={['garden', 'forest', 'farm', 'pond']}
    />,
  );
}
