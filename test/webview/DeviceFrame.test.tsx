import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { DeviceFrame } from '../../src/webview/components/DeviceFrame';
import { getDeviceById } from '../../src/shared/devices/registry';
import { DEFAULT_SYSTEM_SETTINGS } from '../../src/shared/protocol';

const device = getDeviceById('iphone-15-pro')!;

/** Props shared by every render below (frame chrome on, no system overrides). */
const frameProps = {
  chrome: true,
  showSafeArea: false,
  system: DEFAULT_SYSTEM_SETTINGS,
} as const;

describe('DeviceFrame', () => {
  it('renders the frame at screen size plus bezel on both axes', () => {
    render(
      <DeviceFrame
        ref={createRef()}
        device={device}
        orientation="portrait"
        url="http://localhost:5173"
        reloadNonce={0}
        {...frameProps}
        onLoad={vi.fn()}
        onError={vi.fn()}
      />,
    );
    const frame = screen.getByLabelText(/iPhone 15 Pro frame, portrait/);
    expect(frame.style.width).toBe(`${device.viewport.width + device.bezel * 2}px`);
    expect(frame.style.height).toBe(`${device.viewport.height + device.bezel * 2}px`);
  });

  it('swaps dimensions in landscape', () => {
    render(
      <DeviceFrame
        ref={createRef()}
        device={device}
        orientation="landscape"
        url="http://localhost:5173"
        reloadNonce={0}
        {...frameProps}
        onLoad={vi.fn()}
        onError={vi.fn()}
      />,
    );
    const frame = screen.getByLabelText(/iPhone 15 Pro frame, landscape/);
    expect(frame.style.width).toBe(`${device.viewport.height + device.bezel * 2}px`);
  });

  it('renders an iframe pointing at the dev server URL', () => {
    render(
      <DeviceFrame
        ref={createRef()}
        device={device}
        orientation="portrait"
        url="http://localhost:5173"
        reloadNonce={0}
        {...frameProps}
        onLoad={vi.fn()}
        onError={vi.fn()}
      />,
    );
    const iframe = screen.getByTitle('iPhone 15 Pro preview') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toBe('http://localhost:5173');
  });

  it('omits the iframe when there is no URL', () => {
    render(
      <DeviceFrame
        ref={createRef()}
        device={device}
        orientation="portrait"
        url={null}
        reloadNonce={0}
        {...frameProps}
        onLoad={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(screen.queryByTitle('iPhone 15 Pro preview')).not.toBeInTheDocument();
  });
});
