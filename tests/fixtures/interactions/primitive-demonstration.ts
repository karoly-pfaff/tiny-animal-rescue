import type { MissionStep } from '../../../sources/content/mission-contract';

const hint = { delayMs: 2_000, type: 'pulse-after-delay' } as const;

export const primitiveDemonstrationScene = {
  id: 'primitive-demonstration-suite',
  steps: [
    {
      hint,
      id: 'demonstrate-tap-remove',
      promptKey: 'fixture.primitive.tap-remove',
      successCue: 'effects.interaction.tap-remove',
      targetIds: ['leaf-one', 'leaf-two'],
      type: 'tap',
    },
    {
      fallbackTargetBounds: {
        center: { x: 0.72, y: 0.5 },
        height: 0.34,
        width: 0.26,
      },
      hint,
      id: 'demonstrate-drag-to-target',
      promptKey: 'fixture.primitive.drag-to-target',
      snapTolerance: 0.72,
      sourceId: 'supply-basket',
      sourcePosition: { x: 0.22, y: 0.68 },
      successCue: 'effects.interaction.drag-snap',
      targetBounds: {
        center: { x: 0.72, y: 0.5 },
        height: 0.34,
        width: 0.26,
      },
      targetId: 'supply-spot',
      type: 'drag',
    },
    {
      completionRatio: 0.7,
      hint,
      id: 'demonstrate-wipe-clean',
      maskId: 'mud-mask',
      promptKey: 'fixture.primitive.wipe-clean',
      successCue: 'effects.interaction.wipe-complete',
      type: 'wipe',
    },
    {
      hint,
      id: 'demonstrate-match',
      pairs: [
        { sourceId: 'round-toy', targetId: 'round-basket' },
        { sourceId: 'triangle-toy', targetId: 'triangle-basket' },
        { sourceId: 'square-toy', targetId: 'square-basket' },
      ],
      promptKey: 'fixture.primitive.match',
      successCue: 'effects.interaction.match-success',
      type: 'match',
    },
    {
      corridorWidth: 0.18,
      hint,
      id: 'demonstrate-trace',
      pathId: 'gentle-pond-route',
      promptKey: 'fixture.primitive.trace',
      successCue: 'effects.interaction.trace-complete',
      type: 'trace',
    },
  ] satisfies readonly MissionStep[],
} as const;

export const primitiveDemonstrationText = {
  'fixture.primitive.drag-to-target': 'Move the basket to the bright spot',
  'fixture.primitive.match': 'Match each toy with its basket',
  'fixture.primitive.tap-remove': 'Tap the leaves in order',
  'fixture.primitive.trace': 'Guide the turtle to the pond',
  'fixture.primitive.wipe-clean': 'Wipe the muddy surface clean',
} as const satisfies Readonly<Record<string, string>>;
