# Voice catalog

| Group                       | Count per locale | Purpose                                        |
| --------------------------- | ---------------: | ---------------------------------------------- |
| Global                      |               12 | welcome, navigation, progress, repeat guidance |
| Locations and shelter areas |                7 | spoken place names                             |
| Shared hints                |               10 | first and stronger hint for five interactions  |
| Resident names              |               12 | narrator identification on shelter tap         |
| Parent confirmations        |                4 | settings and progress reset                    |
| Mission intros              |               16 | establish the animal or world problem          |
| Mission step prompts        |               38 | one clear active action per step               |
| Mission success             |               16 | calm named completion response                 |
| **Total**                   |          **115** | per locale                                     |

Total bilingual inventory: **230 voice lines**.

The exact ordered ID set is versioned in `canonical-ids.json`; this table summarizes it but does not
replace that machine-readable contract.

## Semantic key pattern

```text
voice.global.<event>
voice.location.<location-id>.name
voice.shelter.<area-id>.name
voice.hint.<interaction>.<level>
voice.resident.<animal-id>.name
voice.parent.<event>
voice.mission.<mission-id>.intro
voice.mission.<mission-id>.step.<step-id>
voice.mission.<mission-id>.success
```

Locale is resolved by the asset system and is not embedded in the semantic ID.
