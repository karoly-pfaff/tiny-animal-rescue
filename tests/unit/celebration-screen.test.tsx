import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CelebrationScreen } from '../../sources/app/celebration-screen';

describe('CelebrationScreen', () => {
  it('narrates Mimi by semantic cue and offers both destinations', () => {
    const speak = vi.fn();
    const stop = vi.fn();
    const onMap = vi.fn();
    const onShelter = vi.fn();
    const { unmount } = render(
      <CelebrationScreen
        locale="hu"
        narrationService={{ speak, stop }}
        onMap={onMap}
        onShelter={onShelter}
      />,
    );

    expect(speak).toHaveBeenCalledWith({
      cue: 'voice.mission.garden-kitten-tree.success',
      locale: 'hu',
      text: 'Mimi biztonságban van!',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Térkép' }));
    fireEvent.click(screen.getByRole('button', { name: 'Menhely' }));
    expect(onMap).toHaveBeenCalledOnce();
    expect(onShelter).toHaveBeenCalledOnce();

    unmount();
    expect(stop).toHaveBeenCalledOnce();
  });
});
