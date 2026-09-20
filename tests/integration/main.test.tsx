import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('application bootstrap', () => {
  it('mounts the application into the required root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await act(async () => import('../../sources/main'));

    expect(screen.getByRole('heading', { name: 'Kezdőképernyő' })).toBeVisible();
  });
});
