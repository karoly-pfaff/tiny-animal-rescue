import type { SaveGameV1 } from './save-game-schema';

export const defaultSaveSettings: SaveGameV1['settings'] = {
  effectsVolume: 1,
  musicVolume: 0.7,
  narrationVolume: 1,
  reducedMotion: false,
};
