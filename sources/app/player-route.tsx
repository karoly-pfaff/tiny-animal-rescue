import { useEffect, useState } from 'react';

import type { EffectService } from '../audio/effect-service';
import type { NarrationService } from '../audio/narration-service';
import {
  firstRescueReward,
  resolveFirstRescueAssets,
  type FirstRescueContent,
} from '../content/first-rescue-content';
import { selectMissionCalls } from '../content/mission-call-content';
import { selectProgression } from '../content/progression-selectors';
import type { Locale } from '../i18n/localization';
import { CelebrationScreen } from './celebration-screen';
import { ContentMissionScreen } from './content-mission-screen';
import { type FirstRescueProgressStore, hasFirstRescueReward } from './first-rescue-progress';
import { FoundationScreen } from './foundation-screen';
import { FirstMissionScreen } from './first-mission-screen';
import { MapScreen } from './map-screen';
import {
  createMapReturnMemory,
  navigateToMissionCall,
  selectActiveMapPortrait,
  selectAvailableMission,
  selectMissionMapLocationId,
} from './mission-route-selection';
import { missionPath, resolveRoute } from './routes';
import { ShelterScreen } from './shelter-screen';

type PlayerRouteProps = Readonly<{
  effectService: EffectService;
  firstRescueProgressStore: FirstRescueProgressStore;
  firstRescueContent: FirstRescueContent;
  locale: Locale;
  narrationService: NarrationService;
  onNavigate: (path: string) => void;
  route: ReturnType<typeof resolveRoute>;
}>;

export function PlayerRoute(props: PlayerRouteProps) {
  const [mapReturn] = useState(createMapReturnMemory);
  if (props.route.id === 'map') {
    return (
      <RescueMap
        {...props}
        onMissionSelected={(missionId, locationId) => {
          mapReturn.remember(locationId);
          props.onNavigate(missionPath(missionId));
        }}
        onReturnLocationRestored={() => {
          mapReturn.clear();
        }}
        returnMapLocationId={mapReturn.read()}
      />
    );
  }
  if (props.route.id === 'mission') {
    return (
      <Mission {...props} missionId={props.route.missionId} onMissionEntered={mapReturn.remember} />
    );
  }
  if (props.route.id === 'celebration') {
    return <Celebration {...props} />;
  }
  if (props.route.id === 'shelter') {
    return <Shelter {...props} />;
  }
  return <FoundationScreen locale={props.locale} route={props.route} />;
}

function RescueMap({
  effectService,
  firstRescueContent,
  firstRescueProgressStore,
  locale,
  onMissionSelected,
  onNavigate,
  onReturnLocationRestored,
  returnMapLocationId = null,
}: PlayerRouteProps &
  Readonly<{
    onMissionSelected?: (missionId: string, locationId: string) => void;
    onReturnLocationRestored?: () => void;
    returnMapLocationId?: string | null;
  }>) {
  const assets = resolveFirstRescueAssets(firstRescueContent);
  const progression = selectProgression(
    firstRescueContent.registry,
    firstRescueProgressStore.read(),
  );
  const missionCalls = selectMissionCalls(firstRescueContent.registry, progression, {
    locale,
    state: firstRescueProgressStore.read(),
  });
  const featuredCall = missionCalls.calls.find(({ id }) => id === missionCalls.featuredMissionId);
  const activePortraitUrl = selectActiveMapPortrait(
    featuredCall,
    firstRescueContent.mission.id,
    assets.residentPortrait,
  );
  return (
    <MapScreen
      activePortraitUrl={activePortraitUrl}
      backgroundUrl={assets.mapBackground}
      effectService={effectService}
      featuredMissionId={missionCalls.featuredMissionId}
      locale={locale}
      missionCalls={missionCalls.calls}
      onOpenLocation={() => undefined}
      onOpenMission={(missionId) => {
        navigateToMissionCall(missionId, {
          calls: missionCalls.calls,
          onNavigate,
          path: missionPath(missionId),
          ...(onMissionSelected === undefined ? {} : { onMissionSelected }),
        });
      }}
      onOpenShelter={() => {
        onNavigate('/shelter');
      }}
      registry={firstRescueContent.registry}
      {...(onReturnLocationRestored === undefined
        ? {}
        : { onInitialLocationRestored: onReturnLocationRestored })}
      {...(returnMapLocationId === null ? {} : { initialOpenLocationId: returnMapLocationId })}
      visibleLocationIds={progression.visibleLocationIds}
      {...(featuredCall === undefined ? {} : { activeLocationId: featuredCall.locationId })}
    />
  );
}

