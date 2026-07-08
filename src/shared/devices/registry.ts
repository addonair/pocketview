import type { Device, DeviceCategory } from './types';
import { appleIphones } from './catalog/apple-iphone';
import { appleIpads } from './catalog/apple-ipad';
import { googlePixels } from './catalog/google-pixel';
import { samsungDevices } from './catalog/samsung';
import { foldableDevices } from './catalog/foldables';
import { otherAndroidDevices } from './catalog/others';
import { desktopDevices } from './catalog/desktop';
import { laptopDevices } from './catalog/laptops';
import { genericDevices } from './catalog/generic';
import { watchDevices } from './catalog/watches';

/**
 * The complete device library, aggregated from every catalog file. To add a
 * device, edit (or add) a catalog file and include it here — no rendering,
 * picker, or screenshot code needs to change.
 */
export const DEVICES: Device[] = [
  ...appleIphones,
  ...appleIpads,
  ...googlePixels,
  ...samsungDevices,
  ...foldableDevices,
  ...otherAndroidDevices,
  ...desktopDevices,
  ...laptopDevices,
  ...genericDevices,
  ...watchDevices,
];

/** Ordered list of manufacturers present in the library. */
export const MANUFACTURERS: string[] = Array.from(
  new Set(DEVICES.map((d) => d.manufacturer)),
).sort();

/** Ordered list of categories present in the library. */
export const CATEGORIES: DeviceCategory[] = Array.from(
  new Set(DEVICES.map((d) => d.category)),
);

const byId = new Map(DEVICES.map((d) => [d.id, d]));

/** Look up a device by id. */
export function getDeviceById(id: string | undefined): Device | undefined {
  return id ? byId.get(id) : undefined;
}

/**
 * Resolve the device to show, falling back gracefully: requested → configured
 * default → first phone → first device.
 */
export function resolveDevice(preferredId?: string, fallbackId?: string): Device {
  return (
    getDeviceById(preferredId) ??
    getDeviceById(fallbackId) ??
    DEVICES.find((d) => d.category === 'phone') ??
    DEVICES[0]
  );
}

export type DeviceSort = 'name' | 'size' | 'resolution' | 'dpr' | 'year';

/** Filters applied by the device picker. */
export interface DeviceFilter {
  query?: string;
  manufacturer?: string;
  category?: DeviceCategory;
}

const area = (d: Device) => d.viewport.width * d.viewport.height;
const pixelArea = (d: Device) => d.physicalResolution.width * d.physicalResolution.height;

/** Filter the library by search query, manufacturer, and category. */
export function filterDevices(devices: Device[], filter: DeviceFilter): Device[] {
  const q = filter.query?.trim().toLowerCase();
  return devices.filter((d) => {
    if (filter.manufacturer && d.manufacturer !== filter.manufacturer) return false;
    if (filter.category && d.category !== filter.category) return false;
    if (q) {
      const haystack = `${d.name} ${d.manufacturer} ${d.os}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Return a new array sorted by the requested key (ascending, stable by name). */
export function sortDevices(devices: Device[], sort: DeviceSort): Device[] {
  const copy = [...devices];
  copy.sort((a, b) => {
    switch (sort) {
      case 'size':
        return area(a) - area(b) || a.name.localeCompare(b.name);
      case 'resolution':
        return pixelArea(a) - pixelArea(b) || a.name.localeCompare(b.name);
      case 'dpr':
        return a.pixelRatio - b.pixelRatio || a.name.localeCompare(b.name);
      case 'year':
        return b.releaseYear - a.releaseYear || a.name.localeCompare(b.name);
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });
  return copy;
}

/**
 * Validate the library for structural integrity. Returns a list of human
 * readable problems (empty when the library is valid). Exercised by a unit test
 * and at extension startup (logged, non-fatal).
 */
export function validateLibrary(devices: Device[] = DEVICES): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const d of devices) {
    if (seen.has(d.id)) problems.push(`Duplicate device id: ${d.id}`);
    seen.add(d.id);
    if (!/^[a-z0-9-]+$/.test(d.id)) problems.push(`Invalid id format: ${d.id}`);
    if (d.viewport.width <= 0 || d.viewport.height <= 0)
      problems.push(`Non-positive viewport for ${d.id}`);
    if (d.pixelRatio <= 0) problems.push(`Non-positive pixelRatio for ${d.id}`);
    if (d.orientations.length === 0) problems.push(`No orientations for ${d.id}`);
    if (!d.userAgent) problems.push(`Missing userAgent for ${d.id}`);
  }
  return problems;
}
