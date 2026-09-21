import type { Locale } from '../i18n/localization';

export type FirstRescueNarrationCue =
  | 'voice.mission.garden-kitten-tree.step.help-mimi-down'
  | 'voice.mission.garden-kitten-tree.success';

type NarrationObjectKey = `audio/voice/${Locale}/missions/garden-kitten-tree/${string}.ogg`;
type NarrationFilename = 'step-help-mimi-down.ogg' | 'success.ogg';

const helpMimiCue =
  'voice.mission.garden-kitten-tree.step.help-mimi-down' satisfies FirstRescueNarrationCue;
const successCue = 'voice.mission.garden-kitten-tree.success' satisfies FirstRescueNarrationCue;
const helpMimiFilename = 'step-help-mimi-down.ogg' satisfies NarrationFilename;
const successFilename = 'success.ogg' satisfies NarrationFilename;

const filenameByCue: Readonly<Record<FirstRescueNarrationCue, NarrationFilename>> = {
  [helpMimiCue]: helpMimiFilename,
  [successCue]: successFilename,
};

export function resolveFirstRescueNarration(
  cue: FirstRescueNarrationCue,
  locale: Locale,
): string | null {
  const assetBaseUrl = import.meta.env.VITE_ASSET_BASE_URL;
  if (assetBaseUrl === undefined) {
    return null;
  }
  const objectKey =
    `audio/voice/${locale}/missions/garden-kitten-tree/${filenameByCue[cue]}` satisfies NarrationObjectKey;
  return `${assetBaseUrl.replace(/\/$/u, '')}/${objectKey}`;
}
