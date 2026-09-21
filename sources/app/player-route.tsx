import type { NarrationService } from '../audio/narration-service';
import type { Locale } from '../i18n/localization';
import { CelebrationScreen } from './celebration-screen';
import { type FirstRescueProgressStore, hasFirstRescueReward } from './first-rescue-progress';
import { FoundationScreen } from './foundation-screen';
import { FirstMissionScreen } from './first-mission-screen';
import { MapScreen } from './map-screen';
import { resolveRoute } from './routes';
import { ShelterScreen } from './shelter-screen';

type PlayerRouteProps = Readonly<{
  firstRescueProgressStore: FirstRescueProgressStore;
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

function RescueMap({ locale, onNavigate }: PlayerRouteProps) {
  return (
    <MapScreen
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
  firstRescueProgressStore,
  locale,
  narrationService,
  onNavigate,
}: PlayerRouteProps) {
  return (
    <FirstMissionScreen
      locale={locale}
      narrationService={narrationService}
      onCelebrate={() => {
        onNavigate('/celebration');
      }}
      onCommitReward={async () => {
        await firstRescueProgressStore.commitReward(locale);
      }}
      onExit={() => {
        onNavigate('/map');
      }}
    />
  );
}

function Celebration(props: PlayerRouteProps) {
  if (!hasFirstRescueReward(props.firstRescueProgressStore.read())) {
    return <RescueMap {...props} />;
  }
  return (
    <CelebrationScreen
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

function Shelter({ firstRescueProgressStore, locale, onNavigate }: PlayerRouteProps) {
  return (
    <ShelterScreen
      locale={locale}
      onMap={() => {
        onNavigate('/map');
      }}
      progress={firstRescueProgressStore.read()}
    />
  );
}
