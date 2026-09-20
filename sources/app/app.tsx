import { useEffect, useState } from 'react';

import { getTemporaryStrings, type Locale } from '../i18n/temporary-localization';
import { FoundationScreen } from './foundation-screen';
import { resolveRoute } from './routes';

const foundationLocale = 'hu' satisfies Locale;

function getHashPath(): string {
  const path = window.location.hash.slice(1);
  return path === '' ? '/' : path;
}

export function App() {
  const [path, setPath] = useState(getHashPath);

  useEffect(() => {
    document.documentElement.lang = foundationLocale;
    document.title = getTemporaryStrings(foundationLocale).appTitle;
  }, []);

  useEffect(() => {
    const updatePath = () => setPath(getHashPath());
    window.addEventListener('hashchange', updatePath);
    return () => window.removeEventListener('hashchange', updatePath);
  }, []);

  return <FoundationScreen locale={foundationLocale} route={resolveRoute(path)} />;
}
