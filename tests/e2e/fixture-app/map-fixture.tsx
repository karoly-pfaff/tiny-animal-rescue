import { useState } from 'react';
import '@fontsource-variable/baloo-2';
import '@fontsource-variable/nunito';

import { MapScreen } from '../../../sources/app/map-screen';
import { selectMissionCalls } from '../../../sources/content/mission-call-content';
import { selectProgression } from '../../../sources/content/progression-selectors';
import type { Locale } from '../../../sources/i18n/localization';
import {
  progressionFixtureRegistry,
  progressionSeedStates,
  type ProgressionSeedName,
} from '../../support/progression-content';
import '../../../sources/styles/foundation.css';
import '../../../sources/styles/first-rescue.css';
import '../../../sources/styles/start-screen.css';

export function MapFixture({
  locale,
  seed,
}: Readonly<{ locale: Locale; seed: ProgressionSeedName }>) {
  const [lastCue, setLastCue] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedMissionId, setSelectedMissionId] = useState('');
  const registry = progressionFixtureRegistry();
  const state = progressionSeedStates[seed];
  const progression = selectProgression(registry, state);
  const selectedCalls = selectMissionCalls(registry, progression, { locale, state });
  const featuredCall = selectedCalls.calls.find(({ id }) => id === selectedCalls.featuredMissionId);

  return (
    <div
      className="map-fixture"
      data-available-mission-ids={progression.availableMissionIds.join(',')}
      data-completed-mission-ids={state.completedMissionIds.join(',')}
      data-last-cue={lastCue}
      data-selected-location-id={selectedLocationId}
      data-selected-mission-id={selectedMissionId}
      data-seed={seed}
      data-visible-location-ids={progression.visibleLocationIds.join(',')}
    >
      <MapScreen
        activePortraitUrl={null}
        effectService={{
          play: (cue) => {
            setLastCue(cue);
          },
        }}
        featuredMissionId={selectedCalls.featuredMissionId}
        locale={locale}
        missionCalls={selectedCalls.calls}
        onOpenLocation={setSelectedLocationId}
        onOpenMission={setSelectedMissionId}
        onOpenShelter={() => {
          setSelectedLocationId('shelter');
        }}
        registry={registry}
        visibleLocationIds={progression.visibleLocationIds}
        {...(featuredCall === undefined ? {} : { activeLocationId: featuredCall.locationId })}
      />
    </div>
  );
}
