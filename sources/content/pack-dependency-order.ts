import type { PackManifest } from './pack-contract';

enum VisitState {
  Visiting,
  Visited,
}

export function orderPacksByDependencies<Pack extends PackManifest>(
  packs: readonly Pack[],
): readonly Pack[] {
  const context: OrderingContext<Pack> = {
    index: indexPacks(packs),
    ordered: [],
    states: new Map(),
  };
  for (const pack of [...packs].sort((left, right) => left.id.localeCompare(right.id))) {
    visitPack(pack, [], context);
  }
  return Object.freeze(context.ordered);
}

function indexPacks<Pack extends PackManifest>(packs: readonly Pack[]): ReadonlyMap<string, Pack> {
  const index = new Map<string, Pack>();
  for (const pack of packs) {
    if (index.has(pack.id)) {
      throw new Error(`Duplicate pack ID: ${pack.id}`);
    }
    index.set(pack.id, pack);
  }
  return index;
}

type OrderingContext<Pack extends PackManifest> = Readonly<{
  index: ReadonlyMap<string, Pack>;
  ordered: Pack[];
  states: Map<Pack, VisitState>;
}>;

function visitPack<Pack extends PackManifest>(
  pack: Pack,
  trail: readonly string[],
  context: OrderingContext<Pack>,
): void {
  const state = context.states.get(pack);
  if (shouldSkipVisit(state, trail, pack.id)) {
    return;
  }
  context.states.set(pack, VisitState.Visiting);
  visitDependencies(pack, trail, context);
  context.states.set(pack, VisitState.Visited);
  context.ordered.push(pack);
}

function shouldSkipVisit(
  state: VisitState | undefined,
  trail: readonly string[],
  packId: string,
): boolean {
  if (state === VisitState.Visiting) {
    throw new Error(`Content pack dependency cycle: ${JSON.stringify([...trail, packId])}`);
  }
  return state === VisitState.Visited;
}

function visitDependencies<Pack extends PackManifest>(
  pack: Pack,
  trail: readonly string[],
  context: OrderingContext<Pack>,
): void {
  if (pack.id === 'base' && pack.dependencies.length > 0) {
    throw new Error('The base pack cannot depend on an expansion pack.');
  }
  const nextTrail = [...trail, pack.id];
  for (const dependencyId of [...pack.dependencies].sort()) {
    visitPack(requireDependency(pack, dependencyId, context.index), nextTrail, context);
  }
}

function requireDependency<Pack extends PackManifest>(
  pack: Pack,
  dependencyId: string,
  index: ReadonlyMap<string, Pack>,
): Pack {
  const dependency = index.get(dependencyId);
  if (dependency === undefined) {
    throw new Error(`Pack ${pack.id} depends on missing pack ${dependencyId}.`);
  }
  return dependency;
}
