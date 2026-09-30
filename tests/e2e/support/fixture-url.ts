import { env } from 'node:process';

import { resolvePreviewPort } from './preview-port';
import type { ProgressionSeedName } from '../../support/progression-content';

type InteractionFixture = 'match' | 'suite' | 'trace' | 'wipe';

export function interactionFixtureUrl(fixture: InteractionFixture): string {
  const fixturePort = resolvePreviewPort(env['TINY_RESCUE_PREVIEW_PORT']) + 1;
  return `http://127.0.0.1:${String(fixturePort)}/?fixture=${fixture}`;
}

export function mapFixtureUrl(
  locale: 'en' | 'hu',
  seed: ProgressionSeedName = 'all-complete',
): string {
  const fixturePort = resolvePreviewPort(env['TINY_RESCUE_PREVIEW_PORT']) + 1;
  return `http://127.0.0.1:${String(fixturePort)}/?fixture=map&locale=${locale}&seed=${seed}`;
}
