import { useEffect, useRef, type KeyboardEvent } from 'react';

import { getStrings, type Locale } from '../i18n/localization';
import { fullResetKind, type ParentSettingsResetKind } from './parent-settings-reset-kind';

type ResetConfirmationProps = Readonly<{
  busy: boolean;
  failed: boolean;
  kind: ParentSettingsResetKind;
  locale: Locale;
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function ResetConfirmation(props: ResetConfirmationProps) {
  const strings = getStrings(props.locale);
  const all = props.kind === fullResetKind;
  const title = all ? strings.confirmFullResetTitle : strings.confirmProgressResetTitle;
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelButton.current?.focus();
  }, []);
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && !props.busy) {
      event.preventDefault();
      props.onCancel();
      return;
    }
    if (event.key === 'Tab') {
      trapDialogFocus(event, cancelButton.current, confirmButton.current);
    }
  };
  return (
    <div className="reset-confirmation-backdrop">
      <section
        aria-busy={props.busy}
        aria-describedby="reset-confirmation-description"
        aria-labelledby="reset-confirmation-title"
        aria-modal="true"
        onKeyDown={handleKeyDown}
        role="dialog"
      >
        <h2 id="reset-confirmation-title">{title}</h2>
        <p id="reset-confirmation-description">
          {all ? strings.confirmFullResetDescription : strings.confirmProgressResetDescription}
        </p>
        {props.failed ? (
          <p className="settings-error" role="alert">
            {strings.resetFailed}
          </p>
        ) : null}
        <div>
          <button
            aria-disabled={props.busy}
            onClick={props.onCancel}
            ref={cancelButton}
            type="button"
          >
            {strings.cancel}
          </button>
          <button
            aria-disabled={props.busy}
            onClick={props.onConfirm}
            ref={confirmButton}
            type="button"
          >
            {all ? strings.confirmFullReset : strings.confirmProgressReset}
          </button>
        </div>
      </section>
    </div>
  );
}

function trapDialogFocus(
  event: KeyboardEvent<HTMLElement>,
  first: HTMLButtonElement | null,
  last: HTMLButtonElement | null,
): void {
  if (first === null) {
    return;
  }
  if (last === null) {
    return;
  }
  const [boundary, destination] = event.shiftKey ? [first, last] : [last, first];
  if (document.activeElement !== boundary) {
    return;
  }
  event.preventDefault();
  destination.focus();
}
