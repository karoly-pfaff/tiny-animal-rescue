import type { Locale } from '../i18n/localization';
import { defaultSaveSettings } from './default-save-settings';
import { isPersistedCurrentMission, type PersistedCurrentMission } from './persisted-mission-state';
import { applySequentialSaveMigrations } from './save-game-migrations';

export type SaveGameV1 = Readonly<{
  completedMissionIds: readonly string[];
  createdAt: string;
  currentMission?: PersistedCurrentMission;
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

export type SaveGameLoadStatus = 'corrupt' | 'ready' | 'unsupported-version';

export type SaveGameLoadResult =
  | Readonly<{ save: SaveGameV1; status: Extract<SaveGameLoadStatus, 'ready'> }>
  | Readonly<{ save: null; status: Exclude<SaveGameLoadStatus, 'ready'> }>;

export const readySaveStatus = 'ready' satisfies SaveGameLoadStatus;
export const corruptSaveStatus = 'corrupt' satisfies SaveGameLoadStatus;
const unsupportedSaveStatus = 'unsupported-version' satisfies SaveGameLoadStatus;
const currentSaveVersion = 1;

export function createEmptySave(locale: Locale, timestamp: string): SaveGameV1 {
  return {
    completedMissionIds: [],
    createdAt: timestamp,
    locale,
    schemaVersion: 1,
    settings: defaultSaveSettings,
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
  const migrated = applySequentialSaveMigrations(value, timestamp, currentSaveVersion);
  return migrated !== null && isSaveGameV1(migrated)
    ? { save: migrated, status: readySaveStatus }
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFutureVersion(value: unknown): boolean {
  return typeof value === 'number' && value > currentSaveVersion;
}

function isLocale(value: unknown): value is Locale {
  return value === 'hu' || value === 'en';
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSaveGameV1(value: Record<string, unknown>): value is SaveGameV1 {
  return (
    hasValidSaveMetadata(value) &&
    hasValidProgress(value) &&
    (value['currentMission'] === undefined || isPersistedCurrentMission(value['currentMission']))
  );
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
