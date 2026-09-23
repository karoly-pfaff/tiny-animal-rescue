import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBrowserNarrationService } from '../../sources/audio/narration-service';

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'speechSynthesis');
});

describe('browser narration service', () => {
  it('speaks localized text with the locale language tag and can stop it', () => {
    const cancel = vi.fn();
    const speak = vi.fn();
    class FakeUtterance {
      lang = '';
      constructor(readonly text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel, speak },
    });
    const service = createBrowserNarrationService();

    service.speak({
      cue: 'voice.mission.garden-kitten-tree.success',
      locale: 'en',
      text: 'Mimi is safe!',
    });
    service.stop();

    expect(cancel).toHaveBeenCalledTimes(2);
    expect(speak).toHaveBeenCalledOnce();
    expect(speak.mock.calls[0]?.[0]).toMatchObject({ lang: 'en-US', text: 'Mimi is safe!' });
  });

  it('is a safe no-op when browser speech synthesis is unavailable', () => {
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    const service = createBrowserNarrationService();

    expect(() => {
      service.speak({
        cue: 'voice.mission.garden-kitten-tree.success',
        locale: 'hu',
        text: 'Mimi biztonságban van!',
      });
      service.stop();
    }).not.toThrow();
  });

  it('plays a resolved narration asset and stops the active media', async () => {
    const pause = vi.fn();
    const play = vi.fn(() => Promise.resolve());
    class FakeAudio {
      currentTime = 4;
      constructor(readonly src: string) {}
      pause = pause;
      play = play;
    }
    vi.stubGlobal('Audio', FakeAudio);
    const service = createBrowserNarrationService(() => 'https://assets.example/success.ogg');

    service.speak({
      cue: 'voice.mission.garden-kitten-tree.success',
      locale: 'en',
      text: 'Mimi is safe!',
    });
    await Promise.resolve();
    service.stop();

    expect(play).toHaveBeenCalledOnce();
    expect(pause).toHaveBeenCalledOnce();
  });
});
