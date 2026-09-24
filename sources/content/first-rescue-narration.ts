import voiceCopy from '../../content/base/assets/first-rescue-voice-copy.json';
import type { Locale } from '../i18n/localization';

export type FirstRescueNarrationCue =
  | 'voice.mission.garden-kitten-tree.step.place-ladder'
  | 'voice.mission.garden-kitten-tree.step.help-mimi-down'
  | 'voice.mission.garden-kitten-tree.success';

type VoiceAsset = Readonly<{
  cue: string;
  fallbackText: Readonly<Record<Locale, string>>;
}>;

type VoiceManifest = Readonly<{
  assets: readonly VoiceAsset[];
}>;

const firstRescueVoiceManifest = voiceCopy satisfies VoiceManifest;

export function getFirstRescueNarrationText(cue: FirstRescueNarrationCue, locale: Locale): string {
  return findVoiceAsset(cue).fallbackText[locale];
}

export function resolveFirstRescueNarration(cue: string, _locale: Locale): string | null {
  const materialized = import.meta.env.VITE_MATERIALIZED_ASSETS;
  if (materialized === undefined) {
    return null;
  }
  if (materialized !== 'true') {
    throw new Error('VITE_MATERIALIZED_ASSETS must be exactly true when it is defined.');
  }
  if (findVoiceAsset(cue).fallbackText[_locale].length === 0) {
    throw new Error(`Missing localized first-rescue voice fallback: ${cue}`);
  }
  return null;
}

function findVoiceAsset(cue: string): VoiceAsset {
  const asset = firstRescueVoiceManifest.assets.find((candidate) => candidate.cue === cue);
  if (asset === undefined) {
    throw new Error(`Missing first-rescue voice asset: ${cue}`);
  }
  return asset;
}
