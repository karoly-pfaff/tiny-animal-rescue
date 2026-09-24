import { diagnostic } from './content-validation-diagnostic.ts';
import type { AssetMetadata } from './world-content-contracts.ts';

const placeholderPattern = /(?:^|[./-])(?:draft|fallback|placeholder|temp)(?:[./-]|$)/u;

export function validateReleaseAsset(asset: AssetMetadata): readonly string[] {
  const approvedStates = [asset.qaStatus, asset.licenseStatus, asset.provenanceStatus].every(
    (status) => status === 'approved',
  );
  const verifiedDelivery = [
    asset.classification === 'production-safe',
    asset.delivery === 'r2-locked',
    validReleaseBytes(asset.bytes),
    validReleaseDigest(asset.digest),
  ].every(Boolean);
  const placeholder = placeholderPattern.test(`${asset.id}/${asset.role}/${asset.objectKey}`);
  const releasable = [approvedStates, verifiedDelivery, !placeholder].every(Boolean);
  return releasable
    ? []
    : [diagnostic(`Required release asset ${asset.id} is pending, unverified, or a placeholder.`)];
}

function validReleaseBytes(bytes: number | undefined): boolean {
  return typeof bytes === 'number' && bytes > 0;
}

function validReleaseDigest(digest: `sha256:${string}` | undefined): boolean {
  return typeof digest === 'string' && /^sha256:[0-9a-f]{64}$/u.test(digest);
}
