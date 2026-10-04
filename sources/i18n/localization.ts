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
  back: string;
  cancel: string;
  confirmFullReset: string;
  confirmFullResetDescription: string;
  confirmFullResetTitle: string;
  confirmProgressReset: string;
  confirmProgressResetDescription: string;
  confirmProgressResetTitle: string;
  fullReset: string;
  fullResetDescription: string;
  parentSettings: string;
  parentGateAction: string;
  parentGateHint: string;
  parentGateTitle: string;
  parentRecovery: string;
  play: string;
  nextShelterArea: string;
  previousShelterArea: string;
  repeatAreaName: string;
  repeatPrompt: string;
  resetFailed: string;
  resetProgress: string;
  resetProgressComplete: string;
  resetProgressDescription: string;
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
    back: 'Vissza',
    cancel: 'Mégse',
    celebrationChoices: 'Hová menjünk tovább?',
    chooseLanguageTitle: 'Válassz nyelvet',
    chooseLanguageHint: 'Ezt később a szülői beállításokban is megváltoztathatod.',
    chooseLanguageSaveError: 'A beállítás nem menthető. Próbáld újra.',
    completedReplay: 'Kész, újrajátszható',
    confirmFullReset: 'Minden törlése',
    confirmFullResetDescription:
      'Minden mentés és beállítás alaphelyzetbe kerül. Ezután újra nyelvet kell választani.',
    confirmFullResetTitle: 'Biztosan mindent alaphelyzetbe állítasz?',
    confirmProgressReset: 'Haladás törlése',
    confirmProgressResetDescription:
      'A küldetések és a menhely újrakezdődik. A nyelv és a hangbeállítások megmaradnak.',
    confirmProgressResetTitle: 'Biztosan újrakezditek a játékot?',
    english: 'English',
    englishCode: 'EN',
    garden: 'Kert',
    fullReset: 'Minden alaphelyzetbe állítása',
    fullResetDescription: 'A haladás, a nyelv és a hangbeállítások is alaphelyzetbe kerülnek.',
    holdToMap: 'Tartsd nyomva a térképhez',
    hungarian: 'Magyar',
    hungarianCode: 'HU',
    ladderLabel: 'Tedd a létrát a fához',
    ladderPlaced: 'A létra a helyére került.',
    map: 'Térkép',
    mapHint: 'Az első mentés a Kertben vár.',
    parentSettings: 'Szülői beállítások',
    parentGateAction: 'Tartsd nyomva',
    parentGateHint:
      'Felnőttként tartsd nyomva a gombot két másodpercig. Billentyűzettel tartsd lenyomva az Enter vagy Szóköz billentyűt.',
    parentGateTitle: 'Felnőtt ellenőrzése',
    parentRecovery: 'Felnőtt segítsége szükséges',
    play: 'Játék',
    nextShelterArea: 'Következő menhelyterület',
    previousShelterArea: 'Előző menhelyterület',
    repeatAreaName: 'Terület nevének meghallgatása',
    repeatPrompt: 'Hallgasd újra',
    resetFailed: 'A művelet nem fejeződött be. Semmit sem jelöltünk késznek; próbáld újra.',
    resetProgress: 'Játék újrakezdése',
    resetProgressComplete: 'A játék haladása törölve. A beállítások megmaradtak.',
    resetProgressDescription: 'A küldetések és a menhely újrakezdődik, a beállítások megmaradnak.',
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
    back: 'Back',
    cancel: 'Cancel',
    celebrationChoices: 'Where should we go next?',
    chooseLanguageTitle: 'Choose a language',
    chooseLanguageHint: 'You can change this later in Parent Settings.',
    chooseLanguageSaveError: 'The setting could not be saved. Please try again.',
    completedReplay: 'Completed, replay available',
    confirmFullReset: 'Reset everything',
    confirmFullResetDescription:
      'All progress and settings will return to their defaults. Language selection opens next.',
    confirmFullResetTitle: 'Reset everything?',
    confirmProgressReset: 'Reset progress',
    confirmProgressResetDescription:
      'Missions and the shelter start again. Language and audio settings stay unchanged.',
    confirmProgressResetTitle: 'Start the game again?',
    english: 'English',
    englishCode: 'EN',
    garden: 'Garden',
    fullReset: 'Reset everything',
    fullResetDescription: 'Progress, language, and audio settings all return to their defaults.',
    holdToMap: 'Hold to return to the map',
    hungarian: 'Magyar',
    hungarianCode: 'HU',
    ladderLabel: 'Move the ladder to the tree',
    ladderPlaced: 'The ladder is in place.',
    map: 'Map',
    mapHint: 'The first rescue is waiting in the Garden.',
    parentSettings: 'Parent settings',
    parentGateAction: 'Press and hold',
    parentGateHint:
      'A grown-up should hold the button for two seconds. With a keyboard, hold Enter or Space.',
    parentGateTitle: 'Grown-up check',
    parentRecovery: 'A grown-up is needed',
    play: 'Play',
    nextShelterArea: 'Next shelter area',
    previousShelterArea: 'Previous shelter area',
    repeatAreaName: 'Hear area name',
    repeatPrompt: 'Hear again',
    resetFailed: 'The action did not finish. Nothing was marked complete; please try again.',
    resetProgress: 'Start the game again',
    resetProgressComplete: 'Game progress was reset. Settings stayed unchanged.',
    resetProgressDescription: 'Missions and the shelter start again while settings stay unchanged.',
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
