# Screen specifications

These specifications capture layout intent, not final pixel values. Final visual implementation should
be checked against concept art and supported viewport screenshots. The PNG concepts are
[presentation-only references](../../screens/README.md): they may guide style and broad composition,
but accepted ADRs, product rules, the content catalog, runtime localization, and this document override
painted text, counters, controls, residents, or progress shown in a concept.

## Shared visual language

- warm illustrated storybook world with rounded, tactile UI shapes;
- strong foreground/background separation and uncluttered silhouettes;
- controls resemble soft wooden, painted, fabric, or paper objects without imitating tiny real-world hardware;
- child actions use icons plus optional labels;
- large white or cream text outline and restrained shadow may create the storybook title treatment;
- runtime labels sit on blank art surfaces;
- the primary action is always visually dominant;
- animation supports meaning and never becomes constant ambient distraction.

## Start screen

### Composition

- rescue-center exterior or welcoming garden as the hero scene;
- title in the upper third, rendered at runtime;
- one large Play button in the lower central safe area;
- small parent-settings control in a corner, separated from the Play target;
- one or two resident characters may provide gentle ambient motion after progress exists.

### States

- first run: caregiver language choice before child flow;
- new game: welcoming neutral scene;
- returning player: unlocked residents may appear without crowding the button;
- offline/loading error: parent-readable recovery, no technical text presented as the child's fault.

## Map

### Composition

- shelter is the stable central/home landmark;
- Garden, Forest, Farm, and Pond occupy distinct map zones;
- curved paths or natural boundaries establish relationships without requiring geographic precision;
- one active rescue call has the strongest motion/contrast;
- completed locations remain inviting, not greyed out.

### Interaction

- tap a location/call to hear its cue and open the mission;
- tap the shelter to visit residents;
- locked future locations are absent until revealed;
- location hit regions must not overlap in portrait layout.

## Mission

### Composition

- full illustrated scene fitted to the design surface;
- active source and target occupy comfortably separated but reachable zones;
- repeat-prompt control remains in a consistent safe corner;
- home/back control uses a protected interaction to avoid accidental exit;
- no inventory bar, score bar, or textual instruction panel;
- only the current step's required elements receive attention animation.

### Layer order

1. background
2. non-interactive environment
3. behind-character mission props
4. characters and interactive objects
5. foreground occlusion that never covers required hit regions
6. transient effects and ghost-hand hints
7. runtime controls and safety navigation

### Transition between steps

- acknowledge completion immediately with a small effect/audio cue;
- let the scene visibly change;
- wait for motion to settle before the next spoken prompt;
- never accept hidden input while a blocking transition is active.

## Celebration

### Composition

- rescued animal centered and visibly safe;
- localized name/title rendered at runtime;
- warm particles, ribbons, leaves, or bubbles appropriate to location;
- two large choices after the celebration settles: Map and Shelter;
- no star count, score, rarity, or “better result” comparison.

### Timing

- progress is already saved when this screen appears;
- main unskippable emotional beat is short;
- replayed missions may expose a skip after the first complete viewing;
- navigation buttons appear predictably and do not move under the child's finger.

## Shelter

### Composition

- area name at top as runtime text;
- up to four residents arranged with large, non-overlapping personal spaces;
- large left/right arrows plus horizontal swipe;
- back-to-map action in a consistent safe corner;
- empty capacity appears as ordinary environment, never locked silhouettes.

### Area identity

| Area        | Mood                                       | Residents                                          |
| ----------- | ------------------------------------------ | -------------------------------------------------- |
| Indoor Room | cozy rugs, cushions, baskets, window light | Mimi, Morzsi/Biscuit, Pipi, Csipi/Peep             |
| Garden      | grass, flowers, low shrubs, shade          | Süni/Prickle, Makk/Acorn, Pamacs/Floss, Rozi/Rosie |
| Pondside    | shallow water edge, reeds, warm stones     | Totó/Toto, Kiki, Breki/Hoppy, Habi/Bubbles         |

Resident interaction opens no modal menu. A tap can speak the name and begin the most suitable short reaction; additional allowed actions may appear as large contextual icons only if the scene remains clear.

## Parent settings

- visually calmer and more conventional than the child flow;
- language and separate music/effects/narration controls;
- reduced-motion toggle;
- reset, credits, licenses, privacy, and version information;
- destructive reset requires confirmation;
- long text may scroll here, but never in the main child flow.

## Responsive behavior

Landscape preserves the wide illustrated composition. Portrait rearranges map zones and may crop only decorative margins. Mission scenes use contain/fit behavior plus authored safe regions; they must not stretch. UI remains in viewport safe areas rather than being embedded into scene coordinates.
