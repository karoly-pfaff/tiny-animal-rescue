import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CelebrationScreen } from '../../sources/app/celebration-screen';
import { FirstMissionScreen } from '../../sources/app/first-mission-screen';
import { MapScreen } from '../../sources/app/map-screen';
import { ShelterScreen } from '../../sources/app/shelter-screen';
import {
  firstRescueText,
  selectFirstRescueContent,
  type FirstRescueContent,
} from '../../sources/content/first-rescue-content';
import {
  assembleContentRegistry,
  type ContentPackSource,
} from '../../sources/content/content-registry';
import type { MissionRecord } from '../../sources/content/mission-contract';
import { testFirstRescueContent } from '../support/first-rescue-content';

afterEach(() => {
  vi.useRealTimers();
});

describe('content-driven first Rescue runtime', () => {
  it('uses declared step order, prompts, identifiers, cues, hint delay, and snap tolerance', () => {
    vi.useFakeTimers();
    const content = customizedContent();
    const play = vi.fn();
    const speak = vi.fn();
    render(
      <FirstMissionScreen
        content={content}
        effectService={{ play }}
        locale="en"
        narrationService={{ speak, stop: vi.fn() }}
        onCelebrate={vi.fn()}
        onCommitReward={() => Promise.resolve()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('A custom introduction.')).toBeInTheDocument();
    expect(speak).toHaveBeenCalledWith({
      cue: 'voice.fixture.drag.prompt',
      locale: 'en',
      text: 'Move the fixture object!',
    });
    const ladder = screen.getByRole('button', { name: 'Move the fixture object!' });
    expect(ladder).toHaveAttribute('data-source-id', 'fixture-source');
    expect(ladder).toHaveStyle({ left: '11%', top: '83%' });
    const interaction = ladder.closest('.drag-interaction');
    expect(interaction).toHaveAttribute('data-success-cue', 'effects.progress.step-complete');
    expect(interaction?.querySelector('.ladder-target')).toHaveAttribute(
      'data-target-id',
      'fixture-target',
    );
    const target = interaction?.querySelector<HTMLElement>('.ladder-target');
    expect(target).toHaveStyle({ left: '31%', top: '44%' });
    expect(Number.parseFloat(target?.style.height ?? '')).toBeCloseTo(10, 2);
    expect(Number.parseFloat(target?.style.width ?? '')).toBeCloseTo(15, 2);

    void act(() => vi.advanceTimersByTime(24));
    expect(interaction).toHaveAttribute('data-guidance', 'false');
    void act(() => vi.advanceTimersByTime(1));
    expect(interaction).toHaveAttribute('data-guidance', 'true');

    fireEvent.click(ladder, { detail: 0 });
    expect(play).toHaveBeenCalledWith('effects.progress.step-complete');
    const subject = screen.getByRole('button', { name: 'Tap the fixture subject!' });
    expect(subject).toHaveAttribute('data-step-id', 'fixture-tap');
    expect(subject).toHaveAttribute('data-success-cue', 'effects.interaction.obstacle-cleared');
    expect(subject).toHaveAttribute('data-target-ids', 'fixture-subject');
    expect(subject).toHaveAttribute('data-guidance', 'false');
    expect(speak).toHaveBeenLastCalledWith({
      cue: 'voice.fixture.tap.prompt',
      locale: 'en',
      text: 'Tap the fixture subject!',
    });
    void act(() => vi.advanceTimersByTime(39));
    expect(subject).toHaveAttribute('data-guidance', 'false');
    void act(() => vi.advanceTimersByTime(1));
    expect(subject).toHaveAttribute('data-guidance', 'true');

    fireEvent.click(subject);
    expect(play).toHaveBeenLastCalledWith('effects.interaction.obstacle-cleared');
  });

  it('uses the declared localized success key for celebration narration and copy', () => {
    const content = customizedContent();
    const speak = vi.fn();
    render(
      <CelebrationScreen
        content={content}
        locale="en"
        narrationService={{ speak, stop: vi.fn() }}
        onMap={vi.fn()}
        onShelter={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'The fixture rescue is complete!' })).toBeVisible();
    expect(speak).toHaveBeenCalledWith({
      cue: 'voice.fixture.success',
      locale: 'en',
      text: 'The fixture rescue is complete!',
    });
  });

  it('resolves dependency-owned records, text, assets, and accessible shelter copy', () => {
    const content = dependencyOwnedContent();
    expect(firstRescueText(content, 'en', content.mission.localization.titleKey)).toBe(
      'Poppy in the orchard',
    );

    const map = render(
      <MapScreen
        content={content}
        locale="en"
        onOpenGardenMission={vi.fn()}
        onOpenShelter={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Orchard rescue: Poppy' })).toBeVisible();
    map.rerender(
      <MapScreen
        content={content}
        locale="hu"
        onOpenGardenMission={vi.fn()}
        onOpenShelter={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Gyümölcsöskerti mentés: Poppy' })).toBeVisible();
    map.unmount();

    const progress = {
      completedMissionIds: [content.mission.id],
      unlockedResidentIds: [content.animal.id],
      worldFlags: [],
    };
    const shelter = render(
      <ShelterScreen content={content} locale="en" onMap={vi.fn()} progress={progress} />,
    );
    const englishResident = screen.getByRole('button', { name: 'Give Poppy a gentle pat' });
    fireEvent.click(englishResident);
    expect(screen.getByText('Poppy purrs happily.')).toBeVisible();
    shelter.rerender(
      <ShelterScreen content={content} locale="hu" onMap={vi.fn()} progress={progress} />,
    );
    const hungarianResident = screen.getByRole('button', { name: 'Simogasd meg Poppyt' });
    fireEvent.click(hungarianResident);
    expect(screen.getByText('Poppy boldogan dorombol.')).toBeVisible();
  });
});

function customizedContent(): FirstRescueContent {
  const dragStep = {
    ...testFirstRescueContent.dragStep,
    id: 'fixture-drag',
    hint: { type: 'pulse-after-delay' as const, delayMs: 25 },
    promptKey: 'fixture.drag.prompt',
    sourcePosition: { x: 0.11, y: 0.83 },
    snapTolerance: 0.25,
    sourceId: 'fixture-source',
    successCue: 'effects.progress.step-complete' as const,
    targetId: 'fixture-target',
    targetBounds: {
      center: { x: 0.29, y: 0.41 },
      height: 0.2,
      width: 0.3,
    },
    fallbackTargetBounds: {
      center: { x: 0.31, y: 0.44 },
      height: 0.22,
      width: 0.33,
    },
  };
  const tapStep = {
    ...testFirstRescueContent.tapStep,
    hint: { type: 'pulse-after-delay' as const, delayMs: 40 },
    id: 'fixture-tap',
    promptKey: 'fixture.tap.prompt',
    successCue: 'effects.interaction.obstacle-cleared' as const,
    targetIds: ['fixture-subject'],
  };
  const mission = {
    ...testFirstRescueContent.mission,
    localization: {
      ...testFirstRescueContent.mission.localization,
      introKey: 'fixture.intro',
      successKey: 'fixture.success',
    },
    steps: [dragStep, tapStep] as const,
  };
  const basePack = testFirstRescueContent.registry.packs['base'];
  if (basePack === undefined) {
    throw new Error('The base fixture pack is required.');
  }
  const english = {
    ...basePack.records.localizations['en'],
    'fixture.drag.prompt': 'Move the fixture object!',
    'fixture.intro': 'A custom introduction.',
    'fixture.success': 'The fixture rescue is complete!',
    'fixture.tap.prompt': 'Tap the fixture subject!',
  };
  const registry = {
    ...testFirstRescueContent.registry,
    packs: {
      base: {
        ...basePack,
        records: {
          ...basePack.records,
          localizations: { ...basePack.records.localizations, en: english },
        },
      },
    },
  };
  return { ...testFirstRescueContent, dragStep, mission, registry, tapStep };
}

function dependencyOwnedContent(): FirstRescueContent {
  const originalBase = testFirstRescueContent.registry.packs['base'];
  if (originalBase === undefined) {
    throw new Error('The base fixture pack is required.');
  }
  const baseManifest = { ...originalBase };
  delete baseManifest.initialMissionId;
  const animal = {
    ...testFirstRescueContent.animal,
    id: 'poppy-kitten',
    nameKey: 'animal.poppy-kitten.name',
    shelterAreaId: 'sun-room',
    shelterLocalization: {
      happyKey: 'animal.poppy-kitten.shelter.happy',
      tapLabelKey: 'animal.poppy-kitten.shelter.tap-label',
    },
  };
  const location = {
    ...testFirstRescueContent.location,
    id: 'orchard',
    nameKey: 'location.orchard.name',
    mapLabelKey: 'location.orchard.map-label',
  };
  const shelterArea = {
    ...testFirstRescueContent.shelterArea,
    id: 'sun-room',
    nameKey: 'shelter-area.sun-room.name',
  };
  const base: ContentPackSource = {
    ...baseManifest,
    records: {
      ...originalBase.records,
      animals: [animal],
      locations: [location],
      missions: [],
      shelterAreas: [shelterArea],
      localizations: dependencyRecordLocalizations(originalBase.records.localizations),
    },
  };
  const mission: MissionRecord = {
    ...testFirstRescueContent.mission,
    id: 'orchard-poppy-rescue',
    locationId: 'base:orchard',
    subjectAnimalId: 'base:poppy-kitten',
    scene: {
      ...testFirstRescueContent.mission.scene,
      background: `base:${testFirstRescueContent.mission.scene.background}`,
    },
    steps: testFirstRescueContent.mission.steps.map((step) =>
      step.type === 'drag' ? { ...step, sourceAsset: `base:${step.sourceAsset}` } : step,
    ),
    reward: {
      ...testFirstRescueContent.mission.reward,
      unlockResidentId: 'base:poppy-kitten',
    },
    localization: {
      titleKey: 'mission.orchard-poppy-rescue.title',
      introKey: 'mission.orchard-poppy-rescue.intro',
      successKey: 'mission.orchard-poppy-rescue.success',
    },
    assets: {
      required: testFirstRescueContent.mission.assets.required.map((asset) => `base:${asset}`),
    },
  };
  const expansion: ContentPackSource = {
    id: 'first-rescue-expansion',
    version: '0.3.0',
    contractVersion: 1,
    titleKey: 'pack.first-rescue-expansion.title',
    initialMissionId: mission.id,
    locales: ['hu', 'en'],
    dependencies: ['base'],
    content: originalBase.content,
    records: {
      animals: [],
      assets: [],
      localizations: missionLocalizations(),
      locations: [],
      missions: [mission],
      shelterAreas: [],
    },
  };
  return selectFirstRescueContent(assembleContentRegistry([base, expansion]));
}

function dependencyRecordLocalizations(
  documents: ContentPackSource['records']['localizations'],
): ContentPackSource['records']['localizations'] {
  return {
    en: {
      ...documents['en'],
      'animal.poppy-kitten.name': 'Poppy',
      'animal.poppy-kitten.shelter.happy': 'Poppy purrs happily.',
      'animal.poppy-kitten.shelter.tap-label': 'Give Poppy a gentle pat',
      'location.orchard.map-label': 'Orchard rescue: Poppy',
      'location.orchard.name': 'Orchard',
      'shelter-area.sun-room.name': 'Sun room',
    },
    hu: {
      ...documents['hu'],
      'animal.poppy-kitten.name': 'Poppy',
      'animal.poppy-kitten.shelter.happy': 'Poppy boldogan dorombol.',
      'animal.poppy-kitten.shelter.tap-label': 'Simogasd meg Poppyt',
      'location.orchard.map-label': 'Gyümölcsöskerti mentés: Poppy',
      'location.orchard.name': 'Gyümölcsöskert',
      'shelter-area.sun-room.name': 'Napszoba',
    },
  };
}

function missionLocalizations(): ContentPackSource['records']['localizations'] {
  return {
    en: {
      'mission.garden-kitten-tree.step.help-mimi-down': 'Tap Poppy!',
      'mission.garden-kitten-tree.step.place-ladder': 'Move the ladder!',
      'mission.orchard-poppy-rescue.intro': 'Poppy needs help.',
      'mission.orchard-poppy-rescue.success': 'Poppy is safe!',
      'mission.orchard-poppy-rescue.title': 'Poppy in the orchard',
      'pack.first-rescue-expansion.title': 'First rescue expansion',
    },
    hu: {
      'mission.garden-kitten-tree.step.help-mimi-down': 'Koppints Poppyra!',
      'mission.garden-kitten-tree.step.place-ladder': 'Tedd a helyére a létrát!',
      'mission.orchard-poppy-rescue.intro': 'Poppy segítségre vár.',
      'mission.orchard-poppy-rescue.success': 'Poppy biztonságban van!',
      'mission.orchard-poppy-rescue.title': 'Poppy a gyümölcsösben',
      'pack.first-rescue-expansion.title': 'Első mentés bővítmény',
    },
  };
}
