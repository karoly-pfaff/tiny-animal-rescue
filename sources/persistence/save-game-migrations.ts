import type { Locale } from '../i18n/localization';
import { defaultSaveSettings } from './default-save-settings';

type SaveRecord = Record<string, unknown>;
type VersionedSaveRecord = SaveRecord & { schemaVersion: number };
type SequentialMigration = (value: SaveRecord, timestamp: string) => VersionedSaveRecord | null;

const versionZero = 0;
const sequentialMigrations: ReadonlyMap<number, SequentialMigration> = new Map([
  [versionZero, migrateVersionZeroToOne],
]);

export function applySequentialSaveMigrations(
  value: SaveRecord,
  timestamp: string,
  currentVersion: number,
): SaveRecord | null {
  const version = value['schemaVersion'];
  if (typeof version !== 'number') {
    return null;
  }
  return version === currentVersion
    ? value
    : migrateForward({ currentVersion, timestamp, value, version });
}

type MigrationRequest = Readonly<{
  currentVersion: number;
  timestamp: string;
  value: SaveRecord;
  version: number;
}>;

function migrateForward(request: MigrationRequest): SaveRecord | null {
  const migration = sequentialMigrations.get(request.version);
  if (migration === undefined) {
    return null;
  }
  const candidate = migration(request.value, request.timestamp);
  return candidate === null ? null : continueMigration(candidate, request);
}

function continueMigration(
  candidate: VersionedSaveRecord,
  request: MigrationRequest,
): SaveRecord | null {
  const { schemaVersion: version } = candidate;
  return version === request.currentVersion
    ? candidate
    : migrateForward({ ...request, value: candidate, version });
}

function migrateVersionZeroToOne(value: SaveRecord, timestamp: string): VersionedSaveRecord | null {
  if (!isVersionZeroSave(value)) {
    return null;
  }
  return {
    completedMissionIds: value['completedMissionIds'],
    createdAt: timestamp,
    locale: value.locale,
    schemaVersion: 1,
    settings: defaultSaveSettings,
    unlockedResidentIds: value['unlockedResidentIds'],
    updatedAt: timestamp,
    worldFlags: value['worldFlags'],
  };
}

function isVersionZeroSave(value: SaveRecord): value is SaveRecord & { locale: Locale } {
  return (
    value['schemaVersion'] === versionZero &&
    isLocale(value['locale']) &&
    isStringArray(value['completedMissionIds']) &&
    isStringArray(value['unlockedResidentIds']) &&
    isStringArray(value['worldFlags'])
  );
}

function isLocale(value: unknown): value is Locale {
  return value === 'hu' || value === 'en';
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
