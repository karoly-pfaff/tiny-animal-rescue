import type { RouteDefinition } from './routes';
import type { Locale, ScreenTitleKey } from '../i18n/localization';
import { getStrings } from '../i18n/localization';

type FoundationScreenProps = Readonly<{
  locale: Locale;
  route: RouteDefinition;
}>;

function getScreenTitle(locale: Locale, titleKey: ScreenTitleKey): string {
  return getStrings(locale).screenTitles[titleKey];
}

export function FoundationScreen({ locale, route }: FoundationScreenProps) {
  const strings = getStrings(locale);
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
          <p>{strings.mapHint}</p>
        </header>
        {isStart ? (
          <button className="primary-action" type="button" disabled>
            {strings.play}
          </button>
        ) : null}
      </section>
    </main>
  );
}
