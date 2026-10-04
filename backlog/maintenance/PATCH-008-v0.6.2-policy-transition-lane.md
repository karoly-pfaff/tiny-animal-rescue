# PATCH-008: Admit reviewed workflow policy transitions

- Status: In progress
- Target version: `0.6.2`
- Branch: `fix/PATCH-008-v0.6.2-policy-transition-lane`
- Commit type: `fix`
- Aggregate gate: `validate:full`
- Publishes release: `yes`
- Requires live inspection: `no`
- Policy transition: `none`
- Type: Compatible release-governance correction
- ADRs: ADR-0009, ADR-0013, ADR-0014, ADR-0016, ADR-0017, ADR-0020

## Outcome

Remove the bootstrap deadlock that prevents trusted `main` from admitting an intentionally changed
workflow fingerprint. Preserve the old policy as the authority and allow only a declared, bounded,
owner-session transition whose normalized candidate workflow matches its successor fingerprint.

## Acceptance criteria

- [x] Maintenance metadata exposes a fail-closed `Policy transition` declaration; existing work items
      default to `none`.
- [x] Trusted `main` accepts only the allowlisted `publish` transition and only for an owner-session
      merge of a declared maintenance PATCH.
- [x] The ordinary trusted repository validator must report exactly the declared fingerprint mismatch
      and no structural or unrelated finding.
- [x] Exactly the declared workflow changes among workflow files.
- [x] The successor fingerprint equals the normalized candidate YAML fingerprint, every other
      workflow fingerprint remains unchanged, and trusted fingerprints match trusted workflows.
- [x] CI, merge, authorization, parser, transition-validator, ruleset, and credential-policy files
      remain identical to trusted `main` during a transition.
- [x] Candidate repository scripts are never executed with owner merge credentials.
- [x] Negative fixtures reject undeclared/unsupported transitions, unrelated findings, mismatched or
      unchanged fingerprints, another workflow change, and protected-boundary drift.
- [x] Root product, bundled base-pack, and materialization-lock versions are `0.6.2`.
- [x] Documentation explains the owner-session-only transition and its non-bypass boundary.
- [x] `validate:quick`, `validate:full`, and the bounded independent audit pass on the exact candidate.
- [ ] Merge and immutable `v0.6.2` publication occur only after direct owner authorization; one
      instruction may cover both operations while provider records remain distinct.

## Verification

```text
npm run test:governance
npm run validate:quick
npm run validate:full
```

This patch changes only trusted merge-policy tooling, governance fixtures, normative delivery
documentation, backlog state, and release metadata. It has no player-visible runtime, content, or
production-media change, so ADR-0012 live product inspection does not apply.
