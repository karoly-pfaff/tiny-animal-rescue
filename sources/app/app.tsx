import { useEffect, useState } from 'react';

import { deferredBrowserEffectService, type EffectService } from '../audio/effect-service';
import { createBrowserNarrationService, type NarrationService } from '../audio/narration-service';
import { bundledContentRegistry } from '../content/bundled-content-registry';
import type { ContentRegistry } from '../content/content-registry';
import { selectFirstRescueContent } from '../content/first-rescue-content';
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
import { PlayerRoute } from './player-route';
import { type ProgressBootstrapStatus, useProgressBootstrap } from './progress-bootstrap';
import { resolveRoute } from './routes';
import { SaveFailureScreen } from './save-failure-screen';
import { SaveRecoveryNotice } from './save-recovery-notice';
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

  return { locale, localeSaveFailed, localeSaving, selectLocale };
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

type BlockingProgressStatus = Extract<ProgressBootstrapStatus, 'loading' | 'storage-error'>;

function isProgressBlocked(status: ProgressBootstrapStatus): status is BlockingProgressStatus {
  return status === 'loading' || status === 'storage-error';
}

function ProgressBoundary({
  locale,
  onRetry,
  route,
  status,
}: Readonly<{
  locale: Locale;
  onRetry: () => void;
  route: ReturnType<typeof resolveRoute>;
  status: BlockingProgressStatus;
}>) {
  return status === 'loading' ? (
    <FoundationScreen locale={locale} route={route} />
  ) : (
    <SaveFailureScreen locale={locale} onRetry={onRetry} />
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
  const firstRescueContent = requireFirstRescueContent(contentRegistry);
  const path = useHashPath();
  const { locale, localeSaveFailed, localeSaving, selectLocale } =
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
        onRetry={progressBootstrap.retry}
        route={route}
        status={progressBootstrap.status}
      />
    );
  }

  return (
    <>
      <PlayerRoute
        effectService={effectService}
        firstRescueContent={firstRescueContent}
        firstRescueProgressStore={firstRescueProgressStore}
        locale={activeLocale}
        narrationService={narrationService}
        onNavigate={navigate}
        route={route}
      />
      <SaveRecoveryNotice locale={activeLocale} status={progressBootstrap.status} />
    </>
  );
}

function requireFirstRescueContent(contentRegistry: ContentRegistry) {
  assertContentAvailable(contentRegistry);
  return selectFirstRescueContent(contentRegistry);
}

function assertContentAvailable(registry: ContentRegistry): void {
  if (registry.packOrder.length === 0) {
    throw new Error('The application requires at least one validated content pack.');
  }
}
