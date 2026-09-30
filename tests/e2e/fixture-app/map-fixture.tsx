import { useState } from 'react';
import '@fontsource-variable/baloo-2';
import '@fontsource-variable/nunito';

import { MapScreen } from '../../../sources/app/map-screen';
import { bundledContentRegistry } from '../../../sources/content/bundled-content-registry';
import type { Locale } from '../../../sources/i18n/localization';
import '../../../sources/styles/foundation.css';
import '../../../sources/styles/first-rescue.css';
import '../../../sources/styles/start-screen.css';

const allLocationIds = ['garden', 'forest', 'farm', 'pond'] as const;

export function MapFixture({ locale }: Readonly<{ locale: Locale }>) {
  const [lastCue, setLastCue] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  return (
    <div
      className="map-fixture"
      data-last-cue={lastCue}
      data-selected-location-id={selectedLocationId}
    >
      <MapScreen
        activeLocationId="garden"
        effectService={{
          play: (cue) => {
            setLastCue(cue);
          },
        }}
        featuredMissionId={null}
        locale={locale}
        missionCalls={[]}
        onOpenLocation={setSelectedLocationId}
        onOpenMission={() => undefined}
        onOpenShelter={() => {
          setSelectedLocationId('shelter');
        }}
        registry={bundledContentRegistry}
        visibleLocationIds={allLocationIds}
      />
    </div>
  );
}
