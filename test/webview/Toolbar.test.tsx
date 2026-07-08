import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../../src/webview/components/Toolbar';
import { getDeviceById } from '../../src/shared/devices/registry';

const device = getDeviceById('iphone-15-pro')!;

function setup(overrides: Partial<Parameters<typeof Toolbar>[0]> = {}) {
  const handlers = {
    onOpenPicker: vi.fn(),
    onRotate: vi.fn(),
    onRefresh: vi.fn(),
    onReconnect: vi.fn(),
    onZoom: vi.fn(),
    onOpenBrowser: vi.fn(),
    onConnectUrl: vi.fn(),
    onScreenshot: vi.fn(),
    onToggleFrame: vi.fn(),
    onToggleSafeArea: vi.fn(),
    onOpenSettings: vi.fn(),
    onToggleFullscreen: vi.fn(),
  };
  render(
    <Toolbar
      device={device}
      orientation="portrait"
      zoom="fit"
      canRotate
      showFrame
      showSafeArea={false}
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe('Toolbar', () => {
  it('shows the current device name and viewport', () => {
    setup();
    expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    expect(screen.getByText(/393×852/)).toBeInTheDocument();
  });

  it('invokes handlers for toolbar actions', () => {
    const h = setup();
    fireEvent.click(screen.getByLabelText('Rotate device'));
    fireEvent.click(screen.getByLabelText('Refresh preview'));
    fireEvent.click(screen.getByLabelText('Capture screenshot'));
    fireEvent.click(screen.getByLabelText('Choose device'));
    expect(h.onRotate).toHaveBeenCalled();
    expect(h.onRefresh).toHaveBeenCalled();
    expect(h.onScreenshot).toHaveBeenCalled();
    expect(h.onOpenPicker).toHaveBeenCalled();
  });

  it('disables rotate when the device cannot rotate', () => {
    setup({ canRotate: false });
    expect(screen.getByLabelText('Rotate device')).toBeDisabled();
  });

  it('changes zoom to a fixed level', () => {
    const h = setup();
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(h.onZoom).toHaveBeenCalled();
  });
});
