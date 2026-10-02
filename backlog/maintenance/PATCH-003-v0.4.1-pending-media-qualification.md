# PATCH-003: Accept declared pending media during qualification

- Status: In progress
- Target version: `0.4.2`
- Branch: `fix/PATCH-003-v0.4.1-pending-media-qualification`
- Commit type: `fix`
- Aggregate gate: `validate:full`
- Publishes release: `yes`
- Requires live inspection: `no`
- Type: Compatible post-release qualification-policy correction
- ADRs: ADR-0011, ADR-0013

## Outcome

Correct the trusted media validator exposed while qualifying EPIC-004. A candidate may declare
future optional production media as `r2-pending` without pretending that those files were downloaded,
while every `r2-locked` object remains one-to-one with its immutable lock and materialized bytes.

## Acceptance criteria

- [x] Trusted media qualification validates physical files only for `r2-locked` manifest records.
- [x] An optional `r2-pending` record without a lock or local file is accepted and remains unavailable
      as release media.
- [x] A required role cannot be satisfied by an `r2-pending` record.
- [x] A pending record with a materialization lock, a locked record without a lock, lock drift,
      missing bytes, or unexpected local media remains rejected.
- [x] Root product, bundled base-pack, and materialization-lock versions are `0.4.2`.
- [x] Regression fixtures, `validate:quick`, `validate:full`, and the independent audit pass on the
      exact candidate.
- [ ] Merge and immutable `v0.4.2` publication occur only after direct owner authorization; one
      instruction may cover both operations while provider records remain distinct.

## Verification

```text
npm run test:governance
npm run validate:quick
npm run validate:full
```

This patch changes only release qualification policy and metadata. It has no player-visible runtime,
content, or production-media change, so ADR-0012 live product inspection does not apply.
