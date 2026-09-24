const supportedContentContractVersion = 1 as const;

type ContentContractVersion = typeof supportedContentContractVersion;
type ContentLocale = 'hu' | 'en';

type ContentDirectories = Readonly<{
  animals: string;
  locations: string;
  missions: string;
  shelterAreas: string;
}>;

export type PackManifestSource = Readonly<{
  id: string;
  version: string;
  contractVersion: number;
  titleKey: string;
  initialMissionId?: string;
  locales: readonly ContentLocale[];
  dependencies?: readonly string[];
  content: ContentDirectories;
}>;

export type PackManifest = Omit<PackManifestSource, 'contractVersion' | 'dependencies'> &
  Readonly<{
    contractVersion: ContentContractVersion;
    dependencies: readonly string[];
  }>;

export function normalizePackManifest(source: PackManifestSource): PackManifest {
  if (source.contractVersion !== supportedContentContractVersion) {
    throw new Error(
      `Unsupported content contract version ${String(source.contractVersion)}; expected ${String(supportedContentContractVersion)}.`,
    );
  }

  return Object.freeze({
    ...source,
    content: Object.freeze({ ...source.content }),
    contractVersion: supportedContentContractVersion,
    dependencies: Object.freeze([...(source.dependencies ?? [])]),
    locales: Object.freeze([...source.locales]),
  });
}
