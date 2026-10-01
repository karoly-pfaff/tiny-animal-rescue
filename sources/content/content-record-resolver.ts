import {
  parseContentRecordReference,
  type ParsedContentRecordReference,
} from './content-record-reference';
import type { ContentRecordKind } from './content-record-kind';
import type { ContentRegistry } from './content-registry';

type ContentRecordByKind = Readonly<{
  animals: ContentRegistry['animals'][string];
  locations: ContentRegistry['locations'][string];
  missions: ContentRegistry['missions'][string];
  shelterAreas: ContentRegistry['shelterAreas'][string];
}>;

export type ResolvedContentRecord<Kind extends ContentRecordKind> = Readonly<{
  ownerPackId: string;
  record: ContentRecordByKind[Kind];
}>;

export type ResolveContentRecordOptions<Kind extends ContentRecordKind> = Readonly<{
  registry: ContentRegistry;
  kind: Kind;
  consumingPackId: string;
  reference: string;
}>;

export function resolveContentRecord<Kind extends ContentRecordKind>(
  options: ResolveContentRecordOptions<Kind>,
): ResolvedContentRecord<Kind> {
  const parsed = requiredReference(options);
  assertOwnReferenceIsUnqualified(parsed, options.consumingPackId);
  const consumingPack = requiredConsumingPack(options);
  assertDeclaredDependency(parsed.ownerPackId, consumingPack, options.consumingPackId);
  return requiredRegistryRecord(options, parsed);
}

function requiredReference<Kind extends ContentRecordKind>(
  options: ResolveContentRecordOptions<Kind>,
): ParsedContentRecordReference {
  const parsed = parseContentRecordReference(options.reference, options.consumingPackId);
  if (parsed === undefined) {
    throw new Error('Content contains an unsafe or malformed record reference.');
  }
  return parsed;
}

function assertOwnReferenceIsUnqualified(
  parsed: ParsedContentRecordReference,
  consumingPackId: string,
): void {
  if (parsed.qualified && parsed.ownerPackId === consumingPackId) {
    throw new Error('A content pack must reference its own records without a qualifier.');
  }
}

function requiredConsumingPack<Kind extends ContentRecordKind>(
  options: ResolveContentRecordOptions<Kind>,
): ContentRegistry['packs'][string] {
  const consumingPack = options.registry.packs[options.consumingPackId];
  if (consumingPack === undefined) {
    throw new Error('The consuming content pack is missing from the registry.');
  }
  return consumingPack;
}

function assertDeclaredDependency(
  ownerPackId: string,
  consumingPack: ContentRegistry['packs'][string],
  consumingPackId: string,
): void {
  if (ownerPackId !== consumingPackId && !consumingPack.dependencies.includes(ownerPackId)) {
    throw new Error('A content record references an undeclared pack dependency.');
  }
}

function requiredRegistryRecord<Kind extends ContentRecordKind>(
  options: ResolveContentRecordOptions<Kind>,
  parsed: ParsedContentRecordReference,
): ResolvedContentRecord<Kind> {
  const record = options.registry[options.kind][parsed.recordId] as
    ContentRecordByKind[Kind] | undefined;
  const ownerPackId = options.registry.recordOwners[options.kind][parsed.recordId];
  if (record === undefined || ownerPackId !== parsed.ownerPackId) {
    throw new Error('A referenced content record is missing from its owning pack.');
  }
  return { ownerPackId, record };
}
