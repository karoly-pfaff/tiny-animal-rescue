type IndexedDbFailureMode = 'abort' | 'get' | 'open' | 'transaction' | undefined;

type EventHandler = ((event: Event) => void) | null;
type HarnessOptions = Readonly<{
  failureMode?: IndexedDbFailureMode;
  records?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}>;

export function createIndexedDbHarness(options: HarnessOptions = {}) {
  const stores = new Map<string, Map<string, unknown>>(
    Object.entries(options.records ?? {}).map(([storeName, records]) => [
      storeName,
      new Map(Object.entries(records)),
    ]),
  );
  let closeCount = 0;

  function createTransaction(): IDBTransaction {
    let completionScheduled = false;
    const transaction: {
      error: DOMException | null;
      onabort: EventHandler;
      oncomplete: EventHandler;
      onerror: EventHandler;
      objectStore: (storeName: string) => IDBObjectStore;
    } = {
      error: null,
      onabort: null,
      oncomplete: null,
      onerror: null,
      objectStore: (storeName) => createObjectStoreApi(storeName, transaction),
    };

    function scheduleCompletion(): void {
      if (completionScheduled) {
        return;
      }
      completionScheduled = true;
      queueMicrotask(() => {
        if (options.failureMode === 'transaction') {
          transaction.onerror?.(new Event('error'));
        } else if (options.failureMode === 'abort') {
          transaction.onabort?.(new Event('abort'));
        } else {
          transaction.oncomplete?.(new Event('complete'));
        }
      });
    }

    function createObjectStoreApi(storeName: string, owner: typeof transaction): IDBObjectStore {
      const values = stores.get(storeName) ?? new Map<string, unknown>();
      stores.set(storeName, values);
      return {
        get: (key: IDBValidKey) => {
          const request = createRequest(values.get(toStringKey(key)));
          queueMicrotask(() => {
            if (options.failureMode === 'get') {
              request.onerror?.(new Event('error'));
            } else {
              request.onsuccess?.(new Event('success'));
            }
          });
          return request as IDBRequest<unknown>;
        },
        put: (value: unknown, key?: IDBValidKey) => {
          values.set(toStringKey(key), value);
          scheduleCompletion();
          return createRequest(key) as IDBRequest<IDBValidKey>;
        },
        transaction: owner,
      } as unknown as IDBObjectStore;
    }

    return transaction as unknown as IDBTransaction;
  }

  const database = {
    close: () => {
      closeCount += 1;
    },
    createObjectStore: (storeName: string) => {
      stores.set(storeName, new Map());
      return {} as IDBObjectStore;
    },
    objectStoreNames: { contains: (storeName: string) => stores.has(storeName) },
    transaction: () => createTransaction(),
  } as unknown as IDBDatabase;
  const factory = {
    open: () => {
      const request = createRequest(database) as unknown as {
        error: DOMException | null;
        onerror: EventHandler;
        onsuccess: EventHandler;
        onupgradeneeded: EventHandler;
        result: IDBDatabase;
      };
      request.onupgradeneeded = null;
      queueMicrotask(() => {
        if (options.failureMode === 'open') {
          request.onerror?.(new Event('error'));
        } else {
          request.onupgradeneeded?.(new Event('upgradeneeded'));
          request.onsuccess?.(new Event('success'));
        }
      });
      return request as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;

  return {
    factory,
    getCloseCount: () => closeCount,
    getStoreValues: (storeName: string) => [...(stores.get(storeName)?.values() ?? [])],
    getValue: (storeName: string, key: string) => stores.get(storeName)?.get(key),
  };
}

function createRequest<Result>(result: Result): {
  error: DOMException | null;
  onerror: EventHandler;
  onsuccess: EventHandler;
  result: Result;
} {
  return {
    error: null,
    onerror: null,
    onsuccess: null,
    result,
  };
}

function toStringKey(key: IDBValidKey | undefined): string {
  if (typeof key !== 'string') {
    throw new TypeError('The IndexedDB test harness supports string keys only.');
  }
  return key;
}
