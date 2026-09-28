type GuidanceStage = 'complete' | 'demonstration' | 'escalated' | 'idle' | 'pulse';

type GuidanceDiagnosticName =
  'demonstration delay' | 'elapsed time' | 'escalation delay' | 'pulse delay';

const completeStage = 'complete' satisfies GuidanceStage;
const demonstrationStage = 'demonstration' satisfies GuidanceStage;
const escalatedStage = 'escalated' satisfies GuidanceStage;
const idleStage = 'idle' satisfies GuidanceStage;
const pulseStage = 'pulse' satisfies GuidanceStage;
const demonstrationDelayName = 'demonstration delay' satisfies GuidanceDiagnosticName;
const elapsedTimeName = 'elapsed time' satisfies GuidanceDiagnosticName;
const escalationDelayName = 'escalation delay' satisfies GuidanceDiagnosticName;
const pulseDelayName = 'pulse delay' satisfies GuidanceDiagnosticName;

export type GuidanceLadderConfig = Readonly<{
  demonstrationAfterMs: number;
  escalatedToleranceScale: number;
  escalationAfterMs: number;
  pulseAfterMs: number;
  wrongAttemptsBeforeEscalation: number;
}>;

export type GuidanceLadderState = Readonly<{
  idleElapsedMs: number;
  isComplete: boolean;
  isPaused: boolean;
  wrongAttempts: number;
}>;

export type GuidancePresentation = Readonly<{
  isDemonstrationVisible: boolean;
  isPulseVisible: boolean;
  isStaticHighlightVisible: boolean;
  stage: GuidanceStage;
  toleranceScale: number;
}>;

export function createGuidanceLadderConfig(config: GuidanceLadderConfig): GuidanceLadderConfig {
  assertNonNegative(config.pulseAfterMs, pulseDelayName);
  assertOrdered(config.demonstrationAfterMs, config.pulseAfterMs, demonstrationDelayName);
  assertOrdered(config.escalationAfterMs, config.demonstrationAfterMs, escalationDelayName);
  if (!Number.isFinite(config.escalatedToleranceScale) || config.escalatedToleranceScale < 1) {
    throw new Error('Guidance escalated tolerance scale must be finite and at least one.');
  }
  if (
    !Number.isInteger(config.wrongAttemptsBeforeEscalation) ||
    config.wrongAttemptsBeforeEscalation <= 0
  ) {
    throw new Error('Guidance wrong-attempt threshold must be a positive integer.');
  }
  return Object.freeze({ ...config });
}

export function createGuidanceLadderState(): GuidanceLadderState {
  return { idleElapsedMs: 0, isComplete: false, isPaused: false, wrongAttempts: 0 };
}

export function advanceGuidanceIdle(
  state: GuidanceLadderState,
  elapsedMs: number,
): GuidanceLadderState {
  assertNonNegative(elapsedMs, elapsedTimeName);
  if (state.isComplete || state.isPaused || elapsedMs === 0) {
    return state;
  }
  return { ...state, idleElapsedMs: state.idleElapsedMs + elapsedMs };
}

export function recordGuidanceActivity(state: GuidanceLadderState): GuidanceLadderState {
  if (state.isComplete || state.isPaused || state.idleElapsedMs === 0) {
    return state;
  }
  return { ...state, idleElapsedMs: 0 };
}

export function recordGuidanceWrongAction(state: GuidanceLadderState): GuidanceLadderState {
  if (state.isComplete || state.isPaused) {
    return state;
  }
  return { ...state, idleElapsedMs: 0, wrongAttempts: state.wrongAttempts + 1 };
}

export function pauseGuidance(state: GuidanceLadderState): GuidanceLadderState {
  return state.isComplete || state.isPaused ? state : { ...state, isPaused: true };
}

export function resumeGuidance(state: GuidanceLadderState): GuidanceLadderState {
  return state.isComplete || !state.isPaused ? state : { ...state, isPaused: false };
}

export function completeGuidance(state: GuidanceLadderState): GuidanceLadderState {
  return state.isComplete ? state : { ...state, isComplete: true };
}

export function guidancePresentation(
  state: GuidanceLadderState,
  config: GuidanceLadderConfig,
  reducedMotion: boolean,
): GuidancePresentation {
  const stage = guidanceStage(state, config);
  const hasVisualCue = hasVisualGuidance(stage);
  const hasDemonstration = hasGuidanceDemonstration(stage);
  return {
    isDemonstrationVisible: motionGuidanceVisibility(hasDemonstration, reducedMotion),
    isPulseVisible: motionGuidanceVisibility(hasVisualCue, reducedMotion),
    isStaticHighlightVisible: staticGuidanceVisibility(hasVisualCue, reducedMotion),
    stage,
    toleranceScale: stage === 'escalated' ? config.escalatedToleranceScale : 1,
  };
}

export function nextGuidanceDelay(
  state: GuidanceLadderState,
  config: GuidanceLadderConfig,
): number | null {
  if (state.isPaused) {
    return null;
  }
  const nextThresholdByStage = {
    complete: null,
    demonstration: config.escalationAfterMs,
    escalated: null,
    idle: config.pulseAfterMs,
    pulse: config.demonstrationAfterMs,
  } satisfies Readonly<Record<GuidanceStage, number | null>>;
  const nextThreshold = nextThresholdByStage[guidanceStage(state, config)];
  return nextThreshold === null ? null : nextThreshold - state.idleElapsedMs;
}

function guidanceStage(state: GuidanceLadderState, config: GuidanceLadderConfig): GuidanceStage {
  if (state.isComplete) {
    return completeStage;
  }
  if (isGuidanceEscalated(state, config)) {
    return escalatedStage;
  }
  if (state.idleElapsedMs >= config.demonstrationAfterMs) {
    return demonstrationStage;
  }
  return state.idleElapsedMs >= config.pulseAfterMs ? pulseStage : idleStage;
}

function hasVisualGuidance(stage: GuidanceStage): boolean {
  return stage !== 'complete' && stage !== 'idle';
}

function hasGuidanceDemonstration(stage: GuidanceStage): boolean {
  return stage === 'demonstration' || stage === 'escalated';
}

function motionGuidanceVisibility(visible: boolean, reducedMotion: boolean): boolean {
  return reducedMotion ? false : visible;
}

function staticGuidanceVisibility(visible: boolean, reducedMotion: boolean): boolean {
  return reducedMotion ? visible : false;
}

function isGuidanceEscalated(state: GuidanceLadderState, config: GuidanceLadderConfig): boolean {
  return (
    state.wrongAttempts >= config.wrongAttemptsBeforeEscalation ||
    state.idleElapsedMs >= config.escalationAfterMs
  );
}

function assertNonNegative(value: number, name: GuidanceDiagnosticName): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Guidance ${name} must be finite and non-negative.`);
  }
}

function assertOrdered(value: number, minimum: number, name: GuidanceDiagnosticName): void {
  assertNonNegative(value, name);
  if (value < minimum) {
    throw new Error(`Guidance ${name} must not precede the prior stage.`);
  }
}
