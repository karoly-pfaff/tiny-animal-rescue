# Product intent

## Problem

Many preschool games are either disconnected minigame collections or systems that are too complicated, text-heavy, competitive, or manipulative for a 3–4-year-old. Tiny Rescue should feel like one coherent, substantial game while remaining straightforward to build, test, and expand.

## Product promise

The child is a capable helper. They notice an animal in trouble, perform a few understandable actions, see an immediate positive result, and build a familiar shelter full of friends they have helped.

## Design thesis

The game feels large because it has a persistent place, recurring animals, a map, visible progress, and authored rescue stories—not because it has many systems.

The engine remains small because every mission is composed from five reusable interaction primitives and declarative content.

## Audience

Primary player:

- age 3–4
- may not read
- developing fine motor control
- may not understand abstract UI conventions
- benefits from repetition, voice guidance, large targets, and forgiving input

Secondary user:

- parent or caregiver who starts the application, chooses language, controls audio, and may reset progress

## Experience principles

1. **Kindness over challenge.** The emotional goal is caring and competence.
2. **Show and say.** Narration, movement, highlighting, and scene composition work together.
3. **One clear next action.** A mission step presents a single dominant affordance.
4. **No shame.** Wrong actions create a neutral bounce-back and clearer help.
5. **Short missions, persistent world.** A 1–3 minute mission changes the shelter permanently.
6. **Familiarity matters.** Residents have names and can reappear in Help missions.
7. **Calm celebration.** Success feels warm and visible without overwhelming flashing or noise.
8. **Complete before expandable.** v1.0 stands alone; content packs are optional.

## Success criteria

The product succeeds when:

- a child can start and finish the first mission with minimal adult assistance;
- the child understands that rescued animals appear in the shelter;
- completed progress survives a restart;
- a content author can add a contract-conforming mission without editing engine code;
- the base game remains coherent and uncluttered at 12 residents;
- Hungarian and English offer equivalent guidance and completion coverage;
- the build can prove that content references and required assets are complete.

## Explicit non-goals

- an open world
- a branching quest system
- free-form inventory
- crafting, economy, shops, or currencies
- real-time needs or Tamagotchi maintenance
- procedural mission generation
- online services, accounts, analytics, advertising, or social features in v1.0
- user-generated content
- educational assessment or performance grading
- a general-purpose visual content editor in v1.0

