import type { Locale } from '../i18n/localization';
import { readPrimarySave, recoverCorruptSave, writePrimarySave } from './indexed-db-save-storage';
import {
  createEmptySave,
  corruptSaveStatus,
  migrateSaveGame,
  readySaveStatus,
  type SaveGameLoadResult,
  type SaveGameV1,
} from './save-game-schema';
import { createSerializedTaskQueue } from './serialized-task-queue';

export { createMemorySaveGameRepository } from './memory-save-game-repository';
export type { SaveGameV1 } from './save-game-schema';

export type SaveGameRepository = Readonly<{
  load: (locale: Locale) => Promise<SaveGameLoadResult>;
  recover: (locale: Locale) => Promise<SaveGameV1>;
  replace: (save: SaveGameV1) => Promise<SaveGameV1>;
  reset: (locale: Locale) => Promise<SaveGameV1>;
  transaction: (locale: Locale, transform: (save: SaveGameV1) => SaveGameV1) => Promise<SaveGameV1>;
}>;

type RepositoryState = Readonly<{
  currentSave: SaveGameV1 | null;
  loaded: boolean;
  loadResult: SaveGameLoadResult;
  recoveryRequired: boolean;
  unsupportedVersion: boolean;
}>;

const defaultLocale = 'hu' satisfies Locale;

type SaveWriter = (save: SaveGameV1, writableFactory: IDBFactory) => Promise<SaveGameV1>;

export function createIndexedDbSaveGameRepository(
  factory: IDBFactory | undefined,
  now: () => string = () => new Date().toISOString(),
): SaveGameRepository {
  let state: RepositoryState = {
    currentSave: null,
    loaded: false,
    loadResult: { save: createEmptySave(defaultLocale, now()), status: readySaveStatus },
    recoveryRequired: false,
    unsupportedVersion: false,
  };
  const writes = createSerializedTaskQueue();

  const persist: SaveWriter = async (save, writableFactory) => {
    await writePrimarySave(writableFactory, save);
    state = readyState(save);
    return save;
  };

  return {
    load(locale) {
      return writes.run(async () => {
        state = notLoadedState(locale, now());
        state = await loadRepositoryState(factory, locale, now);
        return state.loadResult;
      });
    },
    replace(save) {
      return writes.run(() => persist(save, requiredWritableFactory(factory, state)));
    },
    recover(locale) {
      return writes.run(async () => {
        const writableFactory = requiredRecoveryFactory(factory, state);
        const save = createEmptySave(locale, now());
        await recoverCorruptSave({
          factory: writableFactory,
          recoveryKey: now(),
          save,
        });
        state = readyState(save);
        return save;
      });
    },
    reset(locale) {
      return writes.run(() =>
        persist(createEmptySave(locale, now()), requiredWritableFactory(factory, state)),
      );
    },
    transaction(locale, transform) {
      return writes.run(() => {
        const writableFactory = requiredWritableFactory(factory, state);
        const base = state.currentSave ?? createEmptySave(locale, now());
        return persist(transform({ ...base, locale, updatedAt: now() }), writableFactory);
      });
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
  if (state.recoveryRequired) {
    throw new Error('Corrupt save data requires an explicit recovery choice.');
  }
}

function requiredRecoveryFactory(
  factory: IDBFactory | undefined,
  state: RepositoryState,
): IDBFactory {
  if (factory === undefined) {
    throw new Error('IndexedDB is unavailable.');
  }
  if (!state.loaded || !state.recoveryRequired) {
    throw new Error('No corrupt save is awaiting recovery.');
  }
  return factory;
}

function requiredWritableFactory(
  factory: IDBFactory | undefined,
  state: RepositoryState,
): IDBFactory {
  assertWritable(factory, state);
  return factory;
}

async function loadRepositoryState(
  factory: IDBFactory | undefined,
  locale: Locale,
  now: () => string,
): Promise<RepositoryState> {
  if (factory === undefined) {
    throw new Error('IndexedDB is unavailable.');
  }
  const stored = await readPrimarySave(factory);
  return !stored.present
    ? readyState(createEmptySave(locale, now()))
    : repositoryStateFromRaw(stored.value, now);
}

function repositoryStateFromRaw(rawValue: unknown, now: () => string): RepositoryState {
  const migrated = migrateSaveGame(rawValue, now());
  if (migrated === null) {
    return corruptState();
  }
  if (migrated.status === 'ready') {
    return readyState(migrated.save);
  }
  return {
    currentSave: null,
    loaded: true,
    loadResult: migrated,
    recoveryRequired: false,
    unsupportedVersion: true,
  };
}

function readyState(save: SaveGameV1): RepositoryState {
  return {
    currentSave: save,
    loaded: true,
    loadResult: { save, status: readySaveStatus },
    recoveryRequired: false,
    unsupportedVersion: false,
  };
}

function corruptState(): RepositoryState {
  return {
    currentSave: null,
    loaded: true,
    loadResult: { save: null, status: corruptSaveStatus },
    recoveryRequired: true,
    unsupportedVersion: false,
  };
}

function notLoadedState(locale: Locale, timestamp: string): RepositoryState {
  return {
    currentSave: null,
    loaded: false,
    loadResult: { save: createEmptySave(locale, timestamp), status: readySaveStatus },
    recoveryRequired: false,
    unsupportedVersion: false,
  };
}
