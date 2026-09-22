export const firstRescueVoiceCopySource = 'content/base/assets/voice-manifest.json';

export function createFirstRescueRuntimeVoiceCopy(manifest) {
  return {
    schemaVersion: 1,
    generated: true,
    generatedFrom: firstRescueVoiceCopySource,
    delivery: 'browser-fallback',
    assets: manifest.assets.map(({ cue, fallbackText }) => ({ cue, fallbackText })),
  };
}

export function serializeFirstRescueRuntimeVoiceCopy(manifest) {
  return `${JSON.stringify(createFirstRescueRuntimeVoiceCopy(manifest), null, 2)}\n`;
}
