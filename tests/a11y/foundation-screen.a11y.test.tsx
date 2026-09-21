import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { FoundationScreen } from '../../sources/app/foundation-screen';
import { resolveRoute } from '../../sources/app/routes';

describe('foundation screen accessibility', () => {
  it('has no automatically detectable accessibility violations', async () => {
    const { container } = render(<FoundationScreen locale="hu" route={resolveRoute('/map')} />);
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
