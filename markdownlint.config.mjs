export default {
  globs: ['**/*.md', '!node_modules/**', '!build/**', '!coverage/**'],
  config: {
    'line-length': false,
    'no-duplicate-heading': { siblings_only: true },
    'no-inline-html': false,
  },
};
