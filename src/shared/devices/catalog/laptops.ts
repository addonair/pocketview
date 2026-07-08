import type { Device } from '../types';
import { makeDevice, UA } from './helpers';

/** Build a laptop preset with a rounded thin-bezel display. */
function laptop(
  id: string,
  name: string,
  manufacturer: string,
  width: number,
  height: number,
  pixelRatio: number,
  ua: string,
  year = 2023,
): Device {
  return makeDevice({
    id,
    name,
    manufacturer,
    category: 'laptop',
    releaseYear: year,
    os: manufacturer === 'Apple' ? 'macOS' : 'Windows',
    viewport: { width, height },
    pixelRatio,
    physicalResolution: { width: Math.round(width * pixelRatio), height: Math.round(height * pixelRatio) },
    cornerRadius: 12,
    bezel: 18,
    orientations: ['landscape'],
    touch: false,
    userAgent: ua,
  });
}

/** Popular laptop viewports. */
export const laptopDevices: Device[] = [
  laptop('macbook-air-13', 'MacBook Air 13"', 'Apple', 1280, 832, 2, UA.mac, 2024),
  laptop('macbook-pro-14', 'MacBook Pro 14"', 'Apple', 1512, 982, 2, UA.mac, 2023),
  laptop('macbook-pro-16', 'MacBook Pro 16"', 'Apple', 1728, 1117, 2, UA.mac, 2023),
  laptop('surface-laptop', 'Surface Laptop', 'Microsoft', 1500, 1000, 1.5, UA.desktop, 2023),
  laptop('dell-xps-13', 'Dell XPS 13', 'Dell', 1280, 800, 1.5, UA.desktop, 2023),
];
