import { describe, expect, it, vi } from 'vitest';

import type { NarrationRequest } from '../../sources/audio/narration-service';
import {
  createGuidanceLadderController,
  type GuidanceClock,
  type GuidanceVisibility,
} from '../../sources/engine/guidance-ladder-controller';
import { createGuidanceLadderConfig } from '../../sources/engine/guidance-ladder-state';

const config = createGuidanceLadderConfig({
  demonstrationAfterMs: 8_000,
  escalatedToleranceScale: 1.35,
  escalationAfterMs: 12_000,
  pulseAfterMs: 4_000,
  wrongAttemptsBeforeEscalation: 2,
});

const prompt = {
  cue: 'voice.fixture',
  locale: 'en',
  text: 'Help the animal',
} as const satisfies NarrationRequest;

class ManualClock implements GuidanceClock {
  private currentTime = 0;
  private nextTimerId = 1;
  private readonly timers = new Map<number, Readonly<{ at: number; callback: () => void }>>();

  clearTimer = (timerId: number) => {
    this.timers.delete(timerId);
  };

  now = () => this.currentTime;

  setTimer = (callback: () => void, delayMs: number) => {
    const timerId = this.nextTimerId;
    this.nextTimerId += 1;
    this.timers.set(timerId, { at: this.currentTime + delayMs, callback });
    return timerId;
  };

  advanceBy(elapsedMs: number): void {
    const targetTime = this.currentTime + elapsedMs;
    let next = this.nextDueTimer(targetTime);
    while (next !== null) {
      this.currentTime = next.at;
      this.timers.delete(next.id);
      next.callback();
      next = this.nextDueTimer(targetTime);
    }
    this.currentTime = targetTime;
  }

  private nextDueTimer(targetTime: number) {
    const due = [...this.timers.entries()]
      .filter(([, timer]) => timer.at <= targetTime)
      .sort((first, second) => first[1].at - second[1].at)[0];
    return due === undefined ? null : { at: due[1].at, callback: due[1].callback, id: due[0] };
  }
}

class ManualVisibility implements GuidanceVisibility {
  private hidden = false;
  private listener: () => void = () => undefined;

  isHidden = () => this.hidden;

  subscribe = (listener: () => void) => {
    this.listener = listener;
    return () => {
      this.listener = () => undefined;
    };
  };

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.listener();
  }
}

function createController(options: Readonly<{ hidden?: boolean; reducedMotion?: boolean }> = {}) {
  const clock = new ManualClock();
  const visibility = new ManualVisibility();
  if (options.hidden === true) {
    visibility.setHidden(true);
  }
  const narrationService = { speak: vi.fn(), stop: vi.fn() };
  const presentations: string[] = [];
  const controller = createGuidanceLadderController({
    clock,
    config,
    narrationService,
    onPresentationChange: ({ stage }) => presentations.push(stage),
    prompt,
    reducedMotion: options.reducedMotion ?? false,
    visibility,
  });
  return { clock, controller, narrationService, presentations, visibility };
}

