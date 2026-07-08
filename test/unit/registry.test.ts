import { describe, it, expect } from 'vitest';
import {
  DEVICES,
  filterDevices,
  getDeviceById,
  resolveDevice,
  sortDevices,
  validateLibrary,
} from '../../src/shared/devices/registry';

describe('device registry', () => {
  it('has no structural problems', () => {
    expect(validateLibrary()).toEqual([]);
  });

  it('has unique ids', () => {
    const ids = DEVICES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('looks up devices by id', () => {
    expect(getDeviceById('iphone-15-pro')?.name).toBe('iPhone 15 Pro');
    expect(getDeviceById('does-not-exist')).toBeUndefined();
  });

  it('resolves with graceful fallback', () => {
    expect(resolveDevice('iphone-15-pro').id).toBe('iphone-15-pro');
    expect(resolveDevice('nope', 'pixel-8').id).toBe('pixel-8');
    // Unknown ids fall back to the first phone.
    expect(resolveDevice('nope', 'also-nope').category).toBe('phone');
  });

  it('filters by query, manufacturer and category', () => {
    const apple = filterDevices(DEVICES, { manufacturer: 'Apple' });
    expect(apple.every((d) => d.manufacturer === 'Apple')).toBe(true);

    const tablets = filterDevices(DEVICES, { category: 'tablet' });
    expect(tablets.every((d) => d.category === 'tablet')).toBe(true);

    const search = filterDevices(DEVICES, { query: 'pixel 8' });
    expect(search.some((d) => d.id === 'pixel-8')).toBe(true);
  });

  it('sorts by the requested key', () => {
    const bySize = sortDevices(DEVICES, 'size');
    for (let i = 1; i < bySize.length; i++) {
      const prev = bySize[i - 1].viewport.width * bySize[i - 1].viewport.height;
      const cur = bySize[i].viewport.width * bySize[i].viewport.height;
      expect(prev).toBeLessThanOrEqual(cur);
    }

    const byName = sortDevices(DEVICES, 'name');
    const names = byName.map((d) => d.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('flags a duplicate id in validation', () => {
    const dup = [DEVICES[0], DEVICES[0]];
    expect(validateLibrary(dup).some((p) => p.includes('Duplicate'))).toBe(true);
  });
});
