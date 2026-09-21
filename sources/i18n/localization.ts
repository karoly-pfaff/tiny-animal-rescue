export type Locale = 'hu' | 'en';
export type ScreenId = 'start' | 'map' | 'mission' | 'celebration' | 'shelter' | 'parent-settings';
export type ScreenTitleKey = `screen.${ScreenId}.title`;

export const supportedLocales = {
  english: 'en',
  hungarian: 'hu',
} as const satisfies Readonly<Record<string, Locale>>;

type Strings = Readonly<{
  appTitle: string;
  chooseLanguageTitle: string;
  chooseLanguageHint: string;
  chooseLanguageSaveError: string;
  english: string;
  englishCode: string;
  firstMissionTitle: string;
  garden: string;
  gardenMissionLabel: string;
  holdToMap: string;
  hungarian: string;
  hungarianCode: string;
  mapHint: string;
  parentSettings: string;
  play: string;
  shelter: string;
  screenTitles: Readonly<Record<ScreenTitleKey, string>>;
}>;

const stringsByLocale: Readonly<Record<Locale, Strings>> = {
  hu: {
    appTitle: 'Kis Állatmentők',
    chooseLanguageTitle: 'Válassz nyelvet',
    chooseLanguageHint: 'Ezt később a szülői beállításokban is megváltoztathatod.',
    chooseLanguageSaveError: 'A beállítás nem menthető. Próbáld újra.',
    english: 'English',
    englishCode: 'EN',
    firstMissionTitle: 'Mimi a fán',
    garden: 'Kert',
    gardenMissionLabel: 'Kerti mentés: Mimi',
    holdToMap: 'Tartsd nyomva a térképhez',
    hungarian: 'Magyar',
    hungarianCode: 'HU',
    mapHint: 'Az első mentés a Kertben vár.',
    parentSettings: 'Szülői beállítások',
    play: 'Játék',
    shelter: 'Menhely',
    screenTitles: {
      'screen.start.title': 'Kis Állatmentők',
      'screen.map.title': 'Mentési térkép',
      'screen.mission.title': 'Küldetés',
      'screen.celebration.title': 'Sikeres mentés',
      'screen.shelter.title': 'Menhely',
      'screen.parent-settings.title': 'Szülői beállítások',
    },
  },
  en: {
    appTitle: 'Tiny Rescue',
    chooseLanguageTitle: 'Choose a language',
    chooseLanguageHint: 'You can change this later in Parent Settings.',
    chooseLanguageSaveError: 'The setting could not be saved. Please try again.',
    english: 'English',
    englishCode: 'EN',
    firstMissionTitle: 'Mimi in the tree',
    garden: 'Garden',
    gardenMissionLabel: 'Garden rescue: Mimi',
    holdToMap: 'Hold to return to the map',
    hungarian: 'Magyar',
    hungarianCode: 'HU',
    mapHint: 'The first rescue is waiting in the Garden.',
    parentSettings: 'Parent settings',
    play: 'Play',
    shelter: 'Shelter',
    screenTitles: {
      'screen.start.title': 'Tiny Rescue',
      'screen.map.title': 'Rescue map',
      'screen.mission.title': 'Mission',
      'screen.celebration.title': 'Rescue complete',
      'screen.shelter.title': 'Shelter',
      'screen.parent-settings.title': 'Parent settings',
    },
  },
};

export function getStrings(locale: Locale): Strings {
  return stringsByLocale[locale];
}
