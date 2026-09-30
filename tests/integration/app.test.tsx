import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../sources/app/app';
import {
  createPersistedFirstRescueProgressStore,
  createSessionFirstRescueProgressStore,
} from '../../sources/app/first-rescue-progress';
import { createMemoryLocaleBootstrapRepository } from '../../sources/persistence/locale-bootstrap-repository';
import { createIndexedDbSaveGameRepository } from '../../sources/persistence/save-game-repository';
import { testRegistryWithWorldMission } from '../support/expanded-mission-content';
import { createIndexedDbHarness } from '../unit/support/indexed-db-harness';

describe('App', () => {
  it('requires first-run locale choice, then follows the child path', async () => {
    const repository = createMemoryLocaleBootstrapRepository();
    render(
      <App
        firstRescueProgressStore={createSessionFirstRescueProgressStore()}
        localeRepository={repository}
      />,
    );

    expect(await screen.findByRole('dialog', { name: 'Válassz nyelvet' })).toBeVisible();
    expect(document.documentElement.lang).toBe('hu');
    expect(document.title).toBe('Kis Állatmentők');
    expect(screen.getByRole('button', { name: 'Játék' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Magyar' }));
    await screen.findByRole('button', { name: 'Játék' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Játék' }));
    await act(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'Mentési térkép' })).toBeVisible();
    expect(await repository.readLocale()).toBe('hu');
  });

  it('restores English and opens the parent-oriented settings route', async () => {
    const repository = createMemoryLocaleBootstrapRepository('en');
    render(
      <App
        firstRescueProgressStore={createSessionFirstRescueProgressStore()}
        localeRepository={repository}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Tiny Rescue' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Parent settings' }));
    await act(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'Parent settings' })).toBeVisible();
    expect(document.documentElement.lang).toBe('en');
  });

  it('does not let a deep link bypass first-run locale selection', async () => {
    window.location.hash = '/map';
    const repository = createMemoryLocaleBootstrapRepository();
    render(
      <App
        firstRescueProgressStore={createSessionFirstRescueProgressStore()}
        localeRepository={repository}
      />,
    );

    expect(await screen.findByRole('dialog', { name: 'Válassz nyelvet' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Mentési térkép' })).not.toBeInTheDocument();
  });

  it('keeps setup blocking and allows retry when locale persistence fails', async () => {
    const writeLocale = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValueOnce();
    const repository = { readLocale: () => Promise.resolve(null), writeLocale };
    render(<App localeRepository={repository} />);

    await screen.findByRole('dialog', { name: 'Válassz nyelvet' });
    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A beállítás nem menthető');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Játék' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(await screen.findByRole('heading', { name: 'Tiny Rescue' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writeLocale).toHaveBeenCalledTimes(2);
  });

  it('shows only the first Garden call and opens the correct mission', async () => {
    window.location.hash = '/map';
    const repository = createMemoryLocaleBootstrapRepository('en');
    const narrationService = { speak: vi.fn(), stop: vi.fn() };
    render(
      <App
        firstRescueProgressStore={createSessionFirstRescueProgressStore()}
        localeRepository={repository}
        narrationService={narrationService}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Garden rescue: Mimi' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Shelter' })).toBeVisible();
    expect(screen.queryByText(/Forest|Farm|Pond/u)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Garden rescue: Mimi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mimi in the tree — Garden' }));
    await act(() => Promise.resolve(window.dispatchEvent(new HashChangeEvent('hashchange'))));

    expect(screen.getByRole('heading', { name: 'Mimi in the tree' })).toBeVisible();
    expect(screen.getByRole('main')).toHaveAttribute('data-mission-id', 'garden-kitten-tree');
    expect(window.location.hash).toBe('#/mission/garden-kitten-tree');
    expect(narrationService.speak).toHaveBeenCalledWith({
      cue: 'voice.mission.garden-kitten-tree.step.place-ladder',
      locale: 'en',
      text: 'Move the ladder to the tree!',
    });
  });

  it('reveals Forest and Farm from completed mission IDs without a stored location flag', async () => {
    window.location.hash = '/map';
    render(
      <App
        firstRescueProgressStore={createSessionFirstRescueProgressStore({
          completedMissionIds: ['garden-kitten-tree'],
          unlockedResidentIds: ['mimi-kitten'],
          worldFlags: ['mimi-rescued'],
        })}
        localeRepository={createMemoryLocaleBootstrapRepository('en')}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Garden rescue: Mimi' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Forest rescues' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Farm rescues' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Pond rescues' })).not.toBeInTheDocument();
  });

  it('commits the rescue reward before opening the localized celebration', async () => {
    window.location.hash = '/map';
    const repository = createMemoryLocaleBootstrapRepository('en');
    const progressStore = createSessionFirstRescueProgressStore();
    const narrationService = { speak: vi.fn(), stop: vi.fn() };
    render(
      <App
        firstRescueProgressStore={progressStore}
        localeRepository={repository}
        narrationService={narrationService}
      />,
    );

    await screen.findByRole('button', { name: 'Garden rescue: Mimi' });
    fireEvent.click(screen.getByRole('button', { name: 'Garden rescue: Mimi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mimi in the tree — Garden' }));
    await act(() => Promise.resolve(window.dispatchEvent(new HashChangeEvent('hashchange'))));
    fireEvent.click(screen.getByRole('button', { name: 'Move the ladder to the tree!' }), {
      detail: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tap Mimi!' }));

    expect(progressStore.read()).toEqual({
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    });
    expect(screen.queryByRole('heading', { name: 'Mimi is safe!' })).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Mimi is safe!' });
    await act(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'Mimi is safe!' })).toBeVisible();
    expect(narrationService.speak).toHaveBeenCalledWith({
      cue: 'voice.mission.garden-kitten-tree.success',
      locale: 'en',
      text: 'Mimi is safe!',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    await act(() => Promise.resolve(window.dispatchEvent(new HashChangeEvent('hashchange'))));

    const garden = screen.getByRole('button', { name: 'Garden rescue: Mimi' });
    const replay = screen.getByRole('button', { name: 'Mimi in the tree — Garden' });
    expect(garden).toHaveFocus();
    expect(garden).toHaveAttribute('aria-expanded', 'true');
    expect(replay).toHaveAttribute('data-completed', 'true');
    expect(replay).toHaveAccessibleDescription('Completed, replay available');
    expect(replay.querySelector('.mission-call-complete-cue')).toBeVisible();
  });

  it('returns an unavailable content-addressed mission route to the current map', async () => {
    window.location.hash = '/mission/missing-rescue';
    render(
      <App
        firstRescueProgressStore={createSessionFirstRescueProgressStore()}
        localeRepository={createMemoryLocaleBootstrapRepository('en')}
      />,
    );

    await waitFor(() => {
      expect(window.location.hash).toBe('#/map');
      expect(screen.getByRole('heading', { name: 'Rescue map' })).toBeVisible();
    });
    expect(screen.queryByRole('heading', { name: 'Mimi in the tree' })).not.toBeInTheDocument();
  });

  it('loads a second available mission by ID and starts its opening narration', async () => {
    window.location.hash = '/map';
    const narrationService = { speak: vi.fn(), stop: vi.fn() };
    render(
      <App
        contentRegistry={testRegistryWithWorldMission()}
        firstRescueProgressStore={createSessionFirstRescueProgressStore()}
        localeRepository={createMemoryLocaleBootstrapRepository('en')}
        narrationService={narrationService}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Garden rescue: Mimi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bring the ladder — Garden' }));
    await act(() => Promise.resolve(window.dispatchEvent(new HashChangeEvent('hashchange'))));

    expect(screen.getByRole('heading', { name: 'Bring the ladder' })).toBeVisible();
    expect(screen.getByRole('main')).toHaveAttribute('data-mission-id', 'garden-bring-ladder');
    expect(window.location.hash).toBe('#/mission/garden-bring-ladder');
    expect(narrationService.speak).toHaveBeenCalledWith({
      cue: 'voice.mission.garden-bring-ladder.intro',
      locale: 'en',
      text: 'The ladder is needed in the garden.',
    });
  });

  it('guards the celebration route until the rescue reward exists', async () => {
    window.location.hash = '/celebration';
    render(
      <App
        firstRescueProgressStore={createSessionFirstRescueProgressStore()}
        localeRepository={createMemoryLocaleBootstrapRepository('hu')}
        narrationService={{ speak: vi.fn(), stop: vi.fn() }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Mentési térkép' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Mimi biztonságban van!' }),
    ).not.toBeInTheDocument();
  });

  it('blocks play and retries after a transient save load failure', async () => {
    window.location.hash = '/map';
    const sessionStore = createSessionFirstRescueProgressStore();
    const load = vi
      .fn<() => Promise<'ready'>>()
      .mockRejectedValueOnce(new Error('read failed'))
      .mockResolvedValueOnce('ready');
    const progressStore = { ...sessionStore, load };
    render(
      <App
        firstRescueProgressStore={progressStore}
        localeRepository={createMemoryLocaleBootstrapRepository('en')}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Saving is resting' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Garden rescue: Mimi' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('button', { name: 'Garden rescue: Mimi' })).toBeVisible();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('requires an explicit adult choice before replacing corrupt progress', async () => {
    window.location.hash = '/map';
    const corrupt = { damaged: true, schemaVersion: 1 };
    const harness = createIndexedDbHarness({
      failureMode: 'transaction',
      records: {
        'save-games': { primary: corrupt },
        'save-recovery': {},
      },
    });
    const progressStore = createPersistedFirstRescueProgressStore(
      createIndexedDbSaveGameRepository(harness.factory, () => 'recovery-time'),
    );
    render(
      <App
        firstRescueProgressStore={progressStore}
        localeRepository={createMemoryLocaleBootstrapRepository('en')}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'The save needs help' })).toBeVisible();
    expect(screen.getByText('A grown-up is needed')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Rescue map' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Archive damaged save and start again' }));

    expect(await screen.findByRole('heading', { name: 'Saving is resting' })).toBeVisible();
    expect(harness.getValue('save-games', 'primary')).toEqual(corrupt);
    expect(harness.getStoreValues('save-recovery')).toEqual([]);
    harness.setFailureMode(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'The save needs help' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Archive damaged save and start again' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Rescue map' })).toBeVisible();
    });
    expect(harness.getValue('save-games', 'primary')).toMatchObject({
      completedMissionIds: [],
      unlockedResidentIds: [],
      worldFlags: [],
    });
    expect(harness.getStoreValues('save-recovery')).toEqual([corrupt]);
  });

  it('preserves a future save without offering a destructive recovery action', async () => {
    window.location.hash = '/map';
    const future = { schemaVersion: 2 };
    const harness = createIndexedDbHarness({
      records: {
        'save-games': { primary: future },
        'save-recovery': {},
      },
    });
    const progressStore = createPersistedFirstRescueProgressStore(
      createIndexedDbSaveGameRepository(harness.factory),
    );
    render(
      <App
        firstRescueProgressStore={progressStore}
        localeRepository={createMemoryLocaleBootstrapRepository('en')}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Newer save version' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Archive damaged save and start again' }),
    ).not.toBeInTheDocument();
    expect(harness.getValue('save-games', 'primary')).toEqual(future);
    expect(harness.getStoreValues('save-recovery')).toEqual([]);
  });
});
