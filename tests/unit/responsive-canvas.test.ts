import { afterEach, describe, expect, it, vi } from 'vitest';

import { resizeCanvasBackingStore } from '../../sources/interactions/responsive-canvas';

describe('resizeCanvasBackingStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('preserves an already correctly sized backing store between progress renders', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      bottom: 240,
      height: 240,
      left: 0,
      right: 320,
      top: 0,
      width: 320,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });
    const setTransform = vi.fn();
    const context = { setTransform } as unknown as CanvasRenderingContext2D;
    vi.spyOn(canvas, 'getContext').mockReturnValue(context);
    const widthSetter = vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set');
    const heightSetter = vi.spyOn(HTMLCanvasElement.prototype, 'height', 'set');
    vi.stubGlobal('devicePixelRatio', 2);

    resizeCanvasBackingStore(canvas);
    resizeCanvasBackingStore(canvas);

    expect(widthSetter).toHaveBeenCalledOnce();
    expect(heightSetter).toHaveBeenCalledOnce();
    expect(setTransform).toHaveBeenCalledTimes(2);
  });
});
