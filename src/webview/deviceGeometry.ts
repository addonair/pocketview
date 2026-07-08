import type { Device, Orientation } from '@shared/devices/types';

export interface Size {
  width: number;
  height: number;
}

/** Screen (display) size in CSS px for the given orientation. */
export function screenSize(device: Device, orientation: Orientation): Size {
  const { width, height } = device.viewport;
  return orientation === 'landscape'
    ? { width: height, height: width }
    : { width, height };
}

/** Outer frame size (screen + bezel on all sides) in CSS px. */
export function frameSize(device: Device, orientation: Orientation): Size {
  const screen = screenSize(device, orientation);
  return {
    width: screen.width + device.bezel * 2,
    height: screen.height + device.bezel * 2,
  };
}

/**
 * Compute the scale that fits the device frame inside the available stage area,
 * leaving a small margin. Clamped so very small or very large devices remain
 * usable.
 */
export function fitScale(
  device: Device,
  orientation: Orientation,
  available: Size,
  margin = 32,
): number {
  const frame = frameSize(device, orientation);
  const availW = Math.max(1, available.width - margin);
  const availH = Math.max(1, available.height - margin);
  const scale = Math.min(availW / frame.width, availH / frame.height);
  // Never magnify past 100%: upscaling a cross-origin iframe blurs the content.
  // Small devices show at native (crisp) size; large devices scale down to fit.
  return Math.max(0.1, Math.min(scale, 1));
}
