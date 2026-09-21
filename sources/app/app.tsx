import { useEffect, useState } from 'react';

import {
  createIndexedDbLocaleBootstrapRepository,
  type LocaleBootstrapRepository,
} from '../persistence/locale-bootstrap-repository';
import { getStrings, type Locale } from '../i18n/localization';
import { FoundationScreen } from './foundation-screen';
import { resolveRoute } from './routes';
import { StartScreen } from './start-screen';

const foundationLocale = 'hu' satisfies Locale;
const browserLocaleRepository = createIndexedDbLocaleBootstrapRepository(window.indexedDB);

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

type AppProps = Readonly<{ localeRepository?: LocaleBootstrapRepository }>;

function shouldShowStart(locale: Locale | null | undefined, routeId: string): boolean {
  return locale === undefined || locale === null || routeId === 'start';
}

export function App({ localeRepository = browserLocaleRepository }: AppProps) {
  const path = useHashPath();
  const { locale, localeSaveFailed, localeSaving, selectLocale } =
    useLocaleBootstrap(localeRepository);
  const activeLocale = locale ?? foundationLocale;
  const route = resolveRoute(path);

  useEffect(() => {
    document.documentElement.lang = activeLocale;
    document.title = getStrings(activeLocale).appTitle;
  }, [activeLocale]);

  if (shouldShowStart(locale, route.id)) {
    return (
      <StartScreen
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

  return <FoundationScreen locale={activeLocale} route={route} />;
}
