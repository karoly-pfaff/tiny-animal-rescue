type AssetReferenceToken = ':';

export type ParsedAssetReference = Readonly<{
  ownerPackId: string;
  objectKey: string;
  qualified: boolean;
}>;

const safePathPattern =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?!.*\\)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\/\/)[a-z0-9][a-z0-9./-]*$/u;
const packIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const referenceSeparator = ':' satisfies AssetReferenceToken;

export function parseAssetReference(
  rawReference: string,
  currentPackId: string,
): ParsedAssetReference | undefined {
  const separator = rawReference.indexOf(referenceSeparator);
  const qualified = separator !== -1;
  const ownerPackId = qualified ? rawReference.slice(0, separator) : currentPackId;
  const objectKey = qualified ? rawReference.slice(separator + 1) : rawReference;
  return packIdPattern.test(ownerPackId) && safePathPattern.test(objectKey)
    ? { ownerPackId, objectKey, qualified }
    : undefined;
}

export function isSafeAssetObjectKey(objectKey: string): boolean {
  return safePathPattern.test(objectKey);
}
