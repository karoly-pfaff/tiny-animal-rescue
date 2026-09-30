export type PendingAssetReference = Readonly<{
  id: string;
  objectKey: string;
}>;

export type PendingAssetsByPack = Readonly<Record<string, readonly PendingAssetReference[]>>;

export function rewritePendingAssetReferences(
  value: unknown,
  currentPackId: string,
  pendingAssetsByPack: PendingAssetsByPack,
): unknown {
  if (typeof value === 'string') {
    return rewriteReference(value, currentPackId, pendingAssetsByPack);
  }
  if (Array.isArray(value)) {
    return value.map((entry) =>
      rewritePendingAssetReferences(entry, currentPackId, pendingAssetsByPack),
    );
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        rewritePendingAssetReferences(entry, currentPackId, pendingAssetsByPack),
      ]),
    );
  }
  return value;
}

function rewriteReference(
  value: string,
  currentPackId: string,
  pendingAssetsByPack: PendingAssetsByPack,
): string {
  const reference = parseReference(value, currentPackId);
  const asset = pendingAssetsByPack[reference.ownerPackId]?.find(
    (candidate) => candidate.objectKey === reference.objectKey,
  );
  if (asset === undefined) {
    return value;
  }
  return `${reference.qualifier}pending-assets/${asset.id}`;
}

function parseReference(value: string, currentPackId: string) {
  const separator = value.indexOf(':');
  if (separator === -1) {
    return { objectKey: value, ownerPackId: currentPackId, qualifier: '' } as const;
  }
  const ownerPackId = value.slice(0, separator);
  return {
    objectKey: value.slice(separator + 1),
    ownerPackId,
    qualifier: `${ownerPackId}:`,
  } as const;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
