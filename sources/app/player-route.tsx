import type { EffectService } from '../audio/effect-service';
import type { NarrationService } from '../audio/narration-service';
import { firstRescueReward, type FirstRescueContent } from '../content/first-rescue-content';
import type { Locale } from '../i18n/localization';
import { CelebrationScreen } from './celebration-screen';
import { type FirstRescueProgressStore, hasFirstRescueReward } from './first-rescue-progress';
import { FoundationScreen } from './foundation-screen';
import { FirstMissionScreen } from './first-mission-screen';
import { MapScreen } from './map-screen';
import { resolveRoute } from './routes';
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
    return <Mission {...props} />;
  }
  if (props.route.id === 'celebration') {
    return <Celebration {...props} />;
  }
  if (props.route.id === 'shelter') {
    return <Shelter {...props} />;
  }
  return <FoundationScreen locale={props.locale} route={props.route} />;
}

function RescueMap({ firstRescueContent, locale, onNavigate }: PlayerRouteProps) {
  return (
    <MapScreen
      content={firstRescueContent}
      locale={locale}
      onOpenGardenMission={() => {
        onNavigate('/mission');
      }}
      onOpenShelter={() => {
        onNavigate('/shelter');
      }}
    />
  );
}

function Mission({
  effectService,
  firstRescueContent,
  firstRescueProgressStore,
  locale,
  narrationService,
  onNavigate,
}: PlayerRouteProps) {
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
