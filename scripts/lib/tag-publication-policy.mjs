import { createHash } from 'node:crypto';

const shaPattern = /^[0-9a-f]{40}$/u;
const releaseTagPattern =
  /^v(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:-(?<channel>alpha|beta|rc)\.(?<sequence>[1-9]\d*))?$/u;

function prereleaseRank(channel) {
  if (channel === 'alpha') return 0;
  if (channel === 'beta') return 1;
  return 2;
}

function parsedTag(tagName) {
  const groups = releaseTagPattern.exec(tagName)?.groups;
  return groups === undefined
    ? undefined
    : {
        major: Number(groups.major),
        minor: Number(groups.minor),
        patch: Number(groups.patch),
        prerelease:
          groups.channel === undefined
            ? undefined
            : { channel: groups.channel, sequence: Number(groups.sequence) },
      };
}

function comparePrereleases(left, right) {
  if (left === undefined) return right === undefined ? 0 : 1;
  if (right === undefined) return -1;
  return (
    prereleaseRank(left.channel) - prereleaseRank(right.channel) || left.sequence - right.sequence
  );
}

function compareVersions(left, right) {
  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch ||
    comparePrereleases(left.prerelease, right.prerelease)
  );
}

function sameCore(left, right) {
  return left.major === right.major && left.minor === right.minor && left.patch === right.patch;
}

function isInitialTarget(version) {
  return version.major === 0 && version.minor === 1 && version.patch === 0;
}

function isInitialParent(version) {
  return version.major === 0 && version.minor === 0;
}

function patchFollows(target, parent) {
  return (
    target.patch > 0 &&
    parent.major === target.major &&
    parent.minor === target.minor &&
    parent.patch + 1 === target.patch
  );
}

function minorFollows(target, parent) {
  return (
    target.patch === 0 &&
    target.minor > 0 &&
    parent.major === target.major &&
    parent.minor + 1 === target.minor
  );
}

function gaFollows(target, parent) {
  return (
    target.major === 1 &&
    target.minor === 0 &&
    target.patch === 0 &&
    parent.major === 0 &&
    parent.minor === 10
  );
}

function followsProductSequence(target, parent) {
  return patchFollows(target, parent) || minorFollows(target, parent) || gaFollows(target, parent);
}

function followsPrereleaseSequence(target, parent) {
  if (target.prerelease === undefined) return false;
  if (parent.prerelease === undefined) {
    return target.prerelease.sequence === 1 && followsProductSequence(target, parent);
  }
  if (!sameCore(target, parent)) return false;
  const channelAdvance =
    prereleaseRank(target.prerelease.channel) - prereleaseRank(parent.prerelease.channel);
  return channelAdvance === 0
    ? target.prerelease.sequence === parent.prerelease.sequence + 1
    : channelAdvance > 0 && target.prerelease.sequence === 1;
}

function completesPrerelease(target, parent) {
  return (
    target.prerelease === undefined && parent.prerelease !== undefined && sameCore(target, parent)
  );
}

function initialReleasePredecessor(target, parent) {
  if (!isInitialTarget(target) || !isInitialParent(parent)) return undefined;
  return target.prerelease === undefined || target.prerelease.sequence === 1 ? null : undefined;
}

export function releasePredecessorTag({ tagName, parentVersion }) {
  const target = parsedTag(tagName);
  const parentTag = `v${parentVersion}`;
  const parent = parsedTag(parentTag);
  if (target === undefined || parent === undefined) return undefined;
  const initialPredecessor = initialReleasePredecessor(target, parent);
  if (initialPredecessor === null) return null;
  if (target.prerelease !== undefined) {
    return followsPrereleaseSequence(target, parent) ? parentTag : undefined;
  }
  return completesPrerelease(target, parent) || followsProductSequence(target, parent)
    ? parentTag
    : undefined;
}

export function remoteTagNames(output) {
  return [
    ...new Set(
      output
        .split('\n')
        .map((line) => /refs\/tags\/(?<tag>v[^\s^]+)$/u.exec(line)?.groups?.tag)
        .filter((tag) => tag !== undefined),
    ),
  ];
}

export function remoteTagHistoryDigest(output) {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .toSorted();
  const normalized = lines.length === 0 ? '' : `${lines.join('\n')}\n`;
  return createHash('sha256').update(normalized).digest('hex');
}

export function validateTagSequence({ tagName, predecessorTag, existingTags }) {
  const target = parsedTag(tagName);
  const previous = predecessorTag;
  if (target === undefined || previous === undefined) {
    return ['Release tag is not a supported product or prerelease version.'];
  }
  const parsedExisting = existingTags.map(parsedTag);
  const supportedExisting = parsedExisting.filter((tag) => tag !== undefined);
  const latestTag = existingTags
    .filter((tag) => parsedTag(tag) !== undefined)
    .toSorted((left, right) => compareVersions(parsedTag(left), parsedTag(right)))
    .at(-1);
  const findings = [];
  if (parsedExisting.some((tag) => tag === undefined)) {
    findings.push('Release history contains an unsupported product tag.');
  }
  if (
    existingTags.includes(tagName) ||
    supportedExisting.some((tag) => compareVersions(tag, target) >= 0)
  ) {
    findings.push('Release history already contains the requested or a newer product tag.');
  }
  if (previous === null && supportedExisting.length > 0) {
    findings.push('Initial product tag requires an empty release history.');
  } else if (previous !== null && latestTag !== previous) {
    findings.push(`Latest product release is not deterministic predecessor ${previous}.`);
  }
  return findings;
}

export function validatePolicyAuthority({ workflowRef, workflowSha, policySha, protectedMainSha }) {
  const findings = [];
  if (workflowRef !== 'refs/heads/main') {
    findings.push('Tag publication policy must run from protected main.');
  }
  if (
    !shaPattern.test(workflowSha) ||
    !shaPattern.test(policySha) ||
    workflowSha !== policySha ||
    policySha !== protectedMainSha
  ) {
    findings.push(
      'Tag publication workflow, policy checkout, and live protected main must be the same commit.',
    );
  }
  return findings;
}

export function validateTagTargetCheckout({ targetSha, candidateSha }) {
  if (!shaPattern.test(targetSha) || candidateSha !== targetSha) {
    return ['Release target checkout does not match the merged squash SHA.'];
  }
  return [];
}

export function validateTagTargetAncestry({ targetSha, policySha, targetIsAncestor }) {
  if (!shaPattern.test(policySha) || targetIsAncestor !== true) {
    return ['Release target squash is not an ancestor of current protected main.'];
  }
  return shaPattern.test(targetSha) ? [] : ['Release target squash SHA is invalid.'];
}
