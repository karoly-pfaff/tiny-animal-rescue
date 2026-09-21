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
  indoorRoom: string;
  hungarian: string;
  hungarianCode: string;
  ladderLabel: string;
  ladderPlaced: string;
  map: string;
  mapHint: string;
  mimiCelebrationNarration: string;
  mimiHappy: string;
  mimiName: string;
  mimiTapLabel: string;
  parentSettings: string;
  play: string;
  rewardSaveError: string;
  saveRecovered: string;
  saveUnavailable: string;
  saveUnavailableTitle: string;
  saveUnsupported: string;
  shelter: string;
  shelterEmpty: string;
  tryAgain: string;
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
    indoorRoom: 'Belső szoba',
    hungarian: 'Magyar',
    hungarianCode: 'HU',
    ladderLabel: 'Tedd a létrát a fához',
    ladderPlaced: 'A létra a helyére került.',
    map: 'Térkép',
    mapHint: 'Az első mentés a Kertben vár.',
    mimiCelebrationNarration: 'Mimi biztonságban van!',
    mimiHappy: 'Mimi boldogan dorombol.',
    mimiName: 'Mimi',
    mimiTapLabel: 'Simogasd meg Mimit',
    parentSettings: 'Szülői beállítások',
    play: 'Játék',
    rewardSaveError: 'A mentés most nem sikerült. Érintsd meg újra Mimit.',
    saveRecovered: 'A korábbi mentés sérült volt. Biztonságos új mentés indult.',
    saveUnavailable: 'A mentés most nem érhető el. Kérj meg egy felnőttet, hogy próbálja újra.',
    saveUnavailableTitle: 'A mentés pihen',
    saveUnsupported: 'Ez a mentés egy újabb játékverzióhoz tartozik, ezért nem írjuk felül.',
    shelter: 'Menhely',
    shelterEmpty: 'Az első megmentett állat itt fog lakni.',
    tryAgain: 'Újra',
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
    indoorRoom: 'Indoor Room',
    hungarian: 'Magyar',
    hungarianCode: 'HU',
    ladderLabel: 'Move the ladder to the tree',
    ladderPlaced: 'The ladder is in place.',
    map: 'Map',
    mapHint: 'The first rescue is waiting in the Garden.',
    mimiCelebrationNarration: 'Mimi is safe!',
    mimiHappy: 'Mimi purrs happily.',
    mimiName: 'Mimi',
    mimiTapLabel: 'Give Mimi a gentle pat',
    parentSettings: 'Parent settings',
    play: 'Play',
    rewardSaveError: 'The rescue could not be saved yet. Tap Mimi again.',
    saveRecovered: 'The earlier save was damaged. A safe new save has started.',
    saveUnavailable: 'Saving is unavailable right now. Ask a grown-up to try again.',
    saveUnavailableTitle: 'Saving is resting',
    saveUnsupported: 'This save belongs to a newer game version, so it will not be overwritten.',
    shelter: 'Shelter',
    shelterEmpty: 'The first rescued animal will live here.',
    tryAgain: 'Try again',
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
