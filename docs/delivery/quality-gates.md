# Quality gates

This document is the single source of truth for mechanically enforced engineering gates. The design
rules they support are in [code quality](code-quality.md); test selection is in the
[testing strategy](../architecture/testing-strategy.md).

All commands are non-interactive, deterministic, cross-platform, and exit non-zero on a finding.
Warnings are failures. A green local cache must not be required for a green clean checkout.

## Toolchain baseline

- Pin an exact Node release in `.node-version`; `package.json#engines` documents the compatible line.
- Pin an exact npm version in `package.json#packageManager`, enforce it with a repository preflight
  (and `devEngines.packageManager` with `onFail: "error"` when supported), configure CI to install that
  exact version, and commit `package-lock.json`. Do not assume `packageManager` alone selects npm.
- CI and release verification install through `npm ci`, which performs a frozen install and fails
  when the manifest and lockfile disagree.
- Use one root configuration per tool unless a documented platform distinction requires an override.
  A nested config may strengthen rules but must not silently weaken them.
- Tool versions change only in an ordinary reviewed dependency update with release-note review and a
  passing full gate.

## TypeScript baseline

Use `strict: true` plus, at minimum:

```json
{
  "noEmit": true,
  "forceConsistentCasingInFileNames": true,
  "isolatedModules": true,
  "noFallthroughCasesInSwitch": true,
  "noImplicitOverride": true,
  "noPropertyAccessFromIndexSignature": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "useUnknownInCatchVariables": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "verbatimModuleSyntax": true
}
```

Production, test, build-tool, and configuration TypeScript are all typechecked. Test compilation must
not hide production errors through a weaker project configuration.

## Static quality gates

| Gate | Tool and required behavior | Failure condition |
|---|---|---|
| Format | Prettier in check mode over authored TS/TSX/JS/JSON/CSS/Markdown/YAML | Any file would change |
| Typed lint | ESLint flat config with typescript-eslint type-aware strict rules and React Hooks rules | Any error or warning; run with `--max-warnings=0` |
| Duplication | Repository wrapper around jscpd strict mode over authored production/tool source, `minLines: 8`, `minTokens: 100`, `threshold: 0` | Any qualifying clone; wrapper also fails unless its machine report proves at least one eligible authored file/token set was scanned |
| Dead code | Knip over production, tests, scripts, Vite, Vitest, and Playwright entry points | Any unused file, export, type, dependency, unresolved import, cycle, config hint, or tag hint |
| Type safety | `tsc --noEmit` using the repository project graph | Any diagnostic |
| Documentation | Markdown lint plus local link, anchor, referenced-file, and image-path validation | Any malformed document or broken local reference |

Generated files, `build/`, coverage, browser reports, third-party code, and binary assets are excluded
by precise paths. Tests may be excluded from duplicate detection, but not from formatting, lint,
typecheck, or Knip. An ignore must state why the tool cannot discover a real entry point; declaring
every file an entry point to silence Knip is forbidden.

### Formatting baseline

Prettier owns layout with `printWidth: 100`, two-space indentation, single quotes in code, semicolons,
trailing commas where valid, and LF endings. EditorConfig requires UTF-8, LF, final newline, and no
trailing whitespace. Contributors do not hand-format around Prettier or mix formatter-only churn into
a behavioral change.

### ESLint structural limits

Production TS/TSX starts with these hard maximums:

| Rule | Maximum |
|---|---:|
| Cyclomatic complexity | 5 |
| Statements per function | 10 |
| Nesting depth | 4 |
| Parameters | 3 |
| Lines per function | 120, excluding blank/comment lines |
| Lines per file | 250, excluding blank/comment lines |

The numbers are extraction signals, not targets. Tests may disable statement, file, function-length,
and complexity limits for readable arrange-act-assert scenarios; correctness, parameter-count, typed
lint, and unused-code rules still apply. Declarative schema/config files may receive a narrow path
override when splitting them would reduce clarity.

The lint baseline also rejects explicit `any`, non-null assertions, floating/misused promises,
unnecessary assertions, unsafe assignments/calls/returns, non-exhaustive switches, unused variables,
value imports used only as types, `var`, loose equality, braceless control flow, and bare production
`console` calls.

## Automated test gates

### Unit and integration

- Vitest runs unit and integration suites on every pull request and push to `main`.
- Global authored-source coverage is at least 90% for statements, lines, and functions and 85% for
  branches from the first implementation epic onward.
