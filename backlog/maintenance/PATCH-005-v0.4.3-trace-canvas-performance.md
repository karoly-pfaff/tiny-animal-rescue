# PATCH-005: Stabilize trace canvas rendering performance

- Status: In progress
- Target version: `0.4.3`
- Branch: `fix/PATCH-005-v0.4.3-trace-canvas-performance`
- Commit type: `fix`
- Aggregate gate: `validate:full`
- Publishes release: `yes`
- Requires live inspection: `yes`
- Inspection journeys: `trace`
- Type: Compatible player-visible rendering-performance correction
- ADRs: ADR-0001, ADR-0009, ADR-0012, ADR-0018

## Outcome

Keep the Trace interaction inside its accepted throttled-tablet frame budget by retaining one
responsive canvas observer for the mounted interaction and coalescing progress painting to animation
frames. The interaction contract, visuals, forgiving geometry, and the accepted 50 ms and 100 ms
performance budgets remain unchanged.

## Acceptance criteria

- [x] A mounted Trace interaction owns one responsive canvas observer instead of replacing it after
      every accepted pointer sample.
- [x] Multiple progress updates before the next browser frame produce one latest-state canvas paint.
- [x] Resize painting always reads the latest path, colors, corridor width, and progress.
- [x] Trace completion, pointer, accessibility, guidance, visual, and performance contracts remain
      unchanged.
- [x] The accepted performance thresholds and fixed three-measurement decision remain unchanged.
- [x] Root product, bundled base-pack, and materialization-lock versions are `0.4.3`.
- [ ] `validate:quick`, `validate:full`, live production-preview inspection, and the independent audit
      pass on the exact candidate.
- [ ] Merge and immutable `v0.4.3` publication occur only after direct owner authorization; one
      instruction may cover both operations while provider records remain distinct.

## Verification

```text
npx vitest run tests/unit/trace.test.tsx tests/unit/trace-presentation.test.tsx tests/unit/trace-performance.test.ts tests/unit/responsive-canvas.test.ts
npm run test:e2e -- --grep "traces a forgiving scaled route"
npm run validate:quick
npm run validate:full
```

This patch changes player-visible Trace rendering, so ADR-0012 live product inspection applies to the
exact candidate even though its intended output is visually unchanged.
