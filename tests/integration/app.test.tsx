import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../../sources/app/app';

describe('App', () => {
  it('sets document metadata and follows hash routes', () => {
    render(<App />);

    expect(document.documentElement.lang).toBe('hu');
    expect(document.title).toBe('Kis Állatmentők');
    expect(screen.getByRole('heading', { name: 'Kezdőképernyő' })).toBeVisible();

    act(() => {
      window.location.hash = '/map';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByRole('heading', { name: 'Mentési térkép' })).toBeVisible();
  });
});
