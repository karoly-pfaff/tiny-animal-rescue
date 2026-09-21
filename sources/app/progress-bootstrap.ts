import { useCallback, useEffect, useState } from 'react';

import type { Locale } from '../i18n/localization';
import type {
  FirstRescueProgressLoadStatus,
  FirstRescueProgressStore,
} from './first-rescue-progress';

export type ProgressBootstrapStatus = FirstRescueProgressLoadStatus | 'loading' | 'storage-error';

export type ProgressBootstrap = Readonly<{
  retry: () => void;
  status: ProgressBootstrapStatus;
}>;

const loadingStatus = 'loading' satisfies ProgressBootstrapStatus;
const storageErrorStatus = 'storage-error' satisfies ProgressBootstrapStatus;

export function useProgressBootstrap(
  store: FirstRescueProgressStore,
  locale: Locale | null | undefined,
): ProgressBootstrap {
  const [status, setStatus] = useState<ProgressBootstrapStatus>(loadingStatus);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setStatus(loadingStatus);
    setAttempt((current) => current + 1);
  }, []);
  useEffect(() => {
    let active = true;
    if (locale === undefined || locale === null) {
      return undefined;
    }
    void store.load(locale).then(
      (nextStatus) => {
        if (active) {
          setStatus(nextStatus);
        }
      },
      () => {
        if (active) {
          setStatus(storageErrorStatus);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, locale, store]);
  return { retry, status };
}
