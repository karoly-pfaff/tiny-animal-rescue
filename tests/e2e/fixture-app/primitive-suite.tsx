import { useCallback, useMemo, useState } from 'react';

import type { NarrationRequest, NarrationService } from '../../../sources/audio/narration-service';
import type { MissionStep } from '../../../sources/content/mission-contract';
import { createGuidanceLadderConfig } from '../../../sources/engine/guidance-ladder-state';
import { useGuidanceLadder } from '../../../sources/engine/use-guidance-ladder';
import { useMissionStepOrchestrator } from '../../../sources/engine/use-mission-step-orchestrator';
import {
  primitiveDemonstrationScene,
  primitiveDemonstrationText,
} from '../../fixtures/interactions/primitive-demonstration';
import { PrimitiveStep } from './primitive-step';

type NarrationEvidence = Readonly<{
  service: NarrationService;
  speakCount: number;
  stopCount: number;
}>;

export function PrimitiveSuite() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completionCount, setCompletionCount] = useState(0);
  const step = requiredStep(activeStepIndex);
  const steps = useMemo(() => [step], [step]);
  const recordCompletion = useCallback(() => {
    setCompletionCount((current) => current + 1);
  }, []);
  const mission = useMissionStepOrchestrator(steps, recordCompletion);
  const activeInteraction = mission.active;
  const paused = activeInteraction?.paused ?? false;
  const prompt = requiredPrompt(step.promptKey);
  const narration = useNarrationEvidence();
  const config = useMemo(
    () =>
      createGuidanceLadderConfig({
        demonstrationAfterMs: step.hint.delayMs + 1_000,
        escalatedToleranceScale: 1.35,
        escalationAfterMs: step.hint.delayMs + 2_000,
        pulseAfterMs: step.hint.delayMs,
        wrongAttemptsBeforeEscalation: 2,
      }),
    [step.hint.delayMs],
  );
  const narrationPrompt = useMemo(
    () => ({ cue: step.promptKey, locale: 'en', text: prompt }) satisfies NarrationRequest,
    [prompt, step.promptKey],
  );
  const guidance = useGuidanceLadder({
    active: true,
    config,
    narrationService: narration.service,
    prompt: narrationPrompt,
  });

  const selectStep = (index: number) => {
    setActiveStepIndex(index);
  };
  const togglePause = () => {
    if (paused) {
      guidance.resume();
      mission.resume();
    } else {
      guidance.pause();
      mission.pause();
    }
  };

  return (
    <main
      className="primitive-suite"
      data-active-step-id={step.id}
      data-completion-count={completionCount}
      data-narration-count={narration.speakCount}
      data-narration-stop-count={narration.stopCount}
      data-suite-id={primitiveDemonstrationScene.id}
    >
      <header className="primitive-suite-header">
        <h1>Interaction workshop</h1>
        <nav aria-label="Interaction demonstrations" className="primitive-suite-tabs">
          {primitiveDemonstrationScene.steps.map((candidate, index) => (
            <button
              aria-pressed={candidate.id === step.id}
              data-step-type={candidate.type}
              key={candidate.id}
              onClick={() => {
                selectStep(index);
              }}
              type="button"
            >
              {candidate.type}
            </button>
          ))}
        </nav>
        <p aria-live="polite" className="primitive-suite-prompt">
          {prompt}
        </p>
        <div className="primitive-suite-controls">
          <button onClick={togglePause} type="button">
            {paused ? 'Resume interaction' : 'Pause interaction'}
          </button>
          <button onClick={guidance.replay} type="button">
            Replay prompt
          </button>
          <button
            onClick={() => {
              mission.reset();
            }}
            type="button"
          >
            Restart interaction
          </button>
        </div>
      </header>
      <section
        aria-disabled={paused}
        aria-label={`${step.type} demonstration`}
        className={`interaction-demo-surface primitive-suite-surface primitive-suite-${step.type}`}
        data-guidance-stage={guidance.presentation.stage}
        data-paused={paused}
        data-step-id={step.id}
        inert={paused}
      >
        {activeInteraction === null ? null : (
          <PrimitiveStep
            active={activeInteraction}
            guidance={guidance.presentation}
            key={`${activeInteraction.step.id}:${String(activeInteraction.revision)}`}
            onComplete={() => {
              guidance.complete();
              activeInteraction.complete();
            }}
            onGuidanceActivity={guidance.activity}
            onGuidanceWrongAction={guidance.wrongAction}
            paused={paused}
            prompt={prompt}
          />
        )}
        <button
          aria-label="Irrelevant scene object"
          className="primitive-suite-wrong-action"
          onClick={guidance.wrongAction}
          type="button"
        />
        {paused ? <span className="primitive-suite-paused">Paused</span> : null}
      </section>
    </main>
  );
}

function requiredStep(index: number): MissionStep {
  const step = primitiveDemonstrationScene.steps[index];
  if (step === undefined) {
    throw new Error(`Unknown primitive demonstration index: ${String(index)}`);
  }
  return step;
}

function requiredPrompt(key: string): string {
  const text = (primitiveDemonstrationText as Readonly<Record<string, string>>)[key];
  if (text === undefined) {
    throw new Error(`Missing primitive demonstration text: ${key}`);
  }
  return text;
}

function useNarrationEvidence(): NarrationEvidence {
  const [speakCount, setSpeakCount] = useState(0);
  const [stopCount, setStopCount] = useState(0);
  const service = useMemo<NarrationService>(
    () => ({
      speak: () => {
        setSpeakCount((current) => current + 1);
      },
      stop: () => {
        setStopCount((current) => current + 1);
      },
    }),
    [],
  );
  return { service, speakCount, stopCount };
}
