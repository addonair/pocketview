import { describe, it, expect } from 'vitest';
import { reducer, initialState } from '../../src/webview/state/reducer';

describe('webview reducer', () => {
  it('selects a device and records it as recent', () => {
    const next = reducer(initialState, { type: 'selectDevice', deviceId: 'pixel-8' });
    expect(next.deviceId).toBe('pixel-8');
    expect(next.recents[0]).toBe('pixel-8');
    expect(next.pickerOpen).toBe(false);
  });

  it('toggles favorites on and off', () => {
    const added = reducer(initialState, { type: 'toggleFavorite', deviceId: 'ipad-pro-11' });
    expect(added.favorites).toContain('ipad-pro-11');
    const removed = reducer(added, { type: 'toggleFavorite', deviceId: 'ipad-pro-11' });
    expect(removed.favorites).not.toContain('ipad-pro-11');
  });

  it('rotates only when the device supports two orientations', () => {
    const phone = reducer(initialState, { type: 'selectDevice', deviceId: 'iphone-15-pro' });
    const rotated = reducer(phone, { type: 'rotate' });
    expect(rotated.orientation).toBe('landscape');

    const watch = reducer(initialState, { type: 'selectDevice', deviceId: 'pixel-watch-3' });
    const notRotated = reducer(watch, { type: 'rotate' });
    expect(notRotated.orientation).toBe('portrait');
  });

  it('cycles through devices with wrap-around', () => {
    const forward = reducer(initialState, { type: 'cycleDevice', direction: 1 });
    expect(forward.deviceId).not.toBe(initialState.deviceId);
  });

  it('bumps the reload nonce and sets loading on reload', () => {
    const next = reducer(initialState, { type: 'reload' });
    expect(next.reloadNonce).toBe(initialState.reloadNonce + 1);
    expect(next.loading).toBe(true);
  });

  it('constrains orientation to what the selected device supports', () => {
    const landscapeFirst = reducer(
      { ...initialState, orientation: 'landscape' },
      { type: 'selectDevice', deviceId: 'apple-watch-ultra' },
    );
    expect(landscapeFirst.orientation).toBe('portrait');
  });
});
