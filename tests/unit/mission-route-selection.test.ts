import { describe, expect, it, vi } from 'vitest';

import {
  createMapReturnMemory,
  navigateToMissionCall,
  selectActiveMapPortrait,
  selectAvailableMission,
} from '../../sources/app/mission-route-selection';
import type { MissionCallContent } from '../../sources/content/mission-call-content';
import { testContentRegistry } from '../support/first-rescue-content';

describe('mission route selection', () => {
  it('keeps transient map-return state outside persisted progression', () => {
    const memory = createMapReturnMemory();

    expect(memory.read()).toBeNull();
    memory.remember('garden');
    expect(memory.read()).toBe('garden');
    memory.clear();
    expect(memory.read()).toBeNull();
  });

  it('chooses the resolved portrait, the initial fallback, or no portrait', () => {
    const call = gardenCall('/portrait.png');

    expect(selectActiveMapPortrait(undefined, call.id, '/fallback.png')).toBeNull();
    expect(selectActiveMapPortrait(call, call.id, '/fallback.png')).toBe('/portrait.png');
    expect(selectActiveMapPortrait({ ...call, portraitUrl: null }, call.id, '/fallback.png')).toBe(
      '/fallback.png',
    );
    expect(
      selectActiveMapPortrait({ ...call, id: 'another', portraitUrl: null }, call.id, null),
    ).toBe(null);
  });

  it('resolves only owned, available mission records', () => {
    expect(
      selectAvailableMission(testContentRegistry, ['garden-kitten-tree'], 'garden-kitten-tree'),
    ).toMatchObject({ ownerPackId: 'base', record: { id: 'garden-kitten-tree' } });
    expect(selectAvailableMission(testContentRegistry, [], 'garden-kitten-tree')).toBeNull();
    expect(selectAvailableMission(testContentRegistry, ['missing'], 'missing')).toBeNull();
  });

  it('navigates known calls through the supplied selection boundary', () => {
    const onMissionSelected = vi.fn();
    const onNavigate = vi.fn();
    const call = gardenCall('/portrait.png');

    navigateToMissionCall(call.id, {
      calls: [call],
      onMissionSelected,
      onNavigate,
      path: `/mission/${call.id}`,
    });
    expect(onMissionSelected).toHaveBeenCalledWith(call.id, 'garden');
    expect(onNavigate).not.toHaveBeenCalled();

    navigateToMissionCall(call.id, {
      calls: [call],
      onNavigate,
      path: `/mission/${call.id}`,
    });
    expect(onNavigate).toHaveBeenCalledWith(`/mission/${call.id}`);

    navigateToMissionCall('missing', { calls: [call], onNavigate, path: '/mission/missing' });
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});

function gardenCall(portraitUrl: string | null): MissionCallContent {
  const presentation = testContentRegistry.locations['garden']?.mapPresentation;
  if (presentation === undefined) {
    throw new Error('The Garden presentation fixture is required.');
  }
  return {
    completed: false,
    id: 'garden-kitten-tree',
    locationId: 'garden',
    locationName: 'Garden',
    locationPresentation: presentation,
    portraitUrl,
    title: 'Mimi in the tree',
  };
}
