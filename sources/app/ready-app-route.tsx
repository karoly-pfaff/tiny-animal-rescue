import type { EffectService } from '../audio/effect-service';
import type { NarrationService } from '../audio/narration-service';
import type { ContentRegistry } from '../content/content-registry';
import { selectFirstRescueContent } from '../content/first-rescue-content';
import type { Locale } from '../i18n/localization';
import type { FirstRescueProgressStore } from './first-rescue-progress';
import { ParentSettingsScreen } from './parent-settings-screen';
import { PlayerRoute } from './player-route';
import type { resolveRoute } from './routes';

type ReadyAppRouteProps = Readonly<{
  contentRegistry: ContentRegistry;
  effectService: EffectService;
  firstRescueProgressStore: FirstRescueProgressStore;
  locale: Locale;
  narrationService: NarrationService;
  onLocaleReset: () => Promise<void>;
  onNavigate: (path: string) => void;
  route: ReturnType<typeof resolveRoute>;
}>;

export function ReadyAppRoute(props: ReadyAppRouteProps) {
  if (props.route.id === 'parent-settings') {
    return (
      <ParentSettingsScreen
        locale={props.locale}
        onBack={() => {
          props.onNavigate('/');
        }}
        onResetAll={async () => {
          await props.firstRescueProgressStore.resetAll(props.locale);
          await props.onLocaleReset();
          props.onNavigate('/');
        }}
        onResetProgress={async () => {
          await props.firstRescueProgressStore.resetProgress(props.locale);
        }}
      />
    );
  }

  return (
    <PlayerRoute
      effectService={props.effectService}
      firstRescueContent={requireFirstRescueContent(props.contentRegistry)}
      firstRescueProgressStore={props.firstRescueProgressStore}
      locale={props.locale}
      narrationService={props.narrationService}
      onNavigate={props.onNavigate}
      route={props.route}
    />
  );
}

function requireFirstRescueContent(contentRegistry: ContentRegistry) {
  if (contentRegistry.packOrder.length === 0) {
    throw new Error('The application requires at least one validated content pack.');
  }
  return selectFirstRescueContent(contentRegistry);
}
