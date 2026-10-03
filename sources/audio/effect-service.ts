import type { StepSuccessCue } from '../content/mission-contract';
import type { MapLandmarkAudioCue } from '../content/world-content-contracts';

export type EffectCue = MapLandmarkAudioCue | StepSuccessCue;

export type EffectService = Readonly<{
  play: (cue: EffectCue) => void;
}>;

export const deferredBrowserEffectService: EffectService = Object.freeze({
  play: () => undefined,
});
