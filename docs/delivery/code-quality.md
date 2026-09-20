# Code quality contract

This document is the normative code-quality contract for human and automated contributors. It
governs judgment that cannot be reduced to a tool configuration. The mechanical enforcement is
defined once in [quality gates](quality-gates.md). Passing every gate is the floor, not evidence
that a design is good.

The accepted ADRs, product scope, and epic acceptance criteria take precedence over this document.
No quality rule authorizes product-scope expansion.

## Design rules

- Choose the simplest design that is correct, kind, deterministic, and maintainable. Complexity
  needs a current requirement or measured risk; "we may need it later" is not a requirement.
- Give each module, file, component, function, type, and test one coherent responsibility and one
  primary reason to change. Keep one level of abstraction inside a function.
- Keep policy with the domain that owns it. Cross a domain boundary through a narrow typed contract,
  and point dependencies toward the more stable contract.
- Prefer explicit data flow and composition over inheritance, hidden mutable state, service locators,
  implicit registries, and module-load side effects.
- Extract shared code only when it represents the same rule or knowledge. Similar-looking code with
  different owners may stay separate when sharing it would couple those owners.
- Do not introduce a generic abstraction without two real consumers, except when an accepted ADR or
  an external platform contract requires the boundary in advance.
- Keep public surfaces smaller and more stable than their implementations. Every export, persisted
  field, schema property, content enum member, and test helper promoted to production is a contract.
- Optimize only against evidence. Record the measurement, budget, and trade-off beside performance
  work that makes code materially harder to understand.

## Architecture ownership

The boundaries in [architecture overview](../architecture/overview.md) are enforced in lint and
tests as soon as the relevant modules exist.

- `sources/app/` is the composition root. It may wire domains together but must not absorb their
  policy.
- `sources/content/` owns discovery, validation, normalization, and resolution. It does not import
  concrete missions, residents, React screens, or engine implementations.
- `sources/engine/` coordinates normalized steps and domain events. It never branches on a concrete
  base-game mission, animal, location, or pack ID.
- `sources/interactions/` owns reusable input behavior. An interaction emits typed events and does
  not mutate global progress.
- `sources/persistence/` owns serialization and migration. It stores identifiers and progress, not
  duplicated content records or asset URLs.
- `sources/audio/`, `sources/i18n/`, `sources/shelter/`, and `sources/ui/` consume semantic contracts;
  they do not parse raw content JSON or reach around the content resolver.
- Circular production dependencies are forbidden. A relative path, alias, barrel, or dynamic import
  must not be used to bypass an ownership rule.
- Content remains declarative. Executable pack code, expressions, arbitrary callbacks, and
  content-selected dynamic imports are forbidden by ADR-0007.

## TypeScript rules

