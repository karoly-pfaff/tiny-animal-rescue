import { describe, expect, it } from 'vitest';

import {
  createIndexedDbLocaleBootstrapRepository,
  createMemoryLocaleBootstrapRepository,
  parseLocaleBootstrapRecord,
} from '../../sources/persistence/locale-bootstrap-repository';

type FailureMode = 'abort' | 'get' | 'open' | 'transaction' | undefined;
type EventHandler = ((event: Event) => void) | null;

function createIndexedDbHarness(initialValue: unknown, failureMode?: FailureMode) {
  let storedValue = initialValue;
  let hasStore = false;
  let closeCount = 0;

  function createTransaction(): IDBTransaction {
    const transaction: {
      error: DOMException | null;
      onabort: EventHandler;
      oncomplete: EventHandler;
      onerror: EventHandler;
      objectStore: () => {
        get: () => IDBRequest<unknown>;
        put: (value: unknown) => IDBRequest<IDBValidKey>;
      };
    } = {
      error: null,
      onabort: null,
      oncomplete: null,
      onerror: null,
      objectStore: () => ({
        get: () => {
          const request: {
            error: DOMException | null;
            onerror: EventHandler;
            onsuccess: EventHandler;
            result: unknown;
          } = { error: null, onerror: null, onsuccess: null, result: storedValue };
          queueMicrotask(() => {
            if (failureMode === 'get') {
              request.onerror?.(new Event('error'));
            } else {
              request.onsuccess?.(new Event('success'));
            }
          });
          return request as unknown as IDBRequest<unknown>;
        },
        put: (value: unknown) => {
          storedValue = value;
          queueMicrotask(() => {
            if (failureMode === 'transaction') {
              transaction.onerror?.(new Event('error'));
            } else if (failureMode === 'abort') {
              transaction.onabort?.(new Event('abort'));
            } else {
              transaction.oncomplete?.(new Event('complete'));
            }
          });
          return {} as IDBRequest<IDBValidKey>;
        },
      }),
    };
    return transaction as unknown as IDBTransaction;
  }

  const database = {
    close: () => {
      closeCount += 1;
    },
    createObjectStore: () => {
      hasStore = true;
      return {} as IDBObjectStore;
    },
    objectStoreNames: { contains: () => hasStore },
    transaction: () => createTransaction(),
  } as unknown as IDBDatabase;
  const factory = {
    open: () => {
      const request: {
        error: DOMException | null;
        onerror: EventHandler;
        onsuccess: EventHandler;
        onupgradeneeded: EventHandler;
        result: IDBDatabase;
      } = {
        error: null,
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
        result: database,
      };
      queueMicrotask(() => {
        if (failureMode === 'open') {
          request.onerror?.(new Event('error'));
        } else {
          request.onupgradeneeded?.(new Event('upgradeneeded'));
          request.onsuccess?.(new Event('success'));
        }
      });
      return request as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;
  return { factory, getCloseCount: () => closeCount, getStoredValue: () => storedValue };
}

describe('locale bootstrap repository', () => {
  it.each([
    [{ locale: 'hu', schemaVersion: 1 }, 'hu'],
    [{ locale: 'en', schemaVersion: 1 }, 'en'],
    [{ locale: 'hu', schemaVersion: 2 }, null],
    [{ locale: 'de', schemaVersion: 1 }, null],
    ['corrupt', null],
    [null, null],
  ] as const)('parses versioned bootstrap data safely', (record, expected) => {
    expect(parseLocaleBootstrapRecord(record)).toBe(expected);
  });

  it('stores a selected locale behind the memory repository contract', async () => {
    const repository = createMemoryLocaleBootstrapRepository();
    expect(await repository.readLocale()).toBeNull();
    await repository.writeLocale('en');
    expect(await repository.readLocale()).toBe('en');
  });

  it('reads and writes a versioned IndexedDB record', async () => {
    const harness = createIndexedDbHarness({ locale: 'hu', schemaVersion: 1 });
    const repository = createIndexedDbLocaleBootstrapRepository(harness.factory);

    expect(await repository.readLocale()).toBe('hu');
    await repository.writeLocale('en');

    expect(harness.getStoredValue()).toEqual({ locale: 'en', schemaVersion: 1 });
    expect(harness.getCloseCount()).toBe(2);
  });

  it('degrades safely when IndexedDB is unavailable', async () => {
    const repository = createIndexedDbLocaleBootstrapRepository(undefined);
    expect(await repository.readLocale()).toBeNull();
    await expect(repository.writeLocale('hu')).rejects.toThrow('IndexedDB is unavailable.');
  });

  it.each(['open', 'get', 'transaction', 'abort'] as const)(
    'closes or rejects safely for an IndexedDB %s failure',
    async (failureMode) => {
      const harness = createIndexedDbHarness(null, failureMode);
      const repository = createIndexedDbLocaleBootstrapRepository(harness.factory);
      const operation =
        failureMode === 'open' || failureMode === 'get'
          ? repository.readLocale()
          : repository.writeLocale('hu');

      await expect(operation).rejects.toBeTruthy();
      expect(harness.getCloseCount()).toBe(failureMode === 'open' ? 0 : 1);
    },
  );
});
