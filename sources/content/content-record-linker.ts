import { parseContentRecordReference } from './content-record-reference.ts';
import type { ContentRecordLabel } from './content-record-kind.ts';
import type { ContentPackSource } from './content-registry.ts';
import { diagnostic } from './content-validation-diagnostic.ts';

export type OwnedRecord<Entry> = Readonly<{
  ownerPackId: string;
  record: Entry;
}>;

export type RecordLinkOptions<Entry extends Readonly<{ id: string }>> = Readonly<{
  contentPacks: ReadonlyMap<string, ContentPackSource>;
  declaringPackId: string;
  rawReference: string;
  records: ReadonlyMap<string, OwnedRecord<Entry>>;
}>;

type RecordValidationOptions<Entry extends Readonly<{ id: string }>> = RecordLinkOptions<Entry> &
  Readonly<{
    consumerLabel: string;
    recordLabel: ContentRecordLabel;
  }>;

export function validateRecordReference<Entry extends Readonly<{ id: string }>>(
  options: RecordValidationOptions<Entry>,
): readonly string[] {
  const issue = recordReferenceIssue(options);
  return issue === undefined ? [] : [diagnostic(issue)];
}

export function resolveOwnedRecord<Entry extends Readonly<{ id: string }>>(
  options: RecordLinkOptions<Entry>,
): OwnedRecord<Entry> | undefined {
  const parsed = parseContentRecordReference(options.rawReference, options.declaringPackId);
  if (parsed === undefined) {
    return undefined;
  }
  return resolvedParsedRecord(parsed, options);
}

function resolvedParsedRecord<Entry extends Readonly<{ id: string }>>(
  parsed: Readonly<{ ownerPackId: string; qualified: boolean; recordId: string }>,
  options: RecordLinkOptions<Entry>,
): OwnedRecord<Entry> | undefined {
  const invalid =
    isInvalidSelfQualification(parsed, options.declaringPackId) ||
    !dependencyAllows(parsed.ownerPackId, options);
  if (invalid) {
    return undefined;
  }
  const owned = options.records.get(parsed.recordId);
  return owned?.ownerPackId === parsed.ownerPackId ? owned : undefined;
}

export function canonicalReferenceKey<Entry extends Readonly<{ id: string }>>(
  options: RecordLinkOptions<Entry>,
): string | undefined {
  const owned = resolveOwnedRecord(options);
  return owned === undefined ? undefined : `${owned.ownerPackId}:${owned.record.id}`;
}

function recordReferenceIssue<Entry extends Readonly<{ id: string }>>(
  options: RecordValidationOptions<Entry>,
): string | undefined {
  const parsed = parseContentRecordReference(options.rawReference, options.declaringPackId);
  if (parsed === undefined) {
    return `${options.consumerLabel} contains unsafe ${options.recordLabel} reference ${options.rawReference}.`;
  }
  return parsedReferenceIssue(parsed, options);
}

function parsedReferenceIssue<Entry extends Readonly<{ id: string }>>(
  parsed: Readonly<{ ownerPackId: string; qualified: boolean; recordId: string }>,
  options: RecordValidationOptions<Entry>,
): string | undefined {
  if (isInvalidSelfQualification(parsed, options.declaringPackId)) {
    return `Pack ${options.declaringPackId} must reference its own ${options.recordLabel} records without a pack qualifier.`;
  }
  if (!dependencyAllows(parsed.ownerPackId, options)) {
    return `Pack ${options.declaringPackId} references ${options.recordLabel} pack ${parsed.ownerPackId} without declaring a dependency.`;
  }
  const owned = options.records.get(parsed.recordId);
  return owned?.ownerPackId === parsed.ownerPackId
    ? undefined
    : `${options.consumerLabel} references missing ${options.recordLabel} ${options.rawReference}.`;
}

function isInvalidSelfQualification(
  parsed: Readonly<{ ownerPackId: string; qualified: boolean }>,
  declaringPackId: string,
): boolean {
  return parsed.qualified && parsed.ownerPackId === declaringPackId;
}

function dependencyAllows<Entry extends Readonly<{ id: string }>>(
  ownerPackId: string,
  options: RecordLinkOptions<Entry>,
): boolean {
  return (
    ownerPackId === options.declaringPackId ||
    options.contentPacks.get(options.declaringPackId)?.dependencies.includes(ownerPackId) === true
  );
}
