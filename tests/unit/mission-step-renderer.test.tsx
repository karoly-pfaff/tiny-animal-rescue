import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MissionStep } from '../../sources/content/mission-contract';
import { inactiveGuidancePresentation } from '../../sources/engine/guidance-ladder-state';
import {
  MissionStepRenderer,
  type MissionStepPresentationBindings,
} from '../../sources/engine/mission-step-renderer';

vi.mock('../../sources/interactions/drag-to-target', () => ({
  DragToTarget: () => <div data-testid="rendered-drag" />,
}));
vi.mock('../../sources/interactions/tap-remove', () => ({
  TapRemove: () => <div data-testid="rendered-tap" />,
}));
vi.mock('../../sources/interactions/wipe-clean', () => ({
  WipeClean: () => <div data-testid="rendered-wipe" />,
}));
vi.mock('../../sources/interactions/match', () => ({
  Match: () => <div data-testid="rendered-match" />,
}));
vi.mock('../../sources/interactions/trace', () => ({
  Trace: () => <div data-testid="rendered-trace" />,
}));

const base = {
  hint: { delayMs: 1_000, type: 'pulse-after-delay' },
  promptKey: 'fixture.prompt',
  successCue: 'effects.progress.step-complete',
} as const;

const steps = [
  {
    ...base,
    fallbackTargetBounds: {
      center: { x: 0.75, y: 0.5 },
      height: 0.2,
      width: 0.2,
    },
    id: 'drag-step',
    snapTolerance: 0.2,
    sourceId: 'basket',
    sourcePosition: { x: 0.2, y: 0.5 },
    targetBounds: { center: { x: 0.75, y: 0.5 }, height: 0.2, width: 0.2 },
    targetId: 'spot',
    type: 'drag',
  },
  { ...base, id: 'tap-step', targetIds: ['leaf'], type: 'tap' },
  { ...base, completionRatio: 0.6, id: 'wipe-step', maskId: 'mud', type: 'wipe' },
  {
    ...base,
    id: 'match-step',
    pairs: [{ sourceId: 'toy', targetId: 'basket' }],
    type: 'match',
  },
  {
    ...base,
    corridorWidth: 0.2,
    id: 'trace-step',
    pathId: 'pond-path',
    type: 'trace',
  },
] as const satisfies readonly MissionStep[];

const presentations = {
  'drag-step': {
    accessibleLabel: 'Move basket',
    completionAnnouncement: 'Basket placed',
    sourceAssetUrl: null,
    sourceVisual: <span />,
    type: 'drag',
  },
  'tap-step': {
    targets: [
      {
        accessibleLabel: 'Tap leaf',
        center: { x: 0.5, y: 0.5 },
        height: 0.2,
        id: 'leaf',
        visual: <span />,
        visualScale: 1,
        width: 0.2,
      },
    ],
    type: 'tap',
  },
  'wipe-step': {
    accessibleLabel: 'Wipe mud',
    maskColor: '#000000',
    type: 'wipe',
    underlay: <span />,
  },
  'match-step': {
    pairs: [
      {
        completionAnnouncement: 'Matched',
        nonColorCue: <span />,
        source: {
          accessibleLabel: 'Toy',
          center: { x: 0.2, y: 0.5 },
          height: 0.2,
          id: 'toy',
          visual: <span />,
          width: 0.2,
        },
        target: {
          accessibleLabel: 'Basket',
          center: { x: 0.8, y: 0.5 },
          height: 0.2,
          id: 'basket',
          visual: <span />,
          width: 0.2,
        },
      },
    ],
    type: 'match',
  },
  'trace-step': {
    accessibleLabel: 'Trace path',
    corridorColor: '#ffffff',
    endAffordance: <span />,
    path: [
      { x: 0.1, y: 0.5 },
      { x: 0.9, y: 0.5 },
    ],
    progressColor: '#000000',
    startAffordance: <span />,
    tracer: <span />,
    type: 'trace',
  },
} as const satisfies MissionStepPresentationBindings;

function renderStep(step: MissionStep, bindings: MissionStepPresentationBindings = presentations) {
  return render(
    <MissionStepRenderer
      active={{ complete: vi.fn(), paused: false, revision: 0, step }}
      guidance={inactiveGuidancePresentation}
      onComplete={vi.fn()}
      onGuidanceActivity={vi.fn()}
      onGuidanceWrongAction={vi.fn()}
      presentations={bindings}
    />,
  );
}

describe('MissionStepRenderer', () => {
  it.each(steps)('mounts the production $type primitive through one exhaustive seam', (step) => {
    renderStep(step);
    expect(screen.getByTestId(`rendered-${step.type}`)).toBeInTheDocument();
  });

  it('rejects a missing or type-mismatched presentation binding', () => {
    expect(() => renderStep(steps[0], {})).toThrow('has no presentation binding');
    expect(() =>
      renderStep(steps[0], {
        'drag-step': presentations['tap-step'],
      }),
    ).toThrow('requires a drag presentation');
  });

  it('rejects presentation identifiers that drift from tap or match content', () => {
    expect(() =>
      renderStep(steps[1], {
        'tap-step': {
          ...presentations['tap-step'],
          targets: [{ ...presentations['tap-step'].targets[0], id: 'other-leaf' }],
        },
      }),
    ).toThrow('tap target bindings');
    expect(() =>
      renderStep(steps[3], {
        'match-step': {
          ...presentations['match-step'],
          pairs: [
            {
              ...presentations['match-step'].pairs[0],
              target: { ...presentations['match-step'].pairs[0].target, id: 'other-basket' },
            },
          ],
        },
      }),
    ).toThrow('match target bindings');
  });
});
