import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';

type SaveFailureScreenProps = Readonly<{
  locale: Locale;
  onRetry: () => void;
}>;

export function SaveFailureScreen({ locale, onRetry }: SaveFailureScreenProps) {
  const strings = getStrings(locale);
  return (
    <main className="game-shell" data-route="save-failure">
      <section className="game-surface save-failure-screen" aria-labelledby="save-failure-title">
        <div className="save-failure-card">
          <h1 id="save-failure-title">{strings.saveUnavailableTitle}</h1>
          <p role="alert">{strings.saveUnavailable}</p>
          <button type="button" onClick={onRetry}>
            {strings.tryAgain}
          </button>
        </div>
      </section>
    </main>
  );
}
