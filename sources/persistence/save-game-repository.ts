import type { Locale } from '../i18n/localization';
import { requestResult, transactionDone } from './indexed-db-helpers';
import {
  createEmptySave,
  migrateSaveGame,
  readySaveStatus,
  recoveredSaveStatus,
  type SaveGameLoadResult,
  type SaveGameV1,
} from './save-game-schema';

export type { SaveGameV1 } from './save-game-schema';

export type SaveGameRepository = Readonly<{
  load: (locale: Locale) => Promise<SaveGameLoadResult>;
  update: (locale: Locale, transform: (save: SaveGameV1) => SaveGameV1) => Promise<SaveGameV1>;
}>;

type PersistenceKey = string;
type RepositoryState = Readonly<{
  currentSave: SaveGameV1 | null;
  loaded: boolean;
  loadResult: SaveGameLoadResult;
  pendingCorruptValue?: unknown;
  unsupportedVersion: boolean;
}>;

const databaseName = 'tiny-rescue-save' satisfies PersistenceKey;
const databaseVersion = 1;
const primaryRecordKey = 'primary' satisfies PersistenceKey;
const primaryStoreName = 'save-games' satisfies PersistenceKey;
const recoveryStoreName = 'save-recovery' satisfies PersistenceKey;
const writeMode = 'readwrite' satisfies IDBTransactionMode;
const defaultLocale = 'hu' satisfies Locale;

export function createIndexedDbSaveGameRepository(
  factory: IDBFactory | undefined,
  now: () => string = () => new Date().toISOString(),
): SaveGameRepository {
  let state: RepositoryState = {
    currentSave: null,
    loaded: false,
    loadResult: { save: createEmptySave(defaultLocale, now()), status: readySaveStatus },
    unsupportedVersion: false,
  };

  return {
    async load(locale) {
      state = notLoadedState(locale, now());
      state = await loadRepositoryState(factory, locale, now);
      return state.loadResult;
    },
    async update(locale, transform) {
      assertWritable(factory, state);
      const base = state.currentSave ?? createEmptySave(locale, now());
      const updated = transform({ ...base, locale, updatedAt: now() });
      await writeSave({
        corruptValue: state.pendingCorruptValue,
        factory,
        recoveryKey: now(),
        save: updated,
      });
      state = {
        currentSave: updated,
        loaded: true,
        loadResult: { save: updated, status: readySaveStatus },
        unsupportedVersion: false,
      };
      return updated;
    },
  };
}

function assertWritable(
  factory: IDBFactory | undefined,
  state: RepositoryState,
): asserts factory is IDBFactory {
  if (factory === undefined) {
    throw new Error('IndexedDB is unavailable.');
  }
  if (!state.loaded) {
    throw new Error('Save data must load successfully before it can be updated.');
  }
  if (state.unsupportedVersion) {
    throw new Error('A newer save version cannot be overwritten.');
  }
}

async function loadRepositoryState(
  factory: IDBFactory | undefined,
  locale: Locale,
  now: () => string,
): Promise<RepositoryState> {
  if (factory === undefined) {
    throw new Error('IndexedDB is unavailable.');
  }
  const rawValue = await readPrimarySave(factory);
  if (rawValue === undefined) {
    return readyState(createEmptySave(locale, now()));
  }
  const migrated = migrateSaveGame(rawValue, now());
  if (migrated === null) {
    return recoveredState(locale, now(), rawValue);
  }
  return migrated.status === 'unsupported-version'
    ? { currentSave: null, loaded: true, loadResult: migrated, unsupportedVersion: true }
    : readyState(migrated.save);
}

function readyState(save: SaveGameV1): RepositoryState {
  return {
    currentSave: save,
    loaded: true,
    loadResult: { save, status: readySaveStatus },
    unsupportedVersion: false,
  };
}

function recoveredState(
  locale: Locale,
  timestamp: string,
  pendingCorruptValue: unknown,
): RepositoryState {
  const save = createEmptySave(locale, timestamp);
  return {
    currentSave: save,
    loaded: true,
    loadResult: { save, status: recoveredSaveStatus },
    pendingCorruptValue,
    unsupportedVersion: false,
  };
}

function notLoadedState(locale: Locale, timestamp: string): RepositoryState {
  return {
    currentSave: null,
    loaded: false,
    loadResult: { save: createEmptySave(locale, timestamp), status: readySaveStatus },
    unsupportedVersion: false,
  };
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(primaryStoreName)) {
        request.result.createObjectStore(primaryStoreName);
      }
      if (!request.result.objectStoreNames.contains(recoveryStoreName)) {
        request.result.createObjectStore(recoveryStoreName);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB open failed.'));
    };
  });
}

async function readPrimarySave(factory: IDBFactory): Promise<unknown> {
  const database = await openDatabase(factory);
  try {
    return await requestResult(
      database.transaction(primaryStoreName).objectStore(primaryStoreName).get(primaryRecordKey),
    );
  } finally {
    database.close();
  }
}

type WriteSaveOptions = Readonly<{
  corruptValue: unknown;
  factory: IDBFactory;
  recoveryKey: string;
  save: SaveGameV1;
}>;

async function writeSave({
  corruptValue,
  factory,
  recoveryKey,
  save,
}: WriteSaveOptions): Promise<void> {
  const database = await openDatabase(factory);
  try {
    const transaction = database.transaction([primaryStoreName, recoveryStoreName], writeMode);
    if (corruptValue !== undefined) {
      transaction.objectStore(recoveryStoreName).put(corruptValue, recoveryKey);
    }
    transaction.objectStore(primaryStoreName).put(save, primaryRecordKey);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}
