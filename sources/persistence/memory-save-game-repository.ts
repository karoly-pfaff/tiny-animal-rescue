import type { Locale } from '../i18n/localization';
import type { SaveGameRepository } from './save-game-repository';
import { createEmptySave, readySaveStatus, type SaveGameV1 } from './save-game-schema';
import { createSerializedTaskQueue } from './serialized-task-queue';

export function createMemorySaveGameRepository(
  initialSave: SaveGameV1 | null = null,
  now: () => string = () => new Date().toISOString(),
): SaveGameRepository {
  let loaded = false;
  let save = initialSave;
  const writes = createSerializedTaskQueue();
  const requireLoaded = () => {
    if (!loaded || save === null) {
      throw new Error('Save data must load successfully before it can be updated.');
    }
    return save;
  };
  const persist = (nextSave: SaveGameV1) => {
    save = nextSave;
    return Promise.resolve(nextSave);
  };
  return {
    load(locale) {
      return writes.run(() => {
        save ??= createEmptySave(locale, now());
        loaded = true;
        return Promise.resolve({ save, status: readySaveStatus });
      });
    },
    recover() {
      return Promise.reject(new Error('No corrupt save is awaiting recovery.'));
    },
    replace(nextSave) {
      return writes.run(() => {
        requireLoaded();
        return persist(nextSave);
      });
    },
    reset(locale: Locale) {
      return writes.run(() => {
        requireLoaded();
        return persist(createEmptySave(locale, now()));
      });
    },
    transaction(locale, transform) {
      return writes.run(() => {
        const current = requireLoaded();
        return persist(transform({ ...current, locale, updatedAt: now() }));
      });
    },
  };
}
