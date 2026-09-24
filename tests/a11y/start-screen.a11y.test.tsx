import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import { StartScreen } from '../../sources/app/start-screen';
import { testContentRegistry } from '../support/first-rescue-content';

describe('start screen accessibility', () => {
  it('has no automatically detectable violation before locale selection', async () => {
    const { container } = render(
      <StartScreen
        contentRegistry={testContentRegistry}
        locale="hu"
        loading={false}
        localeSaveFailed
        localeSaving={false}
        needsLocale
        onOpenSettings={vi.fn()}
        onPlay={vi.fn()}
        onSelectLocale={vi.fn()}
      />,
    );
    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
