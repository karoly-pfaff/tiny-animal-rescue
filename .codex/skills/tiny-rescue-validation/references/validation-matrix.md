# Validation matrix

| Target                 | Required evidence                                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary code story    | acceptance-criteria inspection, typecheck, lint, focused unit/integration tests                                                                                                              |
| Mission/content change | schema, semantic references, progression, rewards, capacity, localization, ownership, assets, focused integration test                                                                       |
| Interaction primitive  | geometry/state unit tests, touch/mouse input, cancellation, wrong action, guidance, viewport visual check                                                                                    |
| Persistence change     | repository tests, transaction/idempotency, reload, migration, corrupt/future version behavior                                                                                                |
| Localization/audio     | HU/EN parity, glyph/overflow screenshots, narration inventory, channel/replay/pause integration tests                                                                                        |
| Visual asset           | full-size visual inspection against art direction, dimensions/transparency, safe zones, text-free or exact-copy policy                                                                       |
| Music/effect asset     | semantic runtime ID, pack-relative shared path, source prompt/references, edit/mastering history, duration/format, category/channel, loop/repetition/overlap QA, defects, provenance/license |
| Epic M0–M6             | every story criterion plus the epic exit criteria and `validate:full`                                                                                                                        |
| Epic M7–M9             | every story criterion plus the epic exit criteria and `validate:release`                                                                                                                     |
| GA promotion           | qualified M9 candidate, allowed-diff proof, complete release checklist, `validate:release`, clean HU/EN playthrough evidence, artifact identity, licenses/provenance                         |

## Default command progression

When the implementation provides the planned scripts:

1. focused test or validator for the changed domain;
2. `npm run typecheck` and `npm run lint` for code changes;
3. `npm run test:content` for content changes;
4. `npm run test:assets` for generated or edited asset changes;
5. `npm run validate:quick` before story completion;
6. `npm run validate:full` for M0–M6 epic or ordinary merge completion;
7. `npm run validate:release` for M7–M9 and GA promotion.

If scripts do not exist yet, validate only what the current epic promises and report the missing future gate as not-yet-applicable rather than pretending it ran.
