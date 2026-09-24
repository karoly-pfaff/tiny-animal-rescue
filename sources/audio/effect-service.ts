import type { StepSuccessCue } from '../content/mission-contract';

export type EffectService = Readonly<{
  play: (cue: StepSuccessCue) => void;
}>;

export const deferredBrowserEffectService: EffectService = Object.freeze({
  play: () => undefined,
});
