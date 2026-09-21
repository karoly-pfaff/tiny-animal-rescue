import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';
import type { ProgressBootstrapStatus } from './progress-bootstrap';

type SaveRecoveryNoticeProps = Readonly<{
  locale: Locale;
  status: ProgressBootstrapStatus;
}>;

export function SaveRecoveryNotice({ locale, status }: SaveRecoveryNoticeProps) {
  const strings = getStrings(locale);
  const message =
    status === 'recovered-corrupt'
      ? strings.saveRecovered
      : status === 'unsupported-version'
        ? strings.saveUnsupported
        : null;
  return message === null ? null : (
    <p className="save-recovery-notice" role="alert">
      {message}
    </p>
  );
}