- Compile all authored TypeScript under the strict options in
  [quality gates](quality-gates.md#typescript-baseline). A weaker local `tsconfig` is not allowed.
- Treat external data, persisted data, JSON, browser storage, and caught errors as `unknown` until
  validated at the first owned boundary. A TypeScript type annotation is not runtime validation.
- Do not use explicit `any`, non-null assertions, unchecked double assertions, `@ts-ignore`, or
  `@ts-nocheck`. `@ts-expect-error` is allowed only in a negative type test with a reason.
- Prefer discriminated unions, literal types, and exhaustive `switch` statements. An unhandled union
  member must fail compilation through a `never` check.
- Prefer immutable inputs and return values. Reducers, selectors, validators, normalizers, geometry,
  hint transitions, reward calculation, and migrations are pure unless their boundary says otherwise.
- Do not encode absence with magic strings, sentinel numbers, or partially initialized objects. Use
  an explicit union or optional field whose meaning is documented.
- Use an options object for several related inputs. Positional booleans are forbidden when the call
  site cannot explain their meaning.
- Await or deliberately handle every promise. Fire-and-forget work needs an explicit owner, error
  path, cancellation policy, and `void` marker approved by lint.
- Model recoverable domain outcomes separately from unexpected programmer faults. Never swallow an
  error, log-and-continue without a contract, or silently fall back to a different authority.
- Time, randomness, storage, audio, and browser visibility enter domain code through injectable
  boundaries so tests can be deterministic.

## React and browser rules

- Components and hooks are functions. Render is pure: no storage writes, audio playback, navigation,
  registry mutation, or state synchronization during render.
- Derive values during render or in a selector instead of copying derivable state. Use an effect only
  to synchronize with an external system, and always define cleanup for listeners, timers, pointer
  capture, audio, and async work.
- A production UI file normally exports one primary component. Extract a child only when it owns a
  coherent behavior, state boundary, or independently testable concept.
- Use semantic DOM before ARIA and DOM/SVG before canvas. Canvas remains limited to wipe and trace;
  essential guidance and controls need a non-canvas semantic representation.
- Use Pointer Events as the single input abstraction. Mouse-only, touch-only, click-coordinate, and
  viewport-assumption branches are forbidden in player interactions.
- Stable domain IDs are valid React keys. Array indexes and generated randomness are not valid keys
  for persistent or reorderable elements.
- Player-facing strings are localization keys rendered at runtime. Assets are reached only through
  the content resolver. Do not hard-code public paths, locale text, or baked text in scene assets.
- `dangerouslySetInnerHTML` is forbidden unless an accepted ADR defines a sanitizer and trust model.
- Styling uses named tokens for shared color, spacing, typography, radius, shadow, motion, and layer
  order. One-off numeric scene coordinates belong to typed scene declarations, not scattered CSS.
- Reduced-motion, muted-audio, portrait, background/resume, and pointer-cancellation behavior are
  normal states, not optional polish.

## Modules, names, and APIs

- Organize production code by domain concept, not syntax. Avoid catch-all `types.ts`, `utils.ts`,
  `helpers.ts`, `common.ts`, and `manager.ts` modules.
- Source filenames use lower-case kebab-case; React component/type names use PascalCase; functions and
  values use camelCase; constants use camelCase unless an external protocol fixes another spelling.
- Prefer named exports. Default exports are limited to framework/tool configuration and integration
  points that require them.
- Use names that state domain intent. Avoid generic names such as `data`, `item`, `thing`, `handler`,
  or `process` when the domain supplies a precise term.
- Boolean names state the proposition (`is`, `has`, `can`, `should`). Event names state what happened,
  and tests describe behavior rather than method names.
- `index.ts` is a deliberately reviewed public entry point. It may re-export a small surface; it must
  not implement registries, services, components, validation, or policy.
- Import the owning module directly inside a domain. Do not use a public barrel to hide an internal
  dependency cycle.
- Comments explain constraints, invariants, child-safety reasoning, or non-obvious trade-offs. They do
  not narrate the next line, preserve dead code, or compensate for vague names.
- A TODO/FIXME must name a backlog story or issue, an owner, and a removal milestone. Otherwise fix it
  now or remove it.
- Generated files must be marked, reproducible, excluded narrowly from hand-authored rules, and
  checked for drift in CI. Never hand-edit generated output.
- Code, identifiers, comments, commit messages, and repository documentation are written in English.
  Hungarian and English player copy live only in locale data.

## Dependency and supply-chain rules

- Prefer browser and language platform capabilities before adding a dependency.
- Every new direct dependency needs a concrete use, active maintenance, acceptable license, browser
  compatibility, bundle-cost review, and confirmation that an existing dependency cannot do the job.
- Exact Node and npm versions are pinned and verified by preflight; the lockfile is committed. CI
  installs the declared npm version and then runs `npm ci`.
- Do not add a second library for the same responsibility without documenting why consolidation is
  unsafe or materially worse.
- Install scripts, dependency overrides, forks, Git dependencies, and vulnerability suppressions need
  a local comment or decision record naming the reason, owner, and removal condition.
- No secret, token, personal data, private endpoint, or identifiable child-observation data may enter
  source, fixtures, snapshots, screenshots, logs, build artifacts, or documentation.

## Test rules

- Test observable behavior and owned contracts, not private call order or implementation structure.
- Cover the successful path and the meaningful boundary, invalid-input, cancellation, replay,
  background/resume, and failure paths.
- Every defect fix begins with a regression test that fails without the fix.
- Pure policies and state transitions use unit tests; cross-domain behavior uses integration tests;
  browser tests are reserved for high-value player flows, input behavior, viewport behavior, and
  runtime integration.
- A mock must not bypass the validation, persistence, ownership, localization, or input boundary the
  test claims to prove. Prefer in-memory implementations of real ports over behaviorless mocks.
- Snapshots and DOM existence assertions cannot be the sole proof of interaction correctness or visual
  quality. Visual changes require inspected screenshots at the affected reference viewports/locales.
- Tests use fake clocks, seeded randomness, isolated saves, and deterministic fixtures. Network,
  wall-clock narration duration, execution order, and prior test state must not influence a result.
- A skipped, focused, quarantined, or retried-only passing test is not green. Any temporary skip needs
  a tracked owner and removal milestone and blocks an epic exit if it covers that epic's contract.
- Coverage thresholds are a backstop. High percentages do not replace scenario selection, mutation of
  inputs at trust boundaries, or a reviewer reading whether the assertion proves the contract.

## Change discipline

- Keep each change scoped to one backlog story or one explicit contract correction. Do not mix
  opportunistic refactors, formatting sweeps, dependency updates, and player behavior.
- Update schemas, runtime types, examples, tests, docs, and generated registries atomically when one
  contract changes.
- Remove obsolete code and flags in the same change that makes them obsolete. Compatibility shims need
  a named removal version.
- Do not weaken a gate to make a change pass. Fix the code or record a narrow, temporary exception.
- An exception must be the smallest possible scope, explain why the rule is wrong for that line, name
  an owner and backlog item, and state the milestone that removes it. File-wide disables and silent
  ignore globs are forbidden.
- Repeated exceptions mean the design or the rule is wrong. Resolve the root decision instead of
  accumulating suppressions.

## Review checklist

Before handoff, the implementer and the independent reviewer ask:

1. Does every changed unit have one clear owner and reason to change?
2. Do dependencies point in the allowed direction without a barrel, alias, or callback bypass?
3. Is any abstraction, option, export, fallback, or compatibility path speculative?
4. Are external input, cancellation, partial failure, retries, and persistence boundaries explicit?
5. Are unions exhaustive and are unsafe casts, null assertions, and hidden mutable state absent?
6. Do names and signatures explain the behavior without narrating comments?
7. Do tests prove behavior at the correct boundary, including a regression test for each fix?
8. Are time, randomness, audio, storage, and viewport behavior deterministic under test?
9. Are HU/EN, audio/visual guidance, touch/mouse, reduced motion, and replay still equivalent where
   the change reaches them?
10. Did the change introduce a mission/animal ID branch, direct asset path, inline player string,
    executable content, or duplicated content definition?
11. Are dead code, duplicate knowledge, generic buckets, unowned TODOs, and unrelated edits absent?
12. Do ADRs, schemas, examples, backlog status, release notes, and implementation tell the same truth?
