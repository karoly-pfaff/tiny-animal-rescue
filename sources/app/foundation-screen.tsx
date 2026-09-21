import type { RouteDefinition } from './routes';
import type { Locale, ScreenTitleKey } from '../i18n/temporary-localization';
import { getTemporaryStrings } from '../i18n/temporary-localization';

type FoundationScreenProps = Readonly<{
  locale: Locale;
  route: RouteDefinition;
}>;

function getScreenTitle(locale: Locale, titleKey: ScreenTitleKey): string {
  return getTemporaryStrings(locale).screenTitles[titleKey];
}

export function FoundationScreen({ locale, route }: FoundationScreenProps) {
  const strings = getTemporaryStrings(locale);
  const isStart = route.id === 'start';

  return (
    <main className="foundation-shell" data-route={route.id}>
      <section className="design-surface" aria-labelledby="screen-title">
        <div className="sky-glow" aria-hidden="true" />
        <div className="rescue-center" aria-hidden="true">
          <span className="roof" />
          <span className="building" />
          <span className="door" />
        </div>
        <div className="meadow" aria-hidden="true" />
        <header className="screen-heading">
          <p className="eyebrow">{strings.appTitle}</p>
          <h1 id="screen-title">{getScreenTitle(locale, route.titleKey)}</h1>
          <p>{strings.routeHint}</p>
        </header>
        {isStart ? (
          <button className="primary-action" type="button" disabled>
            {strings.primaryAction}
          </button>
        ) : null}
      </section>
    </main>
  );
}