- Mission reducers, progression selectors, semantic content validators, hint-state transitions,
  reward idempotency, and every save migration require 100% branch coverage.
- Coverage excludes only generated code, type-only declarations, and deliberately declarative data.
  UI files are not excluded merely because browser tests cover them.
- Thresholds never decrease. A justified change to the measured file set is reviewed like a gate
  change and records the before/after report.

### Content

`test:content` validates schema, TypeScript/schema compatibility, semantic references, cycles,
ownership, localization/audio parity, asset existence and metadata, shelter capacity, step counts,
catalog rules appropriate to the current epic, and forbidden executable content.

`test:content:release` adds the release-only rules: no placeholder, complete final media, and exact
normative v1 IDs/counts. It is required from M7/EPIC-007 onward and is composed into
`validate:release`; it does not block intentionally incomplete content work in EPIC-002–006.

`test:assets` validates every production media inventory and pack-owned path. For visuals it checks
dimensions/transparency expectations, production-safe versus presentation-only classification,
prompt/reference record, QA disposition, and provenance/license status. For music/effects it checks
semantic runtime ID, final source prompt, generator/date when known, edit/mastering history,
duration/format/loop or overlap QA, channel/category, and provenance/license status. Files under
`screens/` are presentation references and must never resolve through a production content record.

### Browser and visual

- Playwright runs against a production build and static preview, not only the Vite development server.
- E2E runs on every pull request and push to `main`; it exercises touch emulation and mouse fallback.
- The smoke matrix always includes 1024x768 landscape and 768x1024 portrait. The full matrix also
  includes 1280x800 and 1366x1024 and runs before epic completion and release.
- Retries are disabled for required checks. A flaky test is a failure to diagnose, not a result to
  average away.
- A failing browser check retains trace, screenshot, video when useful, console errors, and the built
  artifact. Unexpected console errors and unhandled rejections fail the run.
- Visual baselines are reviewed images, not auto-approved output. A baseline update belongs in the
  same change as the intentional UI change and names the affected locale and viewport.
- Automated accessibility checks run in component and Playwright layers on every pull request. They
  catch semantic/ARIA/focus defects but never replace the motor, audio/visual, sensory, reading, and
  observed-child checks required by this product.

## Dependency and artifact gates

- `npm audit --audit-level=high` blocks unresolved high or critical advisories. Lower findings require
  written triage before an epic release; `npm audit fix --force` is never run as an unreviewed fix.
- A pinned secret scanner runs over the change and repository history available to CI. CodeQL (or an
  explicitly approved equivalent static security analysis) runs on pull requests, `main`, and a
  schedule; a High/Critical finding blocks merge and release.
- `audit:licenses` inventories the complete shipped transitive dependency graph plus fonts/audio/art,
  not only direct packages. MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, CC0-1.0, and
  OFL-1.1 may be allowlisted for their appropriate artifact class; attribution licenses require the
  promised credits. Copyleft, source-available, custom, unknown, or missing licenses block until the
  user/maintainer records a compatibility decision.
- A production build must contain no source secret, absolute development path, development endpoint,
  test-only route, debug overlay, placeholder asset, or identifiable observation data.
- Public production output contains no source map or embedded source/debug metadata. If private source
  maps are authorized later, they are a separately access-controlled artifact and never enter
  `build/` or the deployed static bundle. `test:artifact` enforces this policy plus version metadata,
  asset resolution, forbidden files/strings, and a recorded artifact digest.
- Release validation emits a machine-readable software bill of materials and asset provenance/license
  inventory tied to the artifact digest.
- Bundle and asset-size reports are retained from EPIC-008 onward. A budget increase requires the
  measurement and an explicit product trade-off; it is not hidden by changing the baseline.

## Required commands

The root `package.json` provides these stable scripts:

```text
npm run format
npm run format:check
npm run lint
npm run lint:code
npm run lint:duplicates
npm run lint:dead-code
npm run lint:docs
npm run lint:history
npm run typecheck
npm run test
npm run test:unit
npm run test:integration
npm run test:content
npm run test:content:release
npm run test:assets
npm run test:a11y
npm run test:e2e
npm run test:visual
npm run test:preview
npm run audit:dependencies
npm run audit:licenses
npm run scan:secrets
npm run scan:static
npm run validate:waivers
npm run build
npm run test:artifact
npm run validate:quick
npm run validate:full
npm run validate:release
```

