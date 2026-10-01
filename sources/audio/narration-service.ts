import type { Locale } from '../i18n/localization';
import { resolveFirstRescueNarration } from '../content/first-rescue-narration';

type LanguageTag = 'en-US' | 'hu-HU';
type BrowserCapability = 'speechSynthesis';

type NarrationRequest = Readonly<{
  cue: string;
  locale: Locale;
  text: string;
}>;

export type NarrationAssetResolver = (cue: string, locale: Locale) => string | null;

export type NarrationService = Readonly<{
  speak: (request: NarrationRequest) => void;
  stop: () => void;
}>;

const englishLanguageTag = 'en-US' satisfies LanguageTag;
const hungarianLanguageTag = 'hu-HU' satisfies LanguageTag;
const speechSynthesisCapability = 'speechSynthesis' satisfies BrowserCapability;

export function createBrowserNarrationService(
  resolveAsset: NarrationAssetResolver = resolveFirstRescueNarration,
): NarrationService {
  let activeAudio: HTMLAudioElement | null = null;

  function stop(): void {
    if (activeAudio !== null) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    if (canSpeakInBrowser()) {
      window.speechSynthesis.cancel();
    }
  }

  return {
    speak: ({ cue, locale, text }) => {
      stop();
      const assetUrl = resolveAsset(cue, locale);
      if (assetUrl !== null) {
        const audio = new Audio(assetUrl);
        activeAudio = audio;
        void audio.play().catch(() => {
          if (activeAudio === audio) {
            activeAudio = null;
            speakWithBrowserVoice(locale, text);
          }
        });
        return;
      }
      speakWithBrowserVoice(locale, text);
    },
    stop,
  };
}

function speakWithBrowserVoice(locale: Locale, text: string): void {
  if (!canSpeakInBrowser()) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale === 'hu' ? hungarianLanguageTag : englishLanguageTag;
  window.speechSynthesis.speak(utterance);
}

function canSpeakInBrowser(): boolean {
  return speechSynthesisCapability in window && typeof SpeechSynthesisUtterance !== 'undefined';
}