function Mission({
  effectService,
  firstRescueContent,
  firstRescueProgressStore,
  locale,
  narrationService,
  onMissionEntered,
  onNavigate,
  missionId,
}: PlayerRouteProps &
  Readonly<{ missionId: string | null; onMissionEntered: (locationId: string) => void }>) {
  const selectedMissionId = missionId ?? firstRescueContent.mission.id;
  const progression = selectProgression(
    firstRescueContent.registry,
    firstRescueProgressStore.read(),
  );
  const selected = selectAvailableMission(
    firstRescueContent.registry,
    progression.availableMissionIds,
    selectedMissionId,
  );
  const selectedLocationId =
    selected === null
      ? undefined
      : selectMissionMapLocationId(firstRescueContent.registry, selected);
  useEffect(() => {
    if (selectedLocationId !== undefined) {
      onMissionEntered(selectedLocationId);
    }
  }, [onMissionEntered, selectedLocationId]);
  if (selected === null) {
    return (
      <UnavailableMissionRoute
        effectService={effectService}
        firstRescueContent={firstRescueContent}
        firstRescueProgressStore={firstRescueProgressStore}
        locale={locale}
        narrationService={narrationService}
        onNavigate={onNavigate}
        route={{ id: 'map', path: '/map', titleKey: 'screen.map.title' }}
      />
    );
  }
  if (selected.record.id !== firstRescueContent.mission.id) {
    return (
      <ContentMissionScreen
        locale={locale}
        mission={selected.record}
        narrationService={narrationService}
        onExit={() => {
          onNavigate('/map');
        }}
        ownerPackId={selected.ownerPackId}
        registry={firstRescueContent.registry}
      />
    );
  }
  return (
    <FirstMissionScreen
      content={firstRescueContent}
      effectService={effectService}
      locale={locale}
      narrationService={narrationService}
      onCelebrate={() => {
        onNavigate('/celebration');
      }}
      onCommitReward={async () => {
        await firstRescueProgressStore.commitReward(locale, firstRescueReward(firstRescueContent));
      }}
      onExit={() => {
        onNavigate('/map');
      }}
    />
  );
}

function UnavailableMissionRoute(props: PlayerRouteProps) {
  const { onNavigate } = props;
  useEffect(() => {
    onNavigate('/map');
  }, [onNavigate]);
  return <RescueMap {...props} />;
}

function Celebration(props: PlayerRouteProps) {
  if (
    !hasFirstRescueReward(
      props.firstRescueProgressStore.read(),
      firstRescueReward(props.firstRescueContent),
    )
  ) {
    return <RescueMap {...props} />;
  }
  return (
    <CelebrationScreen
      content={props.firstRescueContent}
      locale={props.locale}
      narrationService={props.narrationService}
      onMap={() => {
        props.onNavigate('/map');
      }}
      onShelter={() => {
        props.onNavigate('/shelter');
      }}
    />
  );
}

function Shelter({
  firstRescueContent,
  firstRescueProgressStore,
  locale,
  onNavigate,
}: PlayerRouteProps) {
  return (
    <ShelterScreen
      content={firstRescueContent}
      locale={locale}
      onMap={() => {
        onNavigate('/map');
      }}
      progress={firstRescueProgressStore.read()}
    />
  );
}
