import type { Device } from '../types';
import { makeDevice, UA } from './helpers';

/** Build a flat-panel desktop preset with a thin uniform bezel. */
function desktop(id: string, name: string, width: number, height: number, year = 2023): Device {
  return makeDevice({
    id,
    name,
    manufacturer: 'Generic',
    category: 'desktop',
    releaseYear: year,
    os: 'Desktop',
    viewport: { width, height },
    pixelRatio: 1,
    cornerRadius: 8,
    bezel: 14,
    orientations: ['landscape'],
    touch: false,
    userAgent: UA.desktop,
  });
}

/** Common desktop / monitor resolutions. */
export const desktopDevices: Device[] = [
  desktop('desktop-1280-720', 'Desktop 1280×720', 1280, 720),
  desktop('desktop-1366-768', 'Desktop 1366×768', 1366, 768),
  desktop('desktop-1440-900', 'Desktop 1440×900', 1440, 900),
  desktop('desktop-1600-900', 'Desktop 1600×900', 1600, 900),
  desktop('desktop-1920-1080', 'Desktop 1920×1080', 1920, 1080),
  desktop('desktop-2560-1440', 'Desktop 2560×1440', 2560, 1440),
  desktop('desktop-3440-1440', 'Ultrawide 3440×1440', 3440, 1440),
  desktop('desktop-3840-2160', 'Desktop 4K 3840×2160', 3840, 2160),
];
