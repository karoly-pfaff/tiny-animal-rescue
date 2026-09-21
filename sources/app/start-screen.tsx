import { resolveStartBackground } from '../content/first-rescue-assets';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';
import { LanguageGate } from './language-gate';

type StartScreenProps = Readonly<{
  locale: Locale;
  loading: boolean;
  localeSaveFailed: boolean;
  localeSaving: boolean;
  needsLocale: boolean;
  onOpenSettings: () => void;
  onPlay: () => void;
  onSelectLocale: (locale: Locale) => void;
}>;

function PlayIcon() {
  return <span className="play-icon" aria-hidden="true" />;
}

function SettingsIcon() {
  return <span className="settings-icon" aria-hidden="true" />;
}

export function StartScreen(props: StartScreenProps) {
  const {
    locale,
    loading,
    localeSaveFailed,
    localeSaving,
    needsLocale,
    onOpenSettings,
    onPlay,
    onSelectLocale,
  } = props;
  const strings = getStrings(locale);
  const backgroundUrl = resolveStartBackground();

  return (
    <main className="game-shell" data-route="start">
      <section className="game-surface start-screen" aria-labelledby="start-title">
        {backgroundUrl === null ? null : (
          <img className="scene-background" src={backgroundUrl} alt="" aria-hidden="true" />
        )}
        <div className="title-plaque">
          <h1 id="start-title">{strings.appTitle}</h1>
        </div>
        <button
          className="play-action"
          type="button"
          onClick={onPlay}
          disabled={loading || needsLocale}
        >
          <PlayIcon />
          <span>{strings.play}</span>
        </button>
        <button
          className="settings-action"
          type="button"
          onClick={onOpenSettings}
          disabled={loading || needsLocale}
        >
          <SettingsIcon />
          <span>{strings.parentSettings}</span>
        </button>
        {needsLocale ? (
          <LanguageGate
            busy={localeSaving}
            displayLocale={locale}
            onSelect={onSelectLocale}
            saveFailed={localeSaveFailed}
          />
        ) : null}
      </section>
    </main>
  );
}
