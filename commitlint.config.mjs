import { readFileSync, readdirSync } from 'node:fs';

const backlogScopes = readdirSync('backlog/epics')
  .filter((name) => /^EPIC-\d{3}-.+\.md$/u.test(name))
  .flatMap((name) => {
    const epicId = /^EPIC-(?<id>\d{3})-/u.exec(name)?.groups?.id;
    const content = readFileSync(`backlog/epics/${name}`, 'utf8');
    return [
      `EPIC-${epicId}`,
      ...[...content.matchAll(/^### (?<story>E\d{3}-S\d{2})\b/gmu)].map(
        (match) => match.groups?.story,
      ),
    ];
  })
  .filter((scope) => scope !== undefined);

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
    'scope-case': [2, 'always', ['upper-case']],
    'scope-enum': [2, 'always', ['SPEC-BASELINE', ...backlogScopes]],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
  },
};
