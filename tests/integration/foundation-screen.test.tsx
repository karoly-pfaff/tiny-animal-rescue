import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FoundationScreen } from '../../sources/app/foundation-screen';
import { resolveRoute } from '../../sources/app/routes';

describe('FoundationScreen', () => {
  it('renders the localized foundation fallback and disabled future action', () => {
    render(<FoundationScreen locale="hu" route={resolveRoute('/')} />);

    expect(screen.getByRole('heading', { name: 'Kis Állatmentők' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Játék' })).toBeDisabled();
  });

  it('renders another route without the start-only action', () => {
    render(<FoundationScreen locale="en" route={resolveRoute('/map')} />);

    expect(screen.getByRole('heading', { name: 'Rescue map' })).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
