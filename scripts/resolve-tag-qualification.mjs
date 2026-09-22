import { appendFile, readFile } from 'node:fs/promises';
import { createGithubHistoryClient } from './lib/github-history.mjs';
import { git } from './lib/history-repository.mjs';
import { inspectionRecordFromGithub } from './lib/inspection-policy.mjs';
import { requiredEnvironment } from './lib/workflow-input.mjs';

const event = JSON.parse(await readFile(requiredEnvironment('GITHUB_EVENT_PATH'), 'utf8'));
if (event.ref === undefined || !event.ref.startsWith('refs/tags/v')) {
  throw new Error('Tag qualification resolver requires a version-tag push event.');
}
const tagName = event.ref.replace('refs/tags/', '');
const message = git(['for-each-ref', `refs/tags/${tagName}`, '--format=%(contents)']).trim();
const inspectionCommentId = Number(/^Inspection-Comment: #(?<id>\d+)$/mu.exec(message)?.groups?.id);
if (!Number.isInteger(inspectionCommentId) || inspectionCommentId <= 0) {
  throw new Error('Annotated tag crosswalk has no inspection-comment identity.');
}
const repository = requiredEnvironment('GITHUB_REPOSITORY');
const { github } = createGithubHistoryClient(repository, requiredEnvironment('GITHUB_TOKEN'));
const inspection = await github(`/issues/comments/${inspectionCommentId}`).then((comment) =>
  inspectionRecordFromGithub(comment, { github, repository }),
);
const runId = inspection.artifact?.workflowRun?.id;
const artifactName = inspection.artifact?.name ?? '';
if (
  !Number.isInteger(runId) ||
  runId <= 0 ||
  !/^media-qualified-[0-9a-f]{40}-[0-9a-f]{64}-[0-9a-f]{64}$/u.test(artifactName)
) {
  throw new Error('Tag inspection does not identify an exact retained qualification artifact.');
}
await appendFile(
  requiredEnvironment('GITHUB_OUTPUT'),
  `run_id=${runId}\nartifact_name=${artifactName}\n`,
);
console.log(`Resolved qualification artifact ${artifactName} from run ${runId}.`);
