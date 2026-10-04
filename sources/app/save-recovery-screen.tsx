import { getStrings, type Locale } from '../i18n/localization';
import type { ProgressBootstrapStatus } from './progress-bootstrap';

type RecoveryStatus = Extract<ProgressBootstrapStatus, 'corrupt' | 'unsupported-version'>;

type SaveRecoveryScreenProps = Readonly<{
  locale: Locale;
  onRecoverCorrupt: () => void;
  onRetry: () => void;
  status: RecoveryStatus;
}>;

export function SaveRecoveryScreen({
  locale,
  onRecoverCorrupt,
  onRetry,
  status,
}: SaveRecoveryScreenProps) {
  const strings = getStrings(locale);
  const corrupt = status === 'corrupt';
  return (
    <main className="game-shell" data-route="save-recovery">
      <section className="game-surface save-failure-screen" aria-labelledby="save-recovery-title">
        <div className="save-failure-card">
          <p className="parent-context">{strings.parentRecovery}</p>
          <h1 id="save-recovery-title">
            {corrupt ? strings.saveCorruptTitle : strings.saveUnsupportedTitle}
          </h1>
          <p role="alert">{corrupt ? strings.saveCorrupt : strings.saveUnsupported}</p>
          <div className="save-recovery-actions">
            <button type="button" onClick={onRetry}>
              {strings.tryAgain}
            </button>
            {corrupt ? (
              <button type="button" onClick={onRecoverCorrupt}>
                {strings.startSafeSave}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
