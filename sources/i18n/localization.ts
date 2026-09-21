export type Locale = 'hu' | 'en';
export type ScreenId = 'start' | 'map' | 'mission' | 'celebration' | 'shelter' | 'parent-settings';
export type ScreenTitleKey = `screen.${ScreenId}.title`;

export const supportedLocales = {
  english: 'en',
  hungarian: 'hu',
} as const satisfies Readonly<Record<string, Locale>>;

type Strings = Readonly<{
  appTitle: string;
  celebrationChoices: string;
  celebrationTitle: string;
  chooseLanguageTitle: string;
  chooseLanguageHint: string;
  chooseLanguageSaveError: string;
  english: string;
  englishCode: string;
  firstMissionTitle: string;
  garden: string;
  gardenMissionLabel: string;
  holdToMap: string;
  helpMimi: string;
  helpMimiNarration: string;
  hungarian: string;
  hungarianCode: string;
  ladderLabel: string;
  ladderPlaced: string;
  map: string;
  mapHint: string;
  mimiCelebrationNarration: string;
  parentSettings: string;
  play: string;
  rewardSaveError: string;
  shelter: string;
  screenTitles: Readonly<Record<ScreenTitleKey, string>>;
}>;

const stringsByLocale: Readonly<Record<Locale, Strings>> = {
  hu: {
    appTitle: 'Kis Állatmentők',
    celebrationChoices: 'Hová menjünk tovább?',
    celebrationTitle: 'Mimi megmenekült!',
    chooseLanguageTitle: 'Válassz nyelvet',
    chooseLanguageHint: 'Ezt később a szülői beállításokban is megváltoztathatod.',
    chooseLanguageSaveError: 'A beállítás nem menthető. Próbáld újra.',
    english: 'English',
    englishCode: 'EN',
    firstMissionTitle: 'Mimi a fán',
    garden: 'Kert',
    gardenMissionLabel: 'Kerti mentés: Mimi',
    holdToMap: 'Tartsd nyomva a térképhez',
    helpMimi: 'Segíts Miminek lejönni',
    helpMimiNarration: 'Koppints Mimire!',
    hungarian: 'Magyar',
    hungarianCode: 'HU',
    ladderLabel: 'Tedd a létrát a fához',
    ladderPlaced: 'A létra a helyére került.',
    map: 'Térkép',
    mapHint: 'Az első mentés a Kertben vár.',
    mimiCelebrationNarration: 'Mimi biztonságban van!',
    parentSettings: 'Szülői beállítások',
    play: 'Játék',
    rewardSaveError: 'A mentés most nem sikerült. Érintsd meg újra Mimit.',
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
    celebrationChoices: 'Where should we go next?',
    celebrationTitle: 'Mimi is rescued!',
    chooseLanguageTitle: 'Choose a language',
    chooseLanguageHint: 'You can change this later in Parent Settings.',
    chooseLanguageSaveError: 'The setting could not be saved. Please try again.',
    english: 'English',
    englishCode: 'EN',
    firstMissionTitle: 'Mimi in the tree',
    garden: 'Garden',
    gardenMissionLabel: 'Garden rescue: Mimi',
    holdToMap: 'Hold to return to the map',
    helpMimi: 'Help Mimi come down',
    helpMimiNarration: 'Tap Mimi!',
    hungarian: 'Magyar',
    hungarianCode: 'HU',
    ladderLabel: 'Move the ladder to the tree',
    ladderPlaced: 'The ladder is in place.',
    map: 'Map',
    mapHint: 'The first rescue is waiting in the Garden.',
    mimiCelebrationNarration: 'Mimi is safe!',
    parentSettings: 'Parent settings',
    play: 'Play',
    rewardSaveError: 'The rescue could not be saved yet. Tap Mimi again.',
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
