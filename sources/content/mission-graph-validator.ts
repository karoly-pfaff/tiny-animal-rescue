import type { MissionRecord } from './mission-contract';
import { diagnostic } from './content-validation-diagnostic.ts';

export function validateMissionGraph(
  missions: ReadonlyMap<string, MissionRecord>,
  residentRescues: ReadonlyMap<string, string>,
): readonly string[] {
  return [
    ...validatePrerequisiteCycles(missions),
    ...validateHelpDependencies(missions, residentRescues),
  ];
}

function validatePrerequisiteCycles(
  missions: ReadonlyMap<string, MissionRecord>,
): readonly string[] {
  const context = {
    missions,
    visiting: new Set<string>(),
    visited: new Set<string>(),
    findings: [] as string[],
  };
  for (const missionRecord of missions.values()) {
    visitMission(missionRecord, [], context);
  }
  return context.findings;
}

type CycleContext = Readonly<{
  missions: ReadonlyMap<string, MissionRecord>;
  visiting: Set<string>;
  visited: Set<string>;
  findings: string[];
}>;

function visitMission(
  missionRecord: MissionRecord,
  trail: readonly string[],
  context: CycleContext,
): void {
  if (context.visited.has(missionRecord.id)) {
    return;
  }
  if (context.visiting.has(missionRecord.id)) {
    context.findings.push(
      diagnostic(`Mission prerequisite cycle: ${[...trail, missionRecord.id].join(' -> ')}.`),
    );
    return;
  }
  context.visiting.add(missionRecord.id);
  visitPrerequisites(missionRecord, trail, context);
  context.visiting.delete(missionRecord.id);
  context.visited.add(missionRecord.id);
}

function visitPrerequisites(
  missionRecord: MissionRecord,
  trail: readonly string[],
  context: CycleContext,
): void {
  for (const prerequisite of missionRecord.prerequisites) {
    const dependency = context.missions.get(prerequisite.completedMissionId);
    if (dependency !== undefined) {
      visitMission(dependency, [...trail, missionRecord.id], context);
    }
  }
}

function validateHelpDependencies(
  missions: ReadonlyMap<string, MissionRecord>,
  residentRescues: ReadonlyMap<string, string>,
): readonly string[] {
  return [...missions.values()].flatMap((missionRecord) =>
    missionRecord.type === 'help'
      ? validateHelpDependency(missionRecord, missions, residentRescues)
      : [],
  );
}

function validateHelpDependency(
  missionRecord: MissionRecord,
  missions: ReadonlyMap<string, MissionRecord>,
  residentRescues: ReadonlyMap<string, string>,
): readonly string[] {
  const subjectId = missionRecord.subjectAnimalId;
  if (subjectId === undefined) {
    return [diagnostic(`Help mission ${missionRecord.id} must declare its resident subject.`)];
  }
  const rescueMissionId = residentRescues.get(subjectId);
  if (rescueMissionId === undefined) {
    return [diagnostic(`Help mission ${missionRecord.id} has no Rescue mission for ${subjectId}.`)];
  }
  const search = { targetMissionId: rescueMissionId, missions };
  return dependsOn(missionRecord, search, new Set())
    ? []
    : [
        diagnostic(
          `Help mission ${missionRecord.id} must depend on Rescue mission ${rescueMissionId}.`,
        ),
      ];
}

type DependencySearch = Readonly<{
  targetMissionId: string;
  missions: ReadonlyMap<string, MissionRecord>;
}>;

function dependsOn(
  missionRecord: MissionRecord,
  search: DependencySearch,
  visited: Set<string>,
): boolean {
  for (const prerequisite of missionRecord.prerequisites) {
    if (prerequisiteMatchesOrDepends(prerequisite.completedMissionId, search, visited)) {
      return true;
    }
  }
  return false;
}

function prerequisiteMatchesOrDepends(
  prerequisiteId: string,
  search: DependencySearch,
  visited: Set<string>,
): boolean {
  if (prerequisiteId === search.targetMissionId) {
    return true;
  }
  if (visited.has(prerequisiteId)) {
    return false;
  }
  visited.add(prerequisiteId);
  const dependency = search.missions.get(prerequisiteId);
  return dependency === undefined ? false : dependsOn(dependency, search, visited);
}
