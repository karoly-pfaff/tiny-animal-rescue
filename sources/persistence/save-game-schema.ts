import type { Locale } from '../i18n/localization';

export type SaveGameV1 = Readonly<{
  completedMissionIds: readonly string[];
  createdAt: string;
  locale: Locale;
  schemaVersion: 1;
  settings: Readonly<{
    effectsVolume: number;
    musicVolume: number;
    narrationVolume: number;
    reducedMotion: boolean;
  }>;
  unlockedResidentIds: readonly string[];
  updatedAt: string;
  worldFlags: readonly string[];
}>;

export type SaveGameLoadStatus = 'ready' | 'recovered-corrupt' | 'unsupported-version';

export type SaveGameLoadResult =
  | Readonly<{ save: SaveGameV1; status: Exclude<SaveGameLoadStatus, 'unsupported-version'> }>
  | Readonly<{ save: null; status: Extract<SaveGameLoadStatus, 'unsupported-version'> }>;

type SaveGameV0 = Readonly<{
  completedMissionIds: readonly string[];
  locale: Locale;
  schemaVersion: 0;
  unlockedResidentIds: readonly string[];
  worldFlags: readonly string[];
}>;

const defaultSettings: SaveGameV1['settings'] = {
  effectsVolume: 1,
  musicVolume: 0.7,
  narrationVolume: 1,
  reducedMotion: false,
};

export const readySaveStatus = 'ready' satisfies SaveGameLoadStatus;
export const recoveredSaveStatus = 'recovered-corrupt' satisfies SaveGameLoadStatus;
const unsupportedSaveStatus = 'unsupported-version' satisfies SaveGameLoadStatus;

export function createEmptySave(locale: Locale, timestamp: string): SaveGameV1 {
  return {
    completedMissionIds: [],
    createdAt: timestamp,
    locale,
    schemaVersion: 1,
    settings: defaultSettings,
    unlockedResidentIds: [],
    updatedAt: timestamp,
    worldFlags: [],
  };
}

export function migrateSaveGame(value: unknown, timestamp: string): SaveGameLoadResult | null {
  if (!isRecord(value)) {
    return null;
  }
  const schemaVersion = value['schemaVersion'];
  if (isFutureVersion(schemaVersion)) {
    return { save: null, status: unsupportedSaveStatus };
  }
  return migrateKnownVersion(value, schemaVersion, timestamp);
}

function migrateKnownVersion(
  value: Record<string, unknown>,
  schemaVersion: unknown,
  timestamp: string,
): SaveGameLoadResult | null {
  if (schemaVersion === 1) {
    return isSaveGameV1(value) ? { save: value, status: readySaveStatus } : null;
  }
  return schemaVersion === 0 ? migrateVersionZero(value, timestamp) : null;
}

function migrateVersionZero(
  value: Record<string, unknown>,
  timestamp: string,
): SaveGameLoadResult | null {
  if (!isSaveGameV0(value)) {
    return null;
  }
  return {
    save: {
      ...createEmptySave(value.locale, timestamp),
      completedMissionIds: value.completedMissionIds,
      unlockedResidentIds: value.unlockedResidentIds,
      worldFlags: value.worldFlags,
    },
    status: readySaveStatus,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFutureVersion(value: unknown): boolean {
  return typeof value === 'number' && value > 1;
}

function isLocale(value: unknown): value is Locale {
  return value === 'hu' || value === 'en';
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSaveGameV0(value: Record<string, unknown>): value is SaveGameV0 {
  return hasValidProgress(value) && isLocale(value['locale']);
}

function isSaveGameV1(value: Record<string, unknown>): value is SaveGameV1 {
  return hasValidSaveMetadata(value) && hasValidProgress(value);
}

function hasValidProgress(value: Record<string, unknown>): boolean {
  return (
    isStringArray(value['completedMissionIds']) &&
    isStringArray(value['unlockedResidentIds']) &&
    isStringArray(value['worldFlags'])
  );
}

function hasValidSaveMetadata(value: Record<string, unknown>): boolean {
  return (
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string' &&
    isLocale(value['locale']) &&
    isSettings(value['settings'])
  );
}

function isSettings(value: unknown): value is SaveGameV1['settings'] {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value['effectsVolume'] === 'number' &&
    typeof value['musicVolume'] === 'number' &&
    typeof value['narrationVolume'] === 'number' &&
    typeof value['reducedMotion'] === 'boolean'
  );
}
