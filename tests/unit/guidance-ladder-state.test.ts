import { describe, expect, it } from 'vitest';

import {
  advanceGuidanceIdle,
  completeGuidance,
  createGuidanceLadderConfig,
  createGuidanceLadderState,
  guidancePresentation,
  nextGuidanceDelay,
  pauseGuidance,
  recordGuidanceActivity,
  recordGuidanceWrongAction,
  resumeGuidance,
} from '../../sources/engine/guidance-ladder-state';

const config = createGuidanceLadderConfig({
  demonstrationAfterMs: 8_000,
  escalatedToleranceScale: 1.35,
  escalationAfterMs: 12_000,
  pulseAfterMs: 4_000,
  wrongAttemptsBeforeEscalation: 2,
});

describe('guidance ladder state', () => {
  it('advances through pulse, demonstration, and time-based tolerance escalation', () => {
    const initial = createGuidanceLadderState();
    const pulse = advanceGuidanceIdle(initial, 4_000);
    const demonstration = advanceGuidanceIdle(pulse, 4_000);
    const escalated = advanceGuidanceIdle(demonstration, 4_000);

    expect(guidancePresentation(initial, config, false)).toMatchObject({ stage: 'idle' });
    expect(guidancePresentation(pulse, config, false)).toMatchObject({
      isDemonstrationVisible: false,
      isPulseVisible: true,
      stage: 'pulse',
      toleranceScale: 1,
    });
    expect(guidancePresentation(demonstration, config, false)).toMatchObject({
      isDemonstrationVisible: true,
      stage: 'demonstration',
    });
    expect(guidancePresentation(escalated, config, false)).toMatchObject({
      stage: 'escalated',
      toleranceScale: 1.35,
    });
  });

  it('escalates after repeated wrong actions and resets only idle timing on activity', () => {
    const idling = advanceGuidanceIdle(createGuidanceLadderState(), 6_000);
    const firstWrong = recordGuidanceWrongAction(idling);
    const active = recordGuidanceActivity(advanceGuidanceIdle(firstWrong, 1_000));
    const escalated = recordGuidanceWrongAction(active);

    expect(firstWrong).toMatchObject({ idleElapsedMs: 0, wrongAttempts: 1 });
    expect(active).toMatchObject({ idleElapsedMs: 0, wrongAttempts: 1 });
    expect(guidancePresentation(escalated, config, false).stage).toBe('escalated');
    expect(nextGuidanceDelay(escalated, config)).toBeNull();
  });

  it('pauses elapsed guidance and resumes from the preserved stage', () => {
    const pulse = advanceGuidanceIdle(createGuidanceLadderState(), 4_000);
    const paused = pauseGuidance(pulse);

    expect(advanceGuidanceIdle(paused, 9_000)).toBe(paused);
    expect(recordGuidanceActivity(paused)).toBe(paused);
    expect(recordGuidanceWrongAction(paused)).toBe(paused);
    expect(nextGuidanceDelay(paused, config)).toBeNull();
    expect(resumeGuidance(paused)).toEqual({ ...pulse, isPaused: false });
    expect(resumeGuidance(pulse)).toBe(pulse);
  });

  it('uses a static highlight instead of motion in reduced-motion mode', () => {
    const demonstration = advanceGuidanceIdle(createGuidanceLadderState(), 8_000);

    expect(guidancePresentation(demonstration, config, true)).toMatchObject({
      isDemonstrationVisible: false,
      isPulseVisible: false,
      isStaticHighlightVisible: true,
      stage: 'demonstration',
    });
  });

  it('reports exact next-stage delays and keeps completed state idempotent', () => {
    const initial = createGuidanceLadderState();
    const complete = completeGuidance(initial);

    expect(nextGuidanceDelay(initial, config)).toBe(4_000);
    expect(nextGuidanceDelay(advanceGuidanceIdle(initial, 4_000), config)).toBe(4_000);
    expect(nextGuidanceDelay(advanceGuidanceIdle(initial, 8_000), config)).toBe(4_000);
    expect(guidancePresentation(complete, config, false).stage).toBe('complete');
    expect(completeGuidance(complete)).toBe(complete);
    expect(pauseGuidance(complete)).toBe(complete);
    expect(resumeGuidance(complete)).toBe(complete);
    expect(recordGuidanceActivity(initial)).toBe(initial);
    expect(advanceGuidanceIdle(initial, 0)).toBe(initial);
  });

  it('rejects invalid timing, tolerance, and wrong-attempt configuration', () => {
    expect(() => createGuidanceLadderConfig({ ...config, pulseAfterMs: -1 })).toThrow(
      'pulse delay',
    );
    expect(() => createGuidanceLadderConfig({ ...config, demonstrationAfterMs: 3_999 })).toThrow(
      'demonstration delay',
    );
    expect(() => createGuidanceLadderConfig({ ...config, escalationAfterMs: 7_999 })).toThrow(
      'escalation delay',
    );
    expect(() => createGuidanceLadderConfig({ ...config, escalatedToleranceScale: 0.9 })).toThrow(
      'tolerance scale',
    );
    expect(() =>
      createGuidanceLadderConfig({ ...config, escalatedToleranceScale: Number.NaN }),
    ).toThrow('tolerance scale');
    expect(() =>
      createGuidanceLadderConfig({ ...config, wrongAttemptsBeforeEscalation: 0 }),
    ).toThrow('wrong-attempt threshold');
    expect(() =>
      createGuidanceLadderConfig({ ...config, wrongAttemptsBeforeEscalation: 1.5 }),
    ).toThrow('wrong-attempt threshold');
    expect(() => advanceGuidanceIdle(createGuidanceLadderState(), Number.NaN)).toThrow(
      'elapsed time',
    );
  });
});
