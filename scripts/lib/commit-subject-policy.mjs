const closureSubject = /^close milestone M\d+$/u;

export function isAllowedSubjectCase(subject) {
  return subject === subject.toLocaleLowerCase('en-US') || closureSubject.test(subject);
}

export function commitlintSubjectCase(parsed) {
  const valid = isAllowedSubjectCase(parsed.subject ?? '');
  return [valid, 'subject must be lower-case except for an exact milestone M<number> closure'];
}
