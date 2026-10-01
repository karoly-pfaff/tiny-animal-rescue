import { useEffect, useRef, useState, type RefObject } from 'react';

import { getStrings, type Locale } from '../i18n/localization';
import {
  fullResetKind,
  progressResetKind,
  type ParentSettingsResetKind,
} from './parent-settings-reset-kind';
import { ResetConfirmation } from './reset-confirmation';

const parentGateDurationMs = 2000;

type ParentSettingsScreenProps = Readonly<{
  locale: Locale;
  onBack: () => void;
  onResetAll: () => Promise<void>;
  onResetProgress: () => Promise<void>;
}>;

export function ParentSettingsScreen(props: ParentSettingsScreenProps) {
  const strings = getStrings(props.locale);
  const gate = useParentGate();
  const reset = useParentResetFlow(props, gate.unlocked);

  return (
    <main className="foundation-shell parent-settings-shell" data-route="parent-settings">
      <section
        className="parent-settings-panel"
        aria-labelledby="parent-settings-title"
        inert={reset.confirmation !== null}
      >
        <header>
          <p className="eyebrow">{strings.appTitle}</p>
          <h1 id="parent-settings-title">{strings.parentSettings}</h1>
        </header>
        {gate.unlocked ? (
          <ResetChoices
            busy={reset.busy}
            initialFocus={reset.firstChoice}
            locale={props.locale}
            onChoose={reset.openConfirmation}
            progressReset={reset.progressReset}
          />
        ) : (
          <ParentGate {...gate} locale={props.locale} />
        )}
        <button
          className="settings-back"
          disabled={reset.busy}
          onClick={props.onBack}
          type="button"
        >
          {strings.back}
        </button>
      </section>
      {reset.confirmation === null ? null : (
        <ResetConfirmation
          busy={reset.busy}
          failed={reset.failed}
          kind={reset.confirmation}
          locale={props.locale}
          onCancel={reset.closeConfirmation}
          onConfirm={() => void reset.confirmReset()}
        />
      )}
    </main>
  );
}

type ResetFlowState = Readonly<{
  busy: boolean;
  confirmation: ParentSettingsResetKind | null;
  failed: boolean;
  progressReset: boolean;
}>;

function useParentResetFlow(props: ParentSettingsScreenProps, gateUnlocked: boolean) {
  const [state, setState] = useState<ResetFlowState>({
    busy: false,
    confirmation: null,
    failed: false,
    progressReset: false,
  });
  const firstChoice = useRef<HTMLButtonElement>(null);
  const confirmationOpener = useRef<HTMLElement | null>(null);
  const priorConfirmation = useRef<ParentSettingsResetKind | null>(null);

  useEffect(() => {
    if (gateUnlocked && state.confirmation === null) {
      firstChoice.current?.focus();
    }
  }, [gateUnlocked, state.confirmation]);

  useEffect(() => {
    if (state.confirmation === null && priorConfirmation.current !== null) {
      confirmationOpener.current?.focus();
    }
    priorConfirmation.current = state.confirmation;
  }, [state.confirmation]);

  function openConfirmation(kind: ParentSettingsResetKind): void {
    confirmationOpener.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setState((current) => ({ ...current, confirmation: kind, failed: false }));
  }

  function closeConfirmation(): void {
    if (!state.busy) {
      setState((current) => ({ ...current, confirmation: null, failed: false }));
    }
  }

  async function confirmReset(): Promise<void> {
    const kind = state.confirmation;
    if (kind === null || state.busy) {
      return;
    }
    setState((current) => ({ ...current, busy: true, failed: false }));
    try {
      await (kind === progressResetKind ? props.onResetProgress() : props.onResetAll());
      setState((current) => ({
        ...current,
        busy: false,
        confirmation: null,
        progressReset: kind === progressResetKind,
      }));
    } catch {
      setState((current) => ({ ...current, busy: false, failed: true }));
    }
  }

  return { ...state, closeConfirmation, confirmReset, firstChoice, openConfirmation };
}

function useParentGate() {
  const [unlocked, setUnlocked] = useState(false);
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const cancel = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
  };
  const begin = () => {
    if (timer.current !== null || unlocked) {
      return;
    }
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      setUnlocked(true);
    }, parentGateDurationMs);
  };
  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    },
    [],
  );
  return { begin, cancel, holding, unlocked };
}

function ParentGate({
  begin,
  cancel,
  holding,
  locale,
}: Readonly<ReturnType<typeof useParentGate> & { locale: Locale }>) {
  const strings = getStrings(locale);
  return (
    <section className="parent-gate" aria-labelledby="parent-gate-title">
      <h2 id="parent-gate-title">{strings.parentGateTitle}</h2>
      <p id="parent-gate-hint">{strings.parentGateHint}</p>
      <button
        aria-describedby="parent-gate-hint"
        className={`parent-gate-action${holding ? ' is-holding' : ''}`}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            begin();
          }
        }}
        onKeyUp={cancel}
        onPointerCancel={cancel}
        onPointerDown={begin}
        onPointerLeave={cancel}
        onPointerUp={cancel}
        type="button"
      >
        {strings.parentGateAction}
      </button>
    </section>
  );
}

function ResetChoices({
  busy,
  initialFocus,
  locale,
  onChoose,
  progressReset,
}: Readonly<{
  busy: boolean;
  initialFocus: RefObject<HTMLButtonElement | null>;
  locale: Locale;
  onChoose: (kind: ParentSettingsResetKind) => void;
  progressReset: boolean;
}>) {
  const strings = getStrings(locale);
  const chooseProgressReset = () => {
    onChoose(progressResetKind);
  };
  const chooseFullReset = () => {
    onChoose(fullResetKind);
  };
  return (
    <div className="reset-choices">
      {progressReset ? <p role="status">{strings.resetProgressComplete}</p> : null}
      <button disabled={busy} onClick={chooseProgressReset} ref={initialFocus} type="button">
        <strong>{strings.resetProgress}</strong>
        <span>{strings.resetProgressDescription}</span>
      </button>
      <button disabled={busy} onClick={chooseFullReset} type="button">
        <strong>{strings.fullReset}</strong>
        <span>{strings.fullResetDescription}</span>
      </button>
    </div>
  );
}
