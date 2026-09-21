import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../sources/app/app';
import { createMemoryLocaleBootstrapRepository } from '../../sources/persistence/locale-bootstrap-repository';

describe('App', () => {
  it('requires first-run locale choice, then follows the child path', async () => {
    const repository = createMemoryLocaleBootstrapRepository();
    render(<App localeRepository={repository} />);

    expect(await screen.findByRole('dialog', { name: 'Válassz nyelvet' })).toBeVisible();
    expect(document.documentElement.lang).toBe('hu');
    expect(document.title).toBe('Kis Állatmentők');
    expect(screen.getByRole('button', { name: 'Játék' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Magyar' }));
    await screen.findByRole('button', { name: 'Játék' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Játék' }));
    await act(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'Mentési térkép' })).toBeVisible();
    expect(await repository.readLocale()).toBe('hu');
  });

  it('restores English and opens the parent-oriented settings route', async () => {
    const repository = createMemoryLocaleBootstrapRepository('en');
    render(<App localeRepository={repository} />);

    expect(await screen.findByRole('heading', { name: 'Tiny Rescue' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Parent settings' }));
    await act(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'Parent settings' })).toBeVisible();
    expect(document.documentElement.lang).toBe('en');
  });

  it('does not let a deep link bypass first-run locale selection', async () => {
    window.location.hash = '/map';
    const repository = createMemoryLocaleBootstrapRepository();
    render(<App localeRepository={repository} />);

    expect(await screen.findByRole('dialog', { name: 'Válassz nyelvet' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Mentési térkép' })).not.toBeInTheDocument();
  });

  it('keeps setup blocking and allows retry when locale persistence fails', async () => {
    const writeLocale = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValueOnce();
    const repository = { readLocale: () => Promise.resolve(null), writeLocale };
    render(<App localeRepository={repository} />);

    await screen.findByRole('dialog', { name: 'Válassz nyelvet' });
    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A beállítás nem menthető');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Játék' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(await screen.findByRole('heading', { name: 'Tiny Rescue' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writeLocale).toHaveBeenCalledTimes(2);
  });

  it('shows only the first Garden call and opens the correct mission', async () => {
    window.location.hash = '/map';
    const repository = createMemoryLocaleBootstrapRepository('en');
    render(<App localeRepository={repository} />);

    expect(await screen.findByRole('button', { name: 'Garden rescue: Mimi' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Shelter' })).toBeVisible();
    expect(screen.queryByText(/Forest|Farm|Pond/u)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Garden rescue: Mimi' }));
    await act(() => Promise.resolve(window.dispatchEvent(new HashChangeEvent('hashchange'))));

    expect(screen.getByRole('heading', { name: 'Mimi in the tree' })).toBeVisible();
    expect(screen.getByRole('main')).toHaveAttribute('data-mission-id', 'garden-kitten-tree');
  });
});
