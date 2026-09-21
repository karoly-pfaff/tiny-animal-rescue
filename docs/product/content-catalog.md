# v1.0 content catalog

This catalog is normative for the identity and count of v1.0 content. Wording and art direction may be refined without changing the count or mission purpose.

## Shelter residents

| ID              | Display name     | Species    | Origin | Shelter area |
| --------------- | ---------------- | ---------- | ------ | ------------ |
| `mimi-kitten`   | Mimi             | kitten     | Garden | Indoor Room  |
| `morzsi-puppy`  | Morzsi / Biscuit | puppy      | Garden | Indoor Room  |
| `pipi-chick`    | Pipi             | chick      | Farm   | Indoor Room  |
| `csipi-bird`    | Csipi / Peep     | small bird | Forest | Indoor Room  |
| `suni-hedgehog` | Süni / Prickle   | hedgehog   | Forest | Garden       |
| `makk-squirrel` | Makk / Acorn     | squirrel   | Forest | Garden       |
| `pamacs-lamb`   | Pamacs / Floss   | lamb       | Farm   | Garden       |
| `rozi-fawn`     | Rozi / Rosie     | fawn       | Forest | Garden       |
| `toto-turtle`   | Totó / Toto      | turtle     | Pond   | Pondside     |
| `kiki-duckling` | Kiki             | duckling   | Pond   | Pondside     |
| `breki-frog`    | Breki / Hoppy    | frog       | Garden | Pondside     |
| `habi-fish`     | Habi / Bubbles   | fish       | Pond   | Pondside     |

Localized names may differ, but the stable IDs never do.

## Missions

| Order | ID                            | Type   | Location | Animal / subject | Steps | Result                                                                   |
| ----: | ----------------------------- | ------ | -------- | ---------------- | ----: | ------------------------------------------------------------------------ |
|     1 | `garden-kitten-tree`          | Rescue | Garden   | Mimi             |     2 | ladder to tree; tap kitten; unlock Mimi                                  |
|     2 | `forest-hedgehog-branches`    | Rescue | Forest   | Süni             |     3 | tap/remove branches; unlock Süni                                         |
|     3 | `farm-chick-find-mother`      | Rescue | Farm     | Pipi             |     2 | match/guide chick to hen; unlock Pipi                                    |
|     4 | `garden-puppy-tangled-leash`  | Rescue | Garden   | Morzsi           |     3 | tap/remove loops; drag leash free; unlock Morzsi                         |
|     5 | `forest-bird-nest`            | Rescue | Forest   | Csipi            |     2 | drag nest material; drag bird to nest; unlock Csipi                      |
|     6 | `pond-turtle-find-water`      | Rescue | Pond     | Totó             |   1–2 | trace broad path to water; unlock Totó                                   |
|     7 | `farm-lamb-fence`             | Rescue | Farm     | Pamacs           |     3 | remove loose boards; drag gate; unlock Pamacs                            |
|     8 | `garden-frog-too-dry`         | Rescue | Garden   | Breki            |     2 | drag leaf shade; drag water drops; unlock Breki                          |
|     9 | `forest-squirrel-lost-acorns` | Rescue | Forest   | Makk             |     3 | match three acorns to basket; unlock Makk                                |
|    10 | `pond-duckling-reeds`         | Rescue | Pond     | Kiki             |     3 | remove reeds; trace to family; unlock Kiki                               |
|    11 | `forest-fawn-stuck-twig`      | Rescue | Forest   | Rozi             |     2 | remove twig; wipe leaves; unlock Rozi                                    |
|    12 | `pond-fish-small-puddle`      | Rescue | Pond     | Habi             |     2 | trace water channel; drag fish to pond; unlock Habi                      |
|    13 | `farm-piglet-mud-wash`        | World  | Farm     | visiting piglet  |     2 | drag water to the wash basin; wipe mud; scene becomes clean; no resident |
|    14 | `pond-clear-litter`           | World  | Pond     | pond habitat     |     3 | drag three safe litter items to bin; no resident                         |
|    15 | `garden-mimi-find-ball`       | Help   | Garden   | Mimi             |     2 | reveal and drag ball; no resident                                        |
|    16 | `forest-suni-picnic`          | Help   | Forest   | Süni             |     3 | match picnic items; no resident                                          |

## Mission composition constraints

- Required step count is 2–4, except a trace-only mission may use one continuous guided step.
- Mission 1 is the tutorial and may introduce only drag and tap.
- No mission introduces more than one previously unseen interaction type.
- Every mission needs a unique opening narration, step prompts, a success line, and a replay-safe completion state.
- Help missions can use a resident only after that resident's Rescue mission is complete.
- If a dependency is incomplete, the Help mission remains hidden rather than locked.

## Location identity

### Garden

Warm, close, domestic, flowers and a large tree. Introduces the game and supports familiar pets.

### Forest

Soft woodland with clear paths and layered vegetation that never obscures active targets. Hosts the broadest variety of wild residents.

### Farm

Sunny, ordered spaces with fences, barn forms, and friendly domestic animals. Mechanical clutter is avoided.

### Pond

Calm water, reeds, stones, and a visible shoreline. Water edges are visually clear and never imply danger.

## Shelter allocation rule

The shelter deliberately holds only the 12 named residents. Visiting animals and environmental subjects from Help/World missions do not become residents. Future packs add residents only when they also declare sufficient shelter-area capacity.
