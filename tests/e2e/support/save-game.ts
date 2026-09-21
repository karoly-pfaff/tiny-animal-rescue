import type { Page } from '@playwright/test';

const databaseName = 'tiny-rescue-save';
const primaryStoreName = 'save-games';
const recoveryStoreName = 'save-recovery';

function databaseError(error: DOMException | null): Error {
  return error ?? new Error('IndexedDB test operation failed.');
}

export async function writePrimarySave(page: Page, value: unknown): Promise<void> {
  await page.evaluate(
    async ({
      databaseName: name,
      primaryStoreName: storeName,
      recoveryStoreName: recovery,
      value,
    }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(storeName)) {
            request.result.createObjectStore(storeName);
          }
          if (!request.result.objectStoreNames.contains(recovery)) {
            request.result.createObjectStore(recovery);
          }
        };
        request.onerror = () => {
          reject(databaseError(request.error));
        };
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(storeName, 'readwrite');
          transaction.objectStore(storeName).put(value, 'primary');
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => {
            reject(databaseError(transaction.error));
          };
        };
      }),
    { databaseName, primaryStoreName, recoveryStoreName, value },
  );
}

export async function readPrimarySave(page: Page): Promise<unknown> {
  return page.evaluate(
    async ({ databaseName: name, primaryStoreName: storeName }) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onerror = () => {
          reject(databaseError(request.error));
        };
        request.onsuccess = () => {
          const database = request.result;
          const read = database.transaction(storeName).objectStore(storeName).get('primary');
          read.onsuccess = () => {
            database.close();
            resolve(read.result);
          };
          read.onerror = () => {
            reject(databaseError(read.error));
          };
        };
      }),
    { databaseName, primaryStoreName },
  );
}

export async function readRecoveryCount(page: Page): Promise<number> {
  return page.evaluate(
    async ({ databaseName: name, recoveryStoreName: storeName }) =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onerror = () => {
          reject(databaseError(request.error));
        };
        request.onsuccess = () => {
          const database = request.result;
          const count = database.transaction(storeName).objectStore(storeName).count();
          count.onsuccess = () => {
            database.close();
            resolve(count.result);
          };
          count.onerror = () => {
            reject(databaseError(count.error));
          };
        };
      }),
    { databaseName, recoveryStoreName },
  );
}
