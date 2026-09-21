import voiceManifest from '../../content/base/assets/voice-manifest.json';
import type { Locale } from '../i18n/localization';

export type FirstRescueNarrationCue =
  | 'voice.mission.garden-kitten-tree.step.place-ladder'
  | 'voice.mission.garden-kitten-tree.step.help-mimi-down'
  | 'voice.mission.garden-kitten-tree.success';

type VoiceAsset = Readonly<{
  cue: string;
  fallbackText: Readonly<Record<Locale, string>>;
  objectKeys: Readonly<Record<Locale, string>>;
}>;

type VoiceManifest = Readonly<{
  assets: readonly VoiceAsset[];
}>;

const firstRescueVoiceManifest = voiceManifest satisfies VoiceManifest;

export function getFirstRescueNarrationText(cue: FirstRescueNarrationCue, locale: Locale): string {
  return findVoiceAsset(cue).fallbackText[locale];
}

export function resolveFirstRescueNarration(
  cue: FirstRescueNarrationCue,
  locale: Locale,
): string | null {
  const assetBaseUrl = import.meta.env.VITE_ASSET_BASE_URL;
  if (assetBaseUrl === undefined) {
    return null;
  }
  const objectKey = findVoiceAsset(cue).objectKeys[locale];
  return `${assetBaseUrl.replace(/\/$/u, '')}/${objectKey}`;
}

function findVoiceAsset(cue: FirstRescueNarrationCue): VoiceAsset {
  const asset = firstRescueVoiceManifest.assets.find((candidate) => candidate.cue === cue);
  if (asset === undefined) {
    throw new Error(`Missing first-rescue voice asset: ${cue}`);
  }
  return asset;
}
