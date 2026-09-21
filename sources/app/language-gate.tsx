import type { Locale } from '../i18n/localization';
import { getStrings, supportedLocales } from '../i18n/localization';

type LanguageGateProps = Readonly<{
  busy: boolean;
  displayLocale: Locale;
  onSelect: (locale: Locale) => void;
  saveFailed: boolean;
}>;

type LocaleChoiceProps = Readonly<{
  icon: string;
  label: string;
  locale: Locale;
  onSelect: (locale: Locale) => void;
  disabled: boolean;
}>;

function LocaleChoice({ disabled, icon, label, locale, onSelect }: LocaleChoiceProps) {
  return (
    <button
      className="language-choice"
      type="button"
      disabled={disabled}
      onClick={() => {
        onSelect(locale);
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function LanguageGate({ busy, displayLocale, onSelect, saveFailed }: LanguageGateProps) {
  const strings = getStrings(displayLocale);

  return (
    <div
      className="language-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-title"
      aria-describedby="language-hint"
      aria-busy={busy}
    >
      <h2 id="language-title">{strings.chooseLanguageTitle}</h2>
      <p id="language-hint">{strings.chooseLanguageHint}</p>
      {saveFailed ? (
        <p className="language-save-error" role="alert">
          {strings.chooseLanguageSaveError}
        </p>
      ) : null}
      <div className="language-choices">
        <LocaleChoice
          disabled={busy}
          icon={strings.hungarianCode}
          label={strings.hungarian}
          locale={supportedLocales.hungarian}
          onSelect={onSelect}
        />
        <LocaleChoice
          disabled={busy}
          icon={strings.englishCode}
          label={strings.english}
          locale={supportedLocales.english}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
