import type { Locale } from '../i18n/localization';

export type LocaleBootstrapRepository = Readonly<{
  readLocale: () => Promise<Locale | null>;
  writeLocale: (locale: Locale) => Promise<void>;
}>;

type LocaleBootstrapRecord = Readonly<{
  locale: Locale;
  schemaVersion: 1;
}>;

type PersistenceKey = string;

const databaseName = 'tiny-rescue-bootstrap' satisfies PersistenceKey;
const databaseVersion = 1;
const recordKey = 'locale' satisfies PersistenceKey;
const storeName = 'settings-hints' satisfies PersistenceKey;
const writeMode = 'readwrite' satisfies IDBTransactionMode;

function isLocale(value: unknown): value is Locale {
  return value === 'hu' || value === 'en';
}

export function parseLocaleBootstrapRecord(value: unknown): Locale | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const candidate = value as Partial<LocaleBootstrapRecord>;
  return candidate.schemaVersion === 1 && isLocale(candidate.locale) ? candidate.locale : null;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    };
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB write failed.'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB write aborted.'));
    };
  });
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName);
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

export function createIndexedDbLocaleBootstrapRepository(
  factory: IDBFactory | undefined,
): LocaleBootstrapRepository {
  return {
    async readLocale() {
      if (factory === undefined) {
        return null;
      }
      const database = await openDatabase(factory);
      try {
        const request = database.transaction(storeName).objectStore(storeName).get(recordKey);
        return parseLocaleBootstrapRecord(await requestResult(request));
      } finally {
        database.close();
      }
    },
    async writeLocale(locale) {
      if (factory === undefined) {
        throw new Error('IndexedDB is unavailable.');
      }
      const database = await openDatabase(factory);
      try {
        const transaction = database.transaction(storeName, writeMode);
        transaction.objectStore(storeName).put({ locale, schemaVersion: 1 }, recordKey);
        await transactionDone(transaction);
      } finally {
        database.close();
      }
    },
  };
}

export function createMemoryLocaleBootstrapRepository(
  initialLocale: Locale | null = null,
): LocaleBootstrapRepository {
  let locale = initialLocale;
  return {
    readLocale: () => Promise.resolve(locale),
    writeLocale: (nextLocale) => {
      locale = nextLocale;
      return Promise.resolve();
    },
  };
}