describe('guidance ladder controller', () => {
  it('coordinates narration, timed stages, and tolerance escalation under a fake clock', () => {
    const { clock, controller, narrationService, presentations } = createController();
    controller.start();

    expect(narrationService.stop).toHaveBeenCalledBefore(narrationService.speak);
    expect(narrationService.speak).toHaveBeenCalledWith(prompt);
    clock.advanceBy(3_999);
    expect(controller.getPresentation().stage).toBe('idle');
    clock.advanceBy(1);
    expect(controller.getPresentation().stage).toBe('pulse');
    clock.advanceBy(4_000);
    expect(controller.getPresentation().stage).toBe('demonstration');
    clock.advanceBy(4_000);
    expect(controller.getPresentation()).toMatchObject({
      stage: 'escalated',
      toleranceScale: 1.35,
    });
    expect(presentations).toEqual(['idle', 'pulse', 'demonstration', 'escalated']);
  });

  it('replay stops and replaces narration while resetting the idle ladder', () => {
    const { clock, controller, narrationService } = createController();
    controller.start();
    clock.advanceBy(8_000);
    controller.replay();

    expect(narrationService.speak).toHaveBeenCalledTimes(2);
    expect(narrationService.stop).toHaveBeenCalledTimes(2);
    expect(narrationService.stop.mock.invocationCallOrder[1]).toBeLessThan(
      narrationService.speak.mock.invocationCallOrder[1] ?? Number.POSITIVE_INFINITY,
    );
    expect(controller.getPresentation().stage).toBe('idle');
  });

  it('pauses in the background and resumes with the remaining idle delay', () => {
    const { clock, controller, narrationService, visibility } = createController();
    controller.start();
    clock.advanceBy(2_000);
    visibility.setHidden(true);
    clock.advanceBy(20_000);

    expect(controller.getPresentation().stage).toBe('idle');
    expect(narrationService.stop).toHaveBeenCalledTimes(2);
    visibility.setHidden(false);
    expect(narrationService.speak).toHaveBeenCalledTimes(2);
    expect(narrationService.stop).toHaveBeenCalledTimes(3);
    expect(narrationService.stop.mock.invocationCallOrder[2]).toBeLessThan(
      narrationService.speak.mock.invocationCallOrder[1] ?? Number.POSITIVE_INFINITY,
    );
    clock.advanceBy(1_999);
    expect(controller.getPresentation().stage).toBe('idle');
    clock.advanceBy(1);
    expect(controller.getPresentation().stage).toBe('pulse');
  });

  it('keeps an explicit pause authoritative across visibility changes', () => {
    const { clock, controller, narrationService, visibility } = createController();
    controller.start();
    clock.advanceBy(1_000);
    controller.pause();
    visibility.setHidden(true);
    visibility.setHidden(false);
    clock.advanceBy(20_000);

    expect(controller.getPresentation().stage).toBe('idle');
    expect(narrationService.speak).toHaveBeenCalledOnce();

    controller.resume();
    expect(narrationService.speak).toHaveBeenCalledTimes(2);
    clock.advanceBy(2_999);
    expect(controller.getPresentation().stage).toBe('idle');
    clock.advanceBy(1);
    expect(controller.getPresentation().stage).toBe('pulse');
  });

  it('narrates on first foregrounding and escalates after wrong actions', () => {
    const { controller, narrationService, visibility } = createController({ hidden: true });
    controller.start();
    expect(narrationService.speak).not.toHaveBeenCalled();

    visibility.setHidden(false);
    expect(narrationService.speak).toHaveBeenCalledOnce();
    controller.wrongAction();
    controller.activity();
    controller.wrongAction();
    expect(controller.getPresentation().stage).toBe('escalated');
  });

  it('completes and disposes idempotently without later timers or replay', () => {
    const { clock, controller, narrationService, presentations, visibility } = createController();
    controller.start();
    controller.complete();
    controller.complete();
    controller.replay();
    clock.advanceBy(20_000);
    controller.dispose();
    controller.dispose();
    visibility.setHidden(true);

    expect(controller.getPresentation().stage).toBe('complete');
    expect(presentations).toEqual(['idle', 'complete']);
    expect(narrationService.speak).toHaveBeenCalledOnce();
    expect(narrationService.stop).toHaveBeenCalledTimes(3);
  });

  it('exposes reduced-motion presentation and explicit pause/resume controls', () => {
    const { clock, controller } = createController({ reducedMotion: true });
    controller.start();
    controller.pause();
    controller.pause();
    clock.advanceBy(8_000);
    controller.resume();
    controller.resume();
    clock.advanceBy(4_000);

    expect(controller.getPresentation()).toMatchObject({
      isDemonstrationVisible: false,
      isPulseVisible: false,
      isStaticHighlightVisible: true,
      stage: 'pulse',
    });
  });
});
