import type { NarrationRequest, NarrationService } from '../audio/narration-service';
import {
  advanceGuidanceIdle,
  completeGuidance,
  createGuidanceLadderState,
  guidancePresentation,
  nextGuidanceDelay,
  pauseGuidance,
  recordGuidanceActivity,
  recordGuidanceWrongAction,
  resumeGuidance,
  type GuidanceLadderConfig,
  type GuidanceLadderState,
  type GuidancePresentation,
} from './guidance-ladder-state';

export type GuidanceClock = Readonly<{
  clearTimer: (timerId: number) => void;
  now: () => number;
  setTimer: (callback: () => void, delayMs: number) => number;
}>;

export type GuidanceVisibility = Readonly<{
  isHidden: () => boolean;
  subscribe: (onChange: () => void) => () => void;
}>;

type GuidanceLadderControllerOptions = Readonly<{
  clock: GuidanceClock;
  config: GuidanceLadderConfig;
  narrationService: NarrationService;
  onPresentationChange: (presentation: GuidancePresentation) => void;
  prompt: NarrationRequest;
  reducedMotion: boolean;
  visibility: GuidanceVisibility;
}>;

export type GuidanceLadderController = Readonly<{
  activity: () => void;
  complete: () => void;
  dispose: () => void;
  getPresentation: () => GuidancePresentation;
  pause: () => void;
  replay: () => void;
  resume: () => void;
  start: () => void;
  wrongAction: () => void;
}>;

export function createGuidanceLadderController(
  options: GuidanceLadderControllerOptions,
): GuidanceLadderController {
  return new GuidanceLadderRuntime(options);
}

class GuidanceLadderRuntime implements GuidanceLadderController {
  private state = createGuidanceLadderState();
  private timerId: number | null = null;
  private timerStartedAt: number | null = null;
  private isDisposed = false;
  private isExplicitlyPaused = false;
  private hasNarrated = false;
  private isStarted = false;
  private isVisibilityPaused = false;
  private unsubscribeVisibility: () => void = () => undefined;

  constructor(private readonly options: GuidanceLadderControllerOptions) {}

  activity(): void {
    if (!this.isDisposed) {
      this.resetIdle(recordGuidanceActivity(this.state));
    }
  }

  complete(): void {
    if (this.isDisposed || this.state.isComplete) {
      return;
    }
    this.cancelScheduledStage();
    this.state = completeGuidance(this.state);
    this.options.narrationService.stop();
    this.publish();
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.cancelScheduledStage();
    this.unsubscribeVisibility();
    this.options.narrationService.stop();
  }

  getPresentation(): GuidancePresentation {
    return guidancePresentation(this.state, this.options.config, this.options.reducedMotion);
  }

  pause(): void {
    if (this.isDisposed || this.state.isComplete) {
      return;
    }
    this.isExplicitlyPaused = true;
    this.pauseRuntime();
  }

  private pauseRuntime(): void {
    if (this.state.isPaused) {
      return;
    }
    this.commitScheduledElapsed();
    this.cancelScheduledStage();
    this.state = pauseGuidance(this.state);
    this.options.narrationService.stop();
    this.hasNarrated = false;
    this.publish();
  }

  replay(): void {
    if (this.isDisposed || this.state.isComplete || this.state.isPaused) {
      return;
    }
    this.playPrompt();
    this.resetIdle(recordGuidanceActivity(this.state));
  }

  resume(): void {
    if (this.isDisposed || this.state.isComplete) {
      return;
    }
    this.isExplicitlyPaused = false;
    this.resumeRuntimeWhenUnblocked();
  }

  private resumeRuntimeWhenUnblocked(): void {
    if (this.isExplicitlyPaused || this.isVisibilityPaused || !this.state.isPaused) {
      return;
    }
    this.state = resumeGuidance(this.state);
    if (!this.hasNarrated) {
      this.playPrompt();
    }
    this.publish();
    this.scheduleNextStage();
  }

  start(): void {
    if (this.isDisposed || this.isStarted) {
      return;
    }
    this.isStarted = true;
    this.unsubscribeVisibility = this.options.visibility.subscribe(() => {
      this.handleVisibility();
    });
    this.startForCurrentVisibility();
    this.publish();
    this.scheduleNextStage();
  }

  wrongAction(): void {
    if (!this.isDisposed) {
      this.resetIdle(recordGuidanceWrongAction(this.state));
    }
  }

  private startForCurrentVisibility(): void {
    this.isVisibilityPaused = this.options.visibility.isHidden();
    if (this.isVisibilityPaused) {
      this.state = pauseGuidance(this.state);
    } else {
      this.playPrompt();
    }
  }

  private cancelScheduledStage(): void {
    if (this.timerId !== null) {
      this.options.clock.clearTimer(this.timerId);
    }
    this.timerId = null;
    this.timerStartedAt = null;
  }

  private commitScheduledElapsed(): void {
    if (this.timerStartedAt === null) {
      return;
    }
    const elapsedMs = Math.max(0, this.options.clock.now() - this.timerStartedAt);
    this.state = advanceGuidanceIdle(this.state, elapsedMs);
    this.timerStartedAt = null;
  }

  private handleVisibility(): void {
    this.isVisibilityPaused = this.options.visibility.isHidden();
    if (this.isVisibilityPaused) {
      this.pauseRuntime();
    } else {
      this.resumeRuntimeWhenUnblocked();
    }
  }

  private playPrompt(): void {
    this.options.narrationService.stop();
    this.options.narrationService.speak(this.options.prompt);
    this.hasNarrated = true;
  }

  private publish(): void {
    this.options.onPresentationChange(this.getPresentation());
  }

  private resetIdle(nextState: GuidanceLadderState): void {
    this.cancelScheduledStage();
    this.state = nextState;
    this.publish();
    this.scheduleNextStage();
  }

  private scheduleNextStage(): void {
    this.cancelScheduledStage();
    const delayMs = nextGuidanceDelay(this.state, this.options.config);
    if (delayMs === null || this.isDisposed) {
      return;
    }
    this.timerStartedAt = this.options.clock.now();
    this.timerId = this.options.clock.setTimer(() => {
      this.timerId = null;
      this.commitScheduledElapsed();
      this.publish();
      this.scheduleNextStage();
    }, delayMs);
  }
}
