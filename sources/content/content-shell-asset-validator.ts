import type { ContentPackSource } from './content-registry.ts';
import { diagnostic } from './content-validation-diagnostic.ts';
import { validateReleaseAsset } from './release-asset-validator.ts';

export function validateStartBackground(
  packs: readonly ContentPackSource[],
  release: boolean,
): readonly string[] {
  const candidates = packs.flatMap((pack) =>
    pack.records.assets
      .filter(({ role }) => role === 'start-background')
      .map((asset) => ({ asset, packId: pack.id })),
  );
  if (candidates.length !== 1) {
    return [
      diagnostic(
        `The assembled content registry must declare exactly one start-background asset; found ${String(candidates.length)}.`,
      ),
    ];
  }
  const candidate = candidates[0];
  if (candidate === undefined) {
    return [diagnostic('The assembled content registry has no start-background asset.')];
  }
  const categoryFindings =
    candidate.asset.category === 'image'
      ? []
      : [
          diagnostic(
            `Start background ${candidate.packId}:${candidate.asset.objectKey} must be an image.`,
          ),
        ];
  return [...categoryFindings, ...(release ? validateReleaseAsset(candidate.asset) : [])];
}
