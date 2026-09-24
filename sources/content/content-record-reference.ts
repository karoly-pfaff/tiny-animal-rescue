type ContentReferenceToken = ':';

export type ParsedContentRecordReference = Readonly<{
  ownerPackId: string;
  recordId: string;
  qualified: boolean;
}>;

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const referenceSeparator = ':' satisfies ContentReferenceToken;

export function parseContentRecordReference(
  rawReference: string,
  currentPackId: string,
): ParsedContentRecordReference | undefined {
  const separator = rawReference.indexOf(referenceSeparator);
  const qualified = separator !== -1;
  const ownerPackId = qualified ? rawReference.slice(0, separator) : currentPackId;
  const recordId = qualified ? rawReference.slice(separator + 1) : rawReference;
  return idPattern.test(ownerPackId) && idPattern.test(recordId)
    ? { ownerPackId, recordId, qualified }
    : undefined;
}
