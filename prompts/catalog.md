# Asset prompt catalog

## Voice

The authoritative localized narration index is the [voice catalog](voice/catalog.md). It contains 115
semantic lines per locale with identical HU/EN IDs and ordering. The machine-readable inventories are
under `voice/scripts/`; the first-rescue runtime subset is registered in
`content/base/assets/voice-manifest.json`.

## Music

| Runtime ID                        | Context             | Prompt file                          |
| --------------------------------- | ------------------- | ------------------------------------ |
| `music.global.start-screen`       | Start screen        | `music/global/start-screen.md`       |
| `music.global.rescue-map`         | Rescue map          | `music/global/rescue-map.md`         |
| `music.global.rescue-celebration` | Mission celebration | `music/global/rescue-celebration.md` |
| `music.location.garden.ambient`   | Garden exploration  | `music/locations/garden.md`          |
| `music.location.garden.mission`   | Garden mission      | `music/locations/garden.md`          |
| `music.location.forest.ambient`   | Forest exploration  | `music/locations/forest.md`          |
| `music.location.forest.mission`   | Forest mission      | `music/locations/forest.md`          |
| `music.location.farm.ambient`     | Farm exploration    | `music/locations/farm.md`            |
| `music.location.farm.mission`     | Farm mission        | `music/locations/farm.md`            |
| `music.location.pond.ambient`     | Pond exploration    | `music/locations/pond.md`            |
| `music.location.pond.mission`     | Pond mission        | `music/locations/pond.md`            |
| `music.shelter.indoor-room`       | Indoor shelter      | `music/shelter/indoor-room.md`       |
| `music.shelter.garden`            | Shelter garden      | `music/shelter/garden.md`            |
| `music.shelter.pondside`          | Shelter pondside    | `music/shelter/pondside.md`          |

## Effects prompt groups

| Group                  | Coverage                                                                 | Prompt file                         |
| ---------------------- | ------------------------------------------------------------------------ | ----------------------------------- |
| UI/navigation          | confirm, back, home, location, swipe, replay, gentle reject, parent gate | `effects/ui-navigation.md`          |
| Interaction primitives | tap/remove, drag, wipe, match, trace                                     | `effects/interaction-primitives.md` |
| Progress/rewards       | step, mission, unlock, arrival, world improvement, full shelter          | `effects/rescue-rewards.md`         |
| Environmental loops    | rescue center, garden, forest, farm, pond, indoor shelter                | `effects/environmental-loops.md`    |
| Resident reactions     | all 12 base residents                                                    | `effects/animal-vocalizations.md`   |

## Effect runtime IDs

This table is the authoritative effect-ID index. Validation keeps it synchronized with the runtime-ID
headings in the owning prompt files.

