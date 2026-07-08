import type { Device } from '../types';
import { makeDevice, UA } from './helpers';

/** Build a bezel-light generic viewport preset (no branding, minimal chrome). */
function preset(width: number, height: number, category: Device['category'] = 'phone'): Device {
  const isTablet = category === 'tablet';
  return makeDevice({
    id: `generic-${width}-${height}`,
    name: `${width}×${height}`,
    manufacturer: 'Generic',
    category,
    releaseYear: 2023,
    os: 'Responsive',
    viewport: { width, height },
    pixelRatio: 2,
    cornerRadius: isTablet ? 16 : 24,
    bezel: isTablet ? 22 : 14,
    userAgent: isTablet ? UA.androidTablet('Generic Tablet') : UA.android('Generic Device'),
  });
}

/**
 * Generic responsive viewport presets. These carry a light frame so any width /
 * height combination can be previewed without a branded device.
 */
export const genericDevices: Device[] = [
  preset(320, 568),
  preset(360, 640),
  preset(375, 667),
  preset(390, 844),
  preset(393, 852),
  preset(412, 915),
  preset(414, 896),
  preset(430, 932),
  preset(480, 800),
  preset(600, 960, 'tablet'),
  preset(768, 1024, 'tablet'),
  preset(800, 1280, 'tablet'),
  preset(834, 1194, 'tablet'),
  preset(1024, 1366, 'tablet'),
];
