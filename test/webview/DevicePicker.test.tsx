import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DevicePicker } from '../../src/webview/components/DevicePicker';

function setup(overrides: Partial<Parameters<typeof DevicePicker>[0]> = {}) {
  const onSelect = vi.fn();
  const onToggleFavorite = vi.fn();
  const onClose = vi.fn();
  render(
    <DevicePicker
      currentId="iphone-15-pro"
      favorites={[]}
      recents={[]}
      onSelect={onSelect}
      onToggleFavorite={onToggleFavorite}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onSelect, onToggleFavorite, onClose };
}

describe('DevicePicker', () => {
  it('filters devices by search query', () => {
    setup();
    const input = screen.getByPlaceholderText('Search devices…');
    fireEvent.change(input, { target: { value: 'pixel 8' } });
    expect(screen.getByText('Pixel 8')).toBeInTheDocument();
    expect(screen.queryByText('iPhone SE (3rd Gen)')).not.toBeInTheDocument();
  });

  it('selects a device on click', () => {
    const { onSelect } = setup();
    fireEvent.change(screen.getByPlaceholderText('Search devices…'), {
      target: { value: 'Galaxy S24' },
    });
    fireEvent.click(screen.getByText('Galaxy S24'));
    expect(onSelect).toHaveBeenCalledWith('galaxy-s24');
  });

  it('toggles a favorite without selecting the device', () => {
    const { onSelect, onToggleFavorite } = setup();
    fireEvent.change(screen.getByPlaceholderText('Search devices…'), {
      target: { value: 'iPhone 15 Pro Max' },
    });
    const row = screen.getByText('iPhone 15 Pro Max').closest('.dp-devrow') as HTMLElement;
    fireEvent.click(within(row).getByLabelText('Pin favorite'));
    expect(onToggleFavorite).toHaveBeenCalledWith('iphone-15-pro-max');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('filters by category chip', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'tablet' }));
    expect(screen.getByText('iPad Pro 11"')).toBeInTheDocument();
    expect(screen.queryByText('iPhone 15 Pro')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