| Runtime ID                             | Context                       | Owning prompt file                  |
| -------------------------------------- | ----------------------------- | ----------------------------------- |
| `effects.ui.confirm`                   | confirm a safe UI action      | `effects/ui-navigation.md`          |
| `effects.ui.back`                      | navigate back                 | `effects/ui-navigation.md`          |
| `effects.ui.home`                      | return home                   | `effects/ui-navigation.md`          |
| `effects.ui.location-select`           | select a map location         | `effects/ui-navigation.md`          |
| `effects.ui.page-swipe`                | change a paged view           | `effects/ui-navigation.md`          |
| `effects.ui.prompt-replay`             | replay narration              | `effects/ui-navigation.md`          |
| `effects.ui.gentle-reject`             | neutral wrong-action feedback | `effects/ui-navigation.md`          |
| `effects.ui.parent-gate-open`          | open the parent boundary      | `effects/ui-navigation.md`          |
| `effects.interaction.tap-remove`       | successful tap/remove         | `effects/interaction-primitives.md` |
| `effects.interaction.obstacle-cleared` | final obstacle removed        | `effects/interaction-primitives.md` |
| `effects.interaction.drag-pick-up`     | draggable object picked up    | `effects/interaction-primitives.md` |
| `effects.interaction.drag-move`        | object moving during drag     | `effects/interaction-primitives.md` |
| `effects.interaction.drag-snap`        | object placed on target       | `effects/interaction-primitives.md` |
| `effects.interaction.drag-return`      | object gently returned        | `effects/interaction-primitives.md` |
| `effects.interaction.wipe-stroke`      | wipe stroke feedback          | `effects/interaction-primitives.md` |
| `effects.interaction.wipe-progress`    | wipe progress milestone       | `effects/interaction-primitives.md` |
| `effects.interaction.wipe-complete`    | wipe step completed           | `effects/interaction-primitives.md` |
| `effects.interaction.match-pick-up`    | match item picked up          | `effects/interaction-primitives.md` |
| `effects.interaction.match-success`    | match completed               | `effects/interaction-primitives.md` |
| `effects.interaction.trace-move`       | trace movement feedback       | `effects/interaction-primitives.md` |
| `effects.interaction.trace-progress`   | trace progress milestone      | `effects/interaction-primitives.md` |
| `effects.interaction.trace-complete`   | trace step completed          | `effects/interaction-primitives.md` |
| `effects.progress.step-complete`       | mission step completed        | `effects/rescue-rewards.md`         |
| `effects.progress.mission-complete`    | mission completed             | `effects/rescue-rewards.md`         |
| `effects.progress.resident-unlock`     | resident unlocked             | `effects/rescue-rewards.md`         |
| `effects.progress.shelter-arrival`     | resident arrives at shelter   | `effects/rescue-rewards.md`         |
| `effects.progress.world-improved`      | world-help outcome            | `effects/rescue-rewards.md`         |
| `effects.progress.all-residents-safe`  | full v1 rescue completion     | `effects/rescue-rewards.md`         |
| `effects.ambience.rescue-center`       | rescue-center ambience        | `effects/environmental-loops.md`    |
| `effects.ambience.garden`              | Garden ambience               | `effects/environmental-loops.md`    |
| `effects.ambience.forest`              | Forest ambience               | `effects/environmental-loops.md`    |
| `effects.ambience.farm`                | Farm ambience                 | `effects/environmental-loops.md`    |
| `effects.ambience.pond`                | Pond ambience                 | `effects/environmental-loops.md`    |
| `effects.ambience.shelter-indoor`      | indoor shelter ambience       | `effects/environmental-loops.md`    |
| `effects.animal.mimi-kitten.greet`     | Mimi greeting                 | `effects/animal-vocalizations.md`   |
| `effects.animal.morzsi-puppy.greet`    | Morzsi/Biscuit greeting       | `effects/animal-vocalizations.md`   |
| `effects.animal.pipi-chick.greet`      | Pipi greeting                 | `effects/animal-vocalizations.md`   |
| `effects.animal.csipi-bird.greet`      | Csipi/Peep greeting           | `effects/animal-vocalizations.md`   |
| `effects.animal.suni-hedgehog.greet`   | Süni/Prickle greeting         | `effects/animal-vocalizations.md`   |
| `effects.animal.makk-squirrel.greet`   | Makk/Acorn greeting           | `effects/animal-vocalizations.md`   |
| `effects.animal.pamacs-lamb.greet`     | Pamacs/Floss greeting         | `effects/animal-vocalizations.md`   |
| `effects.animal.rozi-fawn.greet`       | Rozi/Rosie greeting           | `effects/animal-vocalizations.md`   |
| `effects.animal.toto-turtle.greet`     | Totó/Toto greeting            | `effects/animal-vocalizations.md`   |
| `effects.animal.kiki-duckling.greet`   | Kiki greeting                 | `effects/animal-vocalizations.md`   |
| `effects.animal.breki-frog.greet`      | Breki/Hoppy greeting          | `effects/animal-vocalizations.md`   |
| `effects.animal.habi-fish.greet`       | Habi/Bubbles greeting         | `effects/animal-vocalizations.md`   |

## Intentionally excluded

- final music mastering and loop edit points;
- final voice recordings and mastering outputs;
- loud failure, timer, score, countdown, purchase, advertisement, or competitive reward sounds;
- engine implementation.
