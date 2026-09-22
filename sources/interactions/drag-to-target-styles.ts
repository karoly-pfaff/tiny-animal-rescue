import type { CSSProperties } from 'react';

import { type NormalizedPoint, type NormalizedTarget, toPercent } from './drag-geometry';

export function createItemStyle(position: NormalizedPoint): CSSProperties {
  return { left: toPercent(position.x), top: toPercent(position.y) };
}

export function createTargetStyle(target: NormalizedTarget): CSSProperties {
  return {
    height: toPercent(target.height),
    left: toPercent(target.center.x),
    top: toPercent(target.center.y),
    width: toPercent(target.width),
  };
}

export function createHintStyle(start: NormalizedPoint, end: NormalizedPoint): CSSProperties {
  return {
    '--hint-end-x': toPercent(end.x),
    '--hint-end-y': toPercent(end.y),
    '--hint-start-x': toPercent(start.x),
    '--hint-start-y': toPercent(start.y),
  } as CSSProperties;
}
