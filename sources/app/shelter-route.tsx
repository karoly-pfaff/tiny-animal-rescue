import type { NarrationService } from '../audio/narration-service';
import type { FirstRescueContent } from '../content/first-rescue-content';
import type { Locale } from '../i18n/localization';
import type { FirstRescueProgressStore } from './first-rescue-progress';
import { ShelterScreen } from './shelter-screen';

type ShelterRouteProps = Readonly<{
  firstRescueContent: FirstRescueContent;
  firstRescueProgressStore: FirstRescueProgressStore;
  locale: Locale;
  narrationService: NarrationService;
  onNavigate: (path: string) => void;
}>;

export function ShelterRoute(props: ShelterRouteProps) {
  return (
    <ShelterScreen
      content={props.firstRescueContent}
      locale={props.locale}
      narrationService={props.narrationService}
      onMap={() => {
        props.onNavigate('/map');
      }}
      progress={props.firstRescueProgressStore.read()}
    />
  );
}
