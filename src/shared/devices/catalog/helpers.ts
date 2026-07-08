import type { Device, HardwareButton, NotchGeometry, SafeAreaInsets } from '../types';

/** Common user-agent strings, kept in one place for reuse across devices. */
export const UA = {
  iosPhone: (v = '17_5') =>
    `Mozilla/5.0 (iPhone; CPU iPhone OS ${v} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
  iosPad: (v = '17_5') =>
    `Mozilla/5.0 (iPad; CPU OS ${v} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
  android: (model: string, release = '14') =>
    `Mozilla/5.0 (Linux; Android ${release}; ${model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36`,
  androidTablet: (model: string, release = '14') =>
    `Mozilla/5.0 (Linux; Android ${release}; ${model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`,
  desktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  watch:
    'Mozilla/5.0 (Linux; Android 14; wearable) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
} as const;

/** No display cut-out. */
export const noNotch: NotchGeometry = { type: 'none', width: 0, height: 0, top: 0, radius: 0 };

/** Zero safe-area insets. */
export const noInsets: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Standard side power + volume buttons for a typical smartphone. */
export const phoneButtons: HardwareButton[] = [
  { side: 'right', offset: 0.18, length: 0.08, label: 'Power' },
  { side: 'left', offset: 0.16, length: 0.06, label: 'Volume Up' },
  { side: 'left', offset: 0.24, length: 0.06, label: 'Volume Down' },
];

/**
 * Build a fully-specified {@link Device} from a partial definition, filling in
 * sensible defaults. This keeps individual catalog entries terse while still
 * producing complete, validated data objects.
 */
export function makeDevice(
  partial: Partial<Device> &
    Pick<Device, 'id' | 'name' | 'manufacturer' | 'category' | 'viewport'>,
): Device {
  return {
    releaseYear: 2023,
    os: 'Unknown',
    pixelRatio: 2,
    physicalResolution: {
      width: Math.round(partial.viewport.width * (partial.pixelRatio ?? 2)),
      height: Math.round(partial.viewport.height * (partial.pixelRatio ?? 2)),
    },
    safeAreaInsets: noInsets,
    cornerRadius: 0,
    bezel: 12,
    notch: noNotch,
    hardwareButtons: [],
    statusBarHeight: 0,
    navBarHeight: 0,
    orientations: ['portrait', 'landscape'],
    touch: true,
    userAgent: UA.desktop,
    ...partial,
  };
}
