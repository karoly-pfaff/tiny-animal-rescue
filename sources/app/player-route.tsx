import { useEffect } from 'react';

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
  if (props.route.id === 'map') {
    return <RescueMap {...props} />;
  }
  if (props.route.id === 'mission') {
    return <Mission {...props} missionId={props.route.missionId} />;
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
  onNavigate,
}: PlayerRouteProps) {
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
  const activePortraitUrl = selectActivePortrait(
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
        onNavigate(missionPath(missionId));
      }}
      onOpenShelter={() => {
        onNavigate('/shelter');
      }}
      registry={firstRescueContent.registry}
      visibleLocationIds={progression.visibleLocationIds}
      {...(featuredCall === undefined ? {} : { activeLocationId: featuredCall.locationId })}
    />
  );
}

function selectActivePortrait(
  featuredCall: ReturnType<typeof selectMissionCalls>['calls'][number] | undefined,
  initialMissionId: string,
  fallbackPortrait: string | null,
): string | null {
  if (featuredCall === undefined) {
    return null;
  }
  if (featuredCall.portraitUrl !== null) {
    return featuredCall.portraitUrl;
  }
  return new Map([[initialMissionId, fallbackPortrait]]).get(featuredCall.id) ?? null;
}

function Mission({
  effectService,
  firstRescueContent,
  firstRescueProgressStore,
  locale,
  narrationService,
  onNavigate,
  missionId,
}: PlayerRouteProps & Readonly<{ missionId: string | null }>) {
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

function selectAvailableMission(
  registry: FirstRescueContent['registry'],
  availableMissionIds: readonly string[],
  missionId: string,
) {
  if (!availableMissionIds.includes(missionId)) {
    return null;
  }
  const ownerPackId = registry.recordOwners.missions[missionId];
  const record = registry.missions[missionId];
  return ownerPackId === undefined || record === undefined ? null : { ownerPackId, record };
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
