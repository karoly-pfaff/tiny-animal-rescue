import { requestResult, transactionDone } from './indexed-db-helpers';
import { migrateSaveGame, type SaveGameV1 } from './save-game-schema';

export type StoredRecord =
  Readonly<{ present: false }> | Readonly<{ present: true; value: unknown }>;

type PersistenceKey = string;
type RecoveryOptions = Readonly<{
  factory: IDBFactory;
  recoveryKey: string;
  save: SaveGameV1;
}>;

const databaseName = 'tiny-rescue-save' satisfies PersistenceKey;
const databaseVersion = 1;
const primaryRecordKey = 'primary' satisfies PersistenceKey;
const primaryStoreName = 'save-games' satisfies PersistenceKey;
const recoveryStoreName = 'save-recovery' satisfies PersistenceKey;
const writeMode = 'readwrite' satisfies IDBTransactionMode;

export async function readPrimarySave(factory: IDBFactory): Promise<StoredRecord> {
  const database = await openDatabase(factory);
  try {
    return await readStoredRecord(
      database.transaction(primaryStoreName).objectStore(primaryStoreName),
    );
  } finally {
    database.close();
  }
}

export async function writePrimarySave(factory: IDBFactory, save: SaveGameV1): Promise<void> {
  const database = await openDatabase(factory);
  try {
    const transaction = database.transaction(primaryStoreName, writeMode);
    transaction.objectStore(primaryStoreName).put(save, primaryRecordKey);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function recoverCorruptSave(options: RecoveryOptions): Promise<void> {
  const database = await openDatabase(options.factory);
  try {
    await recoverInTransaction(database, options);
  } finally {
    database.close();
  }
}

async function recoverInTransaction(
  database: IDBDatabase,
  options: RecoveryOptions,
): Promise<void> {
  const transaction = database.transaction([primaryStoreName, recoveryStoreName], writeMode);
  const completion = transactionDone(transaction);
  const primary = transaction.objectStore(primaryStoreName);
  const stored = await readStoredRecord(primary);
  if (!isExpectedCorruptRecord(stored, options)) {
    return await abortRecovery(transaction, completion);
  }
  transaction.objectStore(recoveryStoreName).put(stored.value, options.recoveryKey);
  primary.put(options.save, primaryRecordKey);
  await completion;
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

function isExpectedCorruptRecord(
  stored: StoredRecord,
  options: RecoveryOptions,
): stored is Extract<StoredRecord, { present: true }> {
  return stored.present && migrateSaveGame(stored.value, options.recoveryKey) === null;
}

async function abortRecovery(
  transaction: IDBTransaction,
  completion: Promise<void>,
): Promise<never> {
  transaction.abort();
  await completion.catch(() => undefined);
  throw new Error('Save data changed before recovery; reload before choosing again.');
}

async function readStoredRecord(store: IDBObjectStore): Promise<StoredRecord> {
  const countRequest = store.count(primaryRecordKey);
  const valueRequest = store.get(primaryRecordKey);
  const countPromise: Promise<number> = requestResult(countRequest);
  const valuePromise: Promise<unknown> = requestResult(valueRequest);
  const results = await Promise.all([countPromise, valuePromise] as const);
  const count = results[0];
  const value = results[1];
  return count === 0 ? { present: false } : { present: true, value };
}
