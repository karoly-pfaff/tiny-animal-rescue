import { useEffect, useState } from 'react';

import { deferredBrowserEffectService, type EffectService } from '../audio/effect-service';
import { createBrowserNarrationService, type NarrationService } from '../audio/narration-service';
import { bundledContentRegistry } from '../content/bundled-content-registry';
import type { ContentRegistry } from '../content/content-registry';
import {
  createIndexedDbLocaleBootstrapRepository,
  type LocaleBootstrapRepository,
} from '../persistence/locale-bootstrap-repository';
import { createIndexedDbSaveGameRepository } from '../persistence/save-game-repository';
import { getStrings, type Locale } from '../i18n/localization';
import {
  createPersistedFirstRescueProgressStore,
  type FirstRescueProgressStore,
} from './first-rescue-progress';
import { FoundationScreen } from './foundation-screen';
import { type ProgressBootstrapStatus, useProgressBootstrap } from './progress-bootstrap';
import { ReadyAppRoute } from './ready-app-route';
import { resolveRoute } from './routes';
import { SaveFailureScreen } from './save-failure-screen';
import { SaveRecoveryScreen } from './save-recovery-screen';
import { StartScreen } from './start-screen';

const foundationLocale = 'hu' satisfies Locale;
const browserLocaleRepository = createIndexedDbLocaleBootstrapRepository(window.indexedDB);
const browserNarrationService = createBrowserNarrationService();
const browserProgressStore = createPersistedFirstRescueProgressStore(
  createIndexedDbSaveGameRepository(window.indexedDB),
);

function getHashPath(): string {
  const path = window.location.hash.slice(1);
  return path === '' ? '/' : path;
}

function useHashPath(): string {
  const [path, setPath] = useState(getHashPath);

  useEffect(() => {
    const updatePath = () => {
      setPath(getHashPath());
    };
    window.addEventListener('hashchange', updatePath);
    return () => {
      window.removeEventListener('hashchange', updatePath);
    };
  }, []);

  return path;
}

function useLocaleBootstrap(repository: LocaleBootstrapRepository) {
  const [locale, setLocale] = useState<Locale | null | undefined>();
  const [localeSaving, setLocaleSaving] = useState(false);
  const [localeSaveFailed, setLocaleSaveFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void repository.readLocale().then(
      (storedLocale) => {
        if (active) {
          setLocale(storedLocale);
        }
      },
      () => {
        if (active) {
          setLocale(null);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [repository]);

  async function persistLocale(nextLocale: Locale): Promise<void> {
    setLocaleSaving(true);
    setLocaleSaveFailed(false);
    try {
      await repository.writeLocale(nextLocale);
      setLocale(nextLocale);
    } catch {
      setLocaleSaveFailed(true);
    } finally {
      setLocaleSaving(false);
    }
  }

  function selectLocale(nextLocale: Locale): void {
    void persistLocale(nextLocale);
  }

  async function clearLocale(): Promise<void> {
    setLocaleSaving(true);
    setLocaleSaveFailed(false);
    try {
      await repository.clearLocale();
      setLocale(null);
    } catch (cause) {
      setLocaleSaveFailed(true);
      throw cause;
    } finally {
      setLocaleSaving(false);
    }
  }

  return { clearLocale, locale, localeSaveFailed, localeSaving, selectLocale };
}

function navigate(nextPath: string): void {
  window.location.hash = nextPath;
}

type AppProps = Readonly<{
  contentRegistry?: ContentRegistry;
  effectService?: EffectService;
  firstRescueProgressStore?: FirstRescueProgressStore;
  localeRepository?: LocaleBootstrapRepository;
  narrationService?: NarrationService;
}>;

const browserAppDependencies: Required<AppProps> = {
  contentRegistry: bundledContentRegistry,
  effectService: deferredBrowserEffectService,
  firstRescueProgressStore: browserProgressStore,
  localeRepository: browserLocaleRepository,
  narrationService: browserNarrationService,
};

function shouldShowStart(locale: Locale | null | undefined, routeId: string): boolean {
  return locale === undefined || locale === null || routeId === 'start';
}

type BlockingProgressStatus = Extract<
  ProgressBootstrapStatus,
  'corrupt' | 'loading' | 'storage-error' | 'unsupported-version'
>;

function isProgressBlocked(status: ProgressBootstrapStatus): status is BlockingProgressStatus {
  return status !== 'ready';
}

function ProgressBoundary({
  locale,
  onRecoverCorrupt,
  onRetry,
  route,
  status,
}: Readonly<{
  locale: Locale;
  onRecoverCorrupt: () => void;
  onRetry: () => void;
  route: ReturnType<typeof resolveRoute>;
  status: BlockingProgressStatus;
}>) {
  if (status === 'loading') {
    return <FoundationScreen locale={locale} route={route} />;
  }
  if (status === 'storage-error') {
    return <SaveFailureScreen locale={locale} onRetry={onRetry} />;
  }
  return (
    <SaveRecoveryScreen
      locale={locale}
      onRecoverCorrupt={onRecoverCorrupt}
      onRetry={onRetry}
      status={status}
    />
  );
}

export function App(props: AppProps) {
  return <AppWithDependencies {...browserAppDependencies} {...props} />;
}

function AppWithDependencies({
  contentRegistry,
  effectService,
  firstRescueProgressStore,
  localeRepository,
  narrationService,
}: Required<AppProps>) {
  const path = useHashPath();
  const { clearLocale, locale, localeSaveFailed, localeSaving, selectLocale } =
    useLocaleBootstrap(localeRepository);
  const progressBootstrap = useProgressBootstrap(firstRescueProgressStore, locale),
    activeLocale = locale ?? foundationLocale,
    route = resolveRoute(path);

  useEffect(() => {
    document.documentElement.lang = activeLocale;
    document.title = getStrings(activeLocale).appTitle;
  }, [activeLocale]);

  if (shouldShowStart(locale, route.id)) {
    return (
      <StartScreen
        contentRegistry={contentRegistry}
        locale={activeLocale}
        loading={locale === undefined}
        localeSaveFailed={localeSaveFailed}
        localeSaving={localeSaving}
        needsLocale={locale === null}
        onOpenSettings={() => {
          navigate('/parent-settings');
        }}
        onPlay={() => {
          navigate('/map');
        }}
        onSelectLocale={selectLocale}
      />
    );
  }

  if (isProgressBlocked(progressBootstrap.status)) {
    return (
      <ProgressBoundary
        locale={activeLocale}
        onRecoverCorrupt={progressBootstrap.recoverCorrupt}
        onRetry={progressBootstrap.retry}
        route={route}
        status={progressBootstrap.status}
      />
    );
  }

  return (
    <ReadyAppRoute
      contentRegistry={contentRegistry}
      effectService={effectService}
      firstRescueProgressStore={firstRescueProgressStore}
      locale={activeLocale}
      narrationService={narrationService}
      onLocaleReset={clearLocale}
      onNavigate={navigate}
      route={route}
    />
  );
}
