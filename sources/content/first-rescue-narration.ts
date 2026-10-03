import voiceCopy from '../../content/base/assets/first-rescue-voice-copy.json';
import type { Locale } from '../i18n/localization';

export type FirstRescueNarrationCue =
  | 'voice.mission.garden-kitten-tree.step.place-ladder'
  | 'voice.mission.garden-kitten-tree.step.help-mimi-down'
  | 'voice.mission.garden-kitten-tree.success'
  | 'voice.shelter.indoor-room.name'
  | 'voice.shelter.shelter-garden.name'
  | 'voice.shelter.pondside.name'
  | 'voice.resident.mimi-kitten.name';

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
  if (!hasMaterializedAssets(import.meta.env.VITE_MATERIALIZED_ASSETS)) {
    return null;
  }
  const asset = findProductionVoiceAsset(cue);
  if (asset === null) {
    return null;
  }
  if (asset.fallbackText[_locale].length === 0) {
    throw new Error(`Missing localized first-rescue voice fallback: ${cue}`);
  }
  return null;
}

function hasMaterializedAssets(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  if (value === 'true') {
    return true;
  }
  throw new Error('VITE_MATERIALIZED_ASSETS must be exactly true when it is defined.');
}

function findProductionVoiceAsset(cue: string): VoiceAsset | null {
  const asset = findOptionalVoiceAsset(cue);
  if (asset !== undefined) {
    return asset;
  }
  if (isContentOwnedNameCue(cue)) {
    return null;
  }
  throw new Error(`Missing first-rescue voice asset: ${cue}`);
}

function findVoiceAsset(cue: string): VoiceAsset {
  return requiredVoiceAsset(findOptionalVoiceAsset(cue), cue);
}

function findOptionalVoiceAsset(cue: string): VoiceAsset | undefined {
  return firstRescueVoiceManifest.assets.find((candidate) => candidate.cue === cue);
}

function requiredVoiceAsset(asset: VoiceAsset | undefined, cue: string): VoiceAsset {
  if (asset !== undefined) {
    return asset;
  }
  throw new Error(`Missing first-rescue voice asset: ${cue}`);
}

function isContentOwnedNameCue(cue: string): boolean {
  return /^voice\.(?:resident|shelter)\.[a-z0-9]+(?:-[a-z0-9]+)*\.name$/u.test(cue);
}