`test` runs unit and integration suites with configured coverage thresholds. `lint` composes code,
duplication, and dead-code checks.

`validate:quick` is the story-development gate: format check, all lint/documentation gates, typecheck,
unit and integration tests with coverage, content/asset/accessibility validation, secret scan, and
production build.

`validate:full` is the merge and ordinary epic gate: `validate:quick`, Conventional Commit/history
and watermark validation, waiver validation, dependency and shipped-license audit, local static
analysis, production-preview smoke, serialized E2E at the full supported viewport matrix, visual
regression, and built-artifact inspection.

`validate:release` is the M7, M8, M9, and GA-promotion gate: `validate:full` plus
`test:content:release`, final asset/provenance rules, SBOM, release metadata, artifact digest, and the
applicable release checklist. All aggregate commands call the same underlying repository scripts as
CI. Provider-hosted CodeQL is the explicit additional exception: it uses checked-in configuration,
publishes SARIF, and does not replace `scan:static`.

`lint:history` has the offline `branch` mode and provider-backed `pull-request`, `merge-queue`, `main`,
and `tag` modes defined by the story-commit workflow. Each mode has explicit required inputs and fails
when they are absent. The hosted `history` check calls the same validator with trusted event metadata;
network-backed PR uniqueness is not pretended to be an offline local check.

## Continuous integration contract

Every pull request, merge queue candidate if enabled, and push to `main` runs required, non-skippable
checks with stable names:

| Required check | Contents |
|---|---|
| `quality` | format, ESLint, jscpd, Knip, typecheck |
| `history` | story/epic commit shape, Conventional Commits, PR story map, watermark/signature rejection |
| `tests` | unit, integration, coverage, content/asset contracts, automated accessibility |
| `browser` | production build, preview smoke, E2E viewport/input matrix |
| `visual` | deterministic screenshot comparison with retained diffs |
| `supply-chain` | frozen install, dependency advisory, shipped-license/SBOM and provenance checks |
| `security` | repository secret/static scans plus provider-hosted CodeQL SARIF |

`main` is protected: no direct push, no force push, no merge with a missing/stale/failing required
check, and no administrator bypass except a documented emergency. Required workflows cannot use path
filters that leave a check absent. Concurrency cancellation may stop an obsolete run only after a newer
commit for the same change has started its replacement run.

CI retains machine-readable test and coverage reports plus failure artifacts. An epic release records
the successful run URL or equivalent local evidence from a clean checkout.

## Gate-change and exception policy

A tool/config/schema/CI change that alters what is checked receives the same tests and independent
audit as production code. It must include a failing fixture or other proof that the gate detects its
target defect.

A suppression is allowed only when it is narrower and more truthful than changing production design.
It names the reason, owner, backlog item, and removal milestone. Blanket legacy baselines, percentage
ratchets that permit new debt, unexplained ignore globs, and "temporary" disables without an expiry are
forbidden.

Any temporary exception follows the [quality waiver policy](quality-waivers.md) and has a matching
machine-authoritative entry in [`quality-waivers.json`](../../quality-waivers.json). An absent,
expired, broadened, unmatched, or unapproved entry is a gate failure; the registry does not authorize
exceptions forbidden by product or safety contracts.

If a gate is flaky, slow, or incorrect, fix the gate. Do not make it optional, retry it into green, or
move it out of the required pipeline while it still claims to protect a release contract.

## Authoritative references

- [TypeScript `strict`](https://www.typescriptlang.org/tsconfig/strict.html) and
  [type-aware typescript-eslint](https://typescript-eslint.io/getting-started/typed-linting/)
- [ESLint flat configuration](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Prettier check mode](https://prettier.io/docs/cli#--check)
- [jscpd configuration and thresholds](https://jscpd.dev/getting-started/configuration)
- [Knip configuration](https://knip.dev/overview/configuration) and
  [project-file guidance](https://knip.dev/guides/configuring-project-files)
- [Vitest coverage](https://vitest.dev/guide/coverage) and
  [Playwright best practices](https://playwright.dev/docs/best-practices)
- [`npm ci`](https://docs.npmjs.com/cli/commands/npm-ci/) and
  [`npm audit`](https://docs.npmjs.com/cli/commands/npm-audit/)
- [GitHub required status checks](https://docs.github.com/en/pull-requests/reference/status-checks)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) and
  [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [GitHub CodeQL code scanning](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql)
