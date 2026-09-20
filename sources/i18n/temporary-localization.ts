import type { RouteId } from '../app/routes';

export type Locale = 'hu' | 'en';
export type ScreenTitleKey = `screen.${RouteId}.title`;

type TemporaryStrings = Readonly<{
  appTitle: string;
  primaryAction: string;
  routeHint: string;
  screenTitles: Readonly<Record<ScreenTitleKey, string>>;
}>;

const stringsByLocale: Readonly<Record<Locale, TemporaryStrings>> = {
  hu: {
    appTitle: 'Kis Állatmentők',
    primaryAction: 'Játék',
    routeHint: 'Az első mentés hamarosan indul.',
    screenTitles: {
      'screen.start.title': 'Kezdőképernyő',
      'screen.map.title': 'Mentési térkép',
      'screen.mission.title': 'Küldetés',
      'screen.celebration.title': 'Sikeres mentés',
      'screen.shelter.title': 'Menhely',
      'screen.parent-settings.title': 'Szülői beállítások',
    },
  },
  en: {
    appTitle: 'Tiny Rescue',
    primaryAction: 'Play',
    routeHint: 'The first rescue is coming soon.',
    screenTitles: {
      'screen.start.title': 'Start screen',
      'screen.map.title': 'Rescue map',
      'screen.mission.title': 'Mission',
      'screen.celebration.title': 'Rescue complete',
      'screen.shelter.title': 'Shelter',
      'screen.parent-settings.title': 'Parent settings',
    },
  },
};

export function getTemporaryStrings(locale: Locale): TemporaryStrings {
  return stringsByLocale[locale];
}
