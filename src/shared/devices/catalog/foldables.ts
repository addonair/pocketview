import type { Device } from '../types';
import { makeDevice, UA, phoneButtons } from './helpers';

const androidSafe = { top: 24, right: 0, bottom: 20, left: 0 };

/**
 * Foldable devices. The `viewport` reflects the *unfolded* primary screen; the
 * `foldable` block carries folded / half-open geometry so the webview can
 * animate between postures.
 */
export const foldableDevices: Device[] = [
  makeDevice({
    id: 'galaxy-z-fold-6',
    name: 'Galaxy Z Fold 6',
    manufacturer: 'Samsung',
    category: 'foldable',
    releaseYear: 2024,
    os: 'Android 14',
    viewport: { width: 884, height: 1104 },
    pixelRatio: 2.1,
    cornerRadius: 20,
    bezel: 18,
    safeAreaInsets: androidSafe,
    statusBarHeight: 24,
    navBarHeight: 20,
    hardwareButtons: phoneButtons,
    userAgent: UA.androidTablet('SM-F956B'),
    foldable: {
      unfolded: { width: 884, height: 1104 },
      folded: { width: 376, height: 968 },
      supportsHalf: true,
      foldAxis: 'vertical',
    },
  }),
  makeDevice({
    id: 'galaxy-z-flip-6',
    name: 'Galaxy Z Flip 6',
    manufacturer: 'Samsung',
    category: 'foldable',
    releaseYear: 2024,
    os: 'Android 14',
    viewport: { width: 375, height: 900 },
    pixelRatio: 3,
    cornerRadius: 30,
    bezel: 16,
    safeAreaInsets: androidSafe,
    statusBarHeight: 24,
    navBarHeight: 20,
    hardwareButtons: phoneButtons,
    userAgent: UA.android('SM-F741B'),
    foldable: {
      unfolded: { width: 375, height: 900 },
      folded: { width: 375, height: 340 },
      supportsHalf: true,
      foldAxis: 'horizontal',
    },
  }),
  makeDevice({
    id: 'pixel-fold',
    name: 'Pixel Fold',
    manufacturer: 'Google',
    category: 'foldable',
    releaseYear: 2023,
    os: 'Android 14',
    viewport: { width: 840, height: 1080 },
    pixelRatio: 2.09,
    cornerRadius: 20,
    bezel: 20,
    safeAreaInsets: androidSafe,
    statusBarHeight: 24,
    navBarHeight: 24,
    hardwareButtons: phoneButtons,
    userAgent: UA.androidTablet('Pixel Fold'),
    foldable: {
      unfolded: { width: 840, height: 1080 },
      folded: { width: 412, height: 892 },
      supportsHalf: true,
      foldAxis: 'vertical',
    },
  }),
  makeDevice({
    id: 'oneplus-open',
    name: 'OnePlus Open',
    manufacturer: 'OnePlus',
    category: 'foldable',
    releaseYear: 2023,
    os: 'Android 14',
    viewport: { width: 864, height: 1128 },
    pixelRatio: 2,
    cornerRadius: 22,
    bezel: 16,
    safeAreaInsets: androidSafe,
    statusBarHeight: 24,
    navBarHeight: 20,
    hardwareButtons: phoneButtons,
    userAgent: UA.androidTablet('CPH2551'),
    foldable: {
      unfolded: { width: 864, height: 1128 },
      folded: { width: 408, height: 954 },
      supportsHalf: true,
      foldAxis: 'vertical',
    },
  }),
];
