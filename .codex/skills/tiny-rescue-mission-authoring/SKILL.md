---
name: tiny-rescue-mission-authoring
description: Create or revise Tiny Rescue missions, residents, locations, shelter areas, and bundled content packs using the project's declarative contracts. Use for content authoring and content review; do not use for adding new engine mechanics or arbitrary executable behavior.
---

# Tiny Rescue Mission Authoring

Author content that feels bespoke while remaining fully expressible through the existing engine.

## Establish the contract

Locate the Tiny Rescue project root, then read:

1. `AGENTS.md`
2. `docs/product/v1-scope.md`
3. `docs/product/content-catalog.md`
4. `docs/architecture/content-contracts.md`
5. `docs/architecture/content-authoring-guide.md`
6. ADR-0002, ADR-0003, ADR-0004, ADR-0007, and ADR-0008

For an active backlog item, also read that story and its dependency epic. Treat accepted ADRs and the v1 scope as binding.

## Classify the request

- **Rescue:** introduces exactly one resident and must declare suitable shelter capacity.
- **Help:** reuses an unlocked resident and must depend on its Rescue mission.
- **World:** changes a location or assists a non-resident subject; it adds no resident.
- **Pack:** groups conforming records and assets; it does not add executable code or remote delivery.

If the request needs a sixth interaction type, pack-specific component, script, expression language, new reward action, or expanded v1 count, stop and report the required product/ADR decision. Do not disguise an engine change as content.

## Author the smallest complete content change

1. Choose stable kebab-case IDs and check for collisions.
2. Express the story in 2–4 steps using only `tap`, `drag`, `wipe`, `match`, and `trace`; a single continuous trace is the documented exception.
3. Make each step one clear action with a short semantic prompt key.
4. Define prerequisites, an idempotent reward, and the correct mission category.
5. Add or update animal/location/shelter-area records only when the story requires them.
6. Add HU and EN text keys together; inventory every required narration cue.
7. Declare pack-owned, text-free visual assets and language-correct audio paths.
8. Add contract, integration, and progression tests appropriate to the change.
9. Run the project's content validator and relevant quality gate.

Use [references/review-checklist.md](references/review-checklist.md) before handing off a new or substantially revised mission.

For every generated or edited asset, follow `prompts/README.md`. For visual production, also follow
the repo-local `tiny-rescue-visual-production` skill. For music or effects, select the semantic runtime
ID from `prompts/catalog.md` and apply the naming, format, loop, duration, mixing, and provenance rules
in `prompts/integration.md`. Generated output is source material until edited, QA-reviewed, licensed,
and registered in the pack asset inventory.

## Preserve these invariants

- No engine file branches on a concrete mission or animal ID.
- Rescue unlocks its subject resident exactly once; Help and World unlock none.
- Wrong actions remain reversible and non-punitive.
- Required actions never depend on reading or color alone.
- Generated or painted production art contains no text or pseudo-writing.
- Base content never references expansion-owned assets.
- New residents never exceed the declared shelter-area capacity.
- v1 remains exactly 16 missions and 12 residents unless the user explicitly changes scope.

## Deliverable

Report:

- records and assets added or changed;
- the resulting step sequence and reward;
- localization/audio inventory status;
- validation and tests run;
- any engine or scope decision that remains blocked.
