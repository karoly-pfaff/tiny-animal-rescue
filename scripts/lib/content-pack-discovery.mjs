import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const directoryPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/u;
const contentDirectoryNames = ['animals', 'locations', 'missions', 'shelterAreas'];

export async function discoverContentPacks(contentRoot, validators) {
  const directories = await packDirectories(contentRoot);
  const candidates = await Promise.all(
    directories.map((directory) => readPackManifest(contentRoot, directory)),
  );
  const packs = [];
  for (const candidate of candidates.filter((value) => value !== undefined)) {
    validators.validateManifest(candidate.manifest, candidate.packPath);
    packs.push(await loadPackRecords(normalizeCandidate(candidate), validators.validateRecord));
  }
  validatePackGraph(packs);
  validateGlobalRecordIds(packs);
  return freezeRecursively(structuredClone(packs));
}

function normalizeCandidate(candidate) {
  return {
    ...candidate,
    manifest: {
      ...candidate.manifest,
      dependencies: Object.freeze([...(candidate.manifest.dependencies ?? [])]),
    },
  };
}

export function validateContentDirectoryPath(value, label) {
  if (typeof value !== 'string' || !directoryPattern.test(value)) {
    throw new Error(`${label} must be a non-empty pack-relative lower-kebab directory.`);
  }
  return value;
}

async function packDirectories(contentRoot) {
  const entries = await readdir(contentRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name)
    .sort();
}

async function readPackManifest(contentRoot, directory) {
  const packPath = join(contentRoot, directory, 'pack.json');
  const source = await readOptionalFile(packPath);
  if (source === undefined) {
    return undefined;
  }
  const manifest = JSON.parse(source);
  validateManifestDirectories(manifest, packPath);
  return { directory: resolve(contentRoot, directory), manifest, packPath };
}

async function readOptionalFile(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function validateManifestDirectories(manifest, packPath) {
  if (!isObject(manifest) || !isObject(manifest.content)) {
    throw new Error(`${packPath} must declare a content object before discovery.`);
  }
  for (const name of contentDirectoryNames) {
    validateContentDirectoryPath(manifest.content[name], `${packPath} content.${name}`);
  }
}

async function loadPackRecords(candidate, validateRecord) {
  const records = {};
  for (const name of contentDirectoryNames) {
    const directory = join(candidate.directory, candidate.manifest.content[name]);
    records[name] = await loadRecordDirectory(directory, name, validateRecord);
  }
  return { ...candidate, records };
}

async function loadRecordDirectory(directory, kind, validateRecord) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map(({ name }) => name)
    .sort();
  return Promise.all(files.map((file) => readRecord(join(directory, file), kind, validateRecord)));
}

async function readRecord(path, kind, validateRecord) {
  const record = JSON.parse(await readFile(path, 'utf8'));
  validateRecord(kind, record, path);
  return record;
}

function validatePackGraph(packs) {
  const index = new Map();
  for (const pack of packs) {
    if (index.has(pack.manifest.id)) {
      throw new Error(`Duplicate pack ID: ${pack.manifest.id}`);
    }
    index.set(pack.manifest.id, pack);
  }
  const context = { index, visiting: new Set(), visited: new Set() };
  for (const pack of packs) {
    visitPack(pack, [], context);
  }
}

function visitPack(pack, trail, context) {
  if (context.visited.has(pack)) return;
  if (context.visiting.has(pack)) {
    throw new Error(
      `Content pack dependency cycle: ${JSON.stringify([...trail, pack.manifest.id])}`,
    );
  }
  if (pack.manifest.id === 'base' && pack.manifest.dependencies.length > 0) {
    throw new Error('The base pack cannot depend on an expansion pack.');
  }
  context.visiting.add(pack);
  for (const dependencyId of [...pack.manifest.dependencies].sort()) {
    const dependency = context.index.get(dependencyId);
    if (dependency === undefined) {
      throw new Error(`Pack ${pack.manifest.id} depends on missing pack ${dependencyId}.`);
    }
    visitPack(dependency, [...trail, pack.manifest.id], context);
  }
  context.visiting.delete(pack);
  context.visited.add(pack);
}

function validateGlobalRecordIds(packs) {
  const owners = new Map();
  for (const pack of packs) {
    for (const records of Object.values(pack.records)) {
      for (const record of records) {
        const owner = owners.get(record.id);
        if (owner !== undefined) {
          throw new Error(
            `Duplicate global content ID ${record.id} in packs ${owner} and ${pack.manifest.id}.`,
          );
        }
        owners.set(record.id, pack.manifest.id);
      }
    }
  }
}

function freezeRecursively(value) {
  for (const child of Object.values(value)) {
    if (child instanceof Object) freezeRecursively(child);
  }
  return Object.freeze(value);
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
