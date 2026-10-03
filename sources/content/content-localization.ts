import type { Locale } from '../i18n/localization';
import type { ContentRegistry } from './content-registry';

export function resolveContentText(
  registry: ContentRegistry,
  locale: Locale,
  selection: Readonly<{ key: string; ownerPackId: string }>,
): string {
  const value =
    registry.packs[selection.ownerPackId]?.records.localizations[locale]?.[selection.key];
  if (value === undefined) {
    throw new Error(
      `Content pack ${selection.ownerPackId} is missing localized key ${selection.key}.`,
    );
  }
  return value;
}
