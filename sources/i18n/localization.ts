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
  chooseLanguageTitle: string;
  chooseLanguageHint: string;
  chooseLanguageSaveError: string;
  completedReplay: string;
  english: string;
  englishCode: string;
  garden: string;
  holdToMap: string;
  hungarian: string;
  hungarianCode: string;
  ladderLabel: string;
  ladderPlaced: string;
  map: string;
  mapHint: string;
  parentSettings: string;
  parentRecovery: string;
  play: string;
  nextShelterArea: string;
  previousShelterArea: string;
  repeatAreaName: string;
  repeatPrompt: string;
  rewardSaveError: string;
  saveCorrupt: string;
  saveCorruptTitle: string;
  saveUnavailable: string;
  saveUnavailableTitle: string;
  saveUnsupported: string;
  saveUnsupportedTitle: string;
  shelter: string;
  shelterEmpty: string;
  startSafeSave: string;
  tryAgain: string;
  screenTitles: Readonly<Record<ScreenTitleKey, string>>;
}>;

const stringsByLocale: Readonly<Record<Locale, Strings>> = {
  hu: {
    appTitle: 'Kis Állatmentők',
    celebrationChoices: 'Hová menjünk tovább?',
    chooseLanguageTitle: 'Válassz nyelvet',
    chooseLanguageHint: 'Ezt később a szülői beállításokban is megváltoztathatod.',
    chooseLanguageSaveError: 'A beállítás nem menthető. Próbáld újra.',
    completedReplay: 'Kész, újrajátszható',
    english: 'English',
    englishCode: 'EN',
    garden: 'Kert',
    holdToMap: 'Tartsd nyomva a térképhez',
    hungarian: 'Magyar',
    hungarianCode: 'HU',
    ladderLabel: 'Tedd a létrát a fához',
    ladderPlaced: 'A létra a helyére került.',
    map: 'Térkép',
    mapHint: 'Az első mentés a Kertben vár.',
    parentSettings: 'Szülői beállítások',
    parentRecovery: 'Felnőtt segítsége szükséges',
    play: 'Játék',
    nextShelterArea: 'Következő menhelyterület',
    previousShelterArea: 'Előző menhelyterület',
    repeatAreaName: 'Terület nevének meghallgatása',
    repeatPrompt: 'Hallgasd újra',
    rewardSaveError: 'A mentés most nem sikerült. Érintsd meg újra Mimit.',
    saveCorrupt:
      'A korábbi mentést változatlanul megőrizzük. Új, üres mentés csak a választásod után indul.',
    saveCorruptTitle: 'A mentés segítséget kér',
    saveUnavailable: 'A mentés most nem érhető el. Kérj meg egy felnőttet, hogy próbálja újra.',
    saveUnavailableTitle: 'A mentés pihen',
    saveUnsupported: 'Ez a mentés egy újabb játékverzióhoz tartozik, ezért nem írjuk felül.',
    saveUnsupportedTitle: 'Újabb mentési verzió',
    shelter: 'Menhely',
    shelterEmpty: 'Az első megmentett állat itt fog lakni.',
    startSafeSave: 'Sérült mentés archiválása és új játék',
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
    chooseLanguageTitle: 'Choose a language',
    chooseLanguageHint: 'You can change this later in Parent Settings.',
    chooseLanguageSaveError: 'The setting could not be saved. Please try again.',
    completedReplay: 'Completed, replay available',
    english: 'English',
    englishCode: 'EN',
    garden: 'Garden',
    holdToMap: 'Hold to return to the map',
    hungarian: 'Magyar',
    hungarianCode: 'HU',
    ladderLabel: 'Move the ladder to the tree',
    ladderPlaced: 'The ladder is in place.',
    map: 'Map',
    mapHint: 'The first rescue is waiting in the Garden.',
    parentSettings: 'Parent settings',
    parentRecovery: 'A grown-up is needed',
    play: 'Play',
    nextShelterArea: 'Next shelter area',
    previousShelterArea: 'Previous shelter area',
    repeatAreaName: 'Hear area name',
    repeatPrompt: 'Hear again',
    rewardSaveError: 'The rescue could not be saved yet. Tap Mimi again.',
    saveCorrupt:
      'The earlier save stays unchanged. A new empty save starts only after you choose it.',
    saveCorruptTitle: 'The save needs help',
    saveUnavailable: 'Saving is unavailable right now. Ask a grown-up to try again.',
    saveUnavailableTitle: 'Saving is resting',
    saveUnsupported: 'This save belongs to a newer game version, so it will not be overwritten.',
    saveUnsupportedTitle: 'Newer save version',
    shelter: 'Shelter',
    shelterEmpty: 'The first rescued animal will live here.',
    startSafeSave: 'Archive damaged save and start again',
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
