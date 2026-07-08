import type { Device, Orientation } from '@shared/devices/types';
import { screenSize } from './deviceGeometry';

/** Draw a rounded rectangle path on a canvas context. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Decode a base64 PNG into an HTMLImageElement. */
function loadImage(pngBase64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode screenshot image.'));
    img.src = `data:image/png;base64,${pngBase64}`;
  });
}

/**
 * Composite a raw app screenshot into the CSS device frame, producing a framed
 * PNG. Runs entirely in the webview on canvas data we own (the screenshot PNG),
 * so there is no cross-origin restriction. Returns base64 (without data prefix).
 */
export async function compositeDeviceFrame(
  device: Device,
  orientation: Orientation,
  screenPngBase64: string,
): Promise<string> {
  const img = await loadImage(screenPngBase64);
  const screen = screenSize(device, orientation);
  const s = device.pixelRatio;
  const bezel = device.bezel;
  const frameW = (screen.width + bezel * 2) * s;
  const frameH = (screen.height + bezel * 2) * s;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(frameW);
  canvas.height = Math.round(frameH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');

  // Device body.
  const bodyGradient = ctx.createLinearGradient(0, 0, frameW, frameH);
  bodyGradient.addColorStop(0, '#2b2d31');
  bodyGradient.addColorStop(1, '#16171a');
  ctx.fillStyle = bodyGradient;
  roundRect(ctx, 0, 0, frameW, frameH, (device.cornerRadius + bezel) * s);
  ctx.fill();

  // Screen area (clipped) + app screenshot.
  const sx = bezel * s;
  const sy = bezel * s;
  const sw = screen.width * s;
  const sh = screen.height * s;
  ctx.save();
  roundRect(ctx, sx, sy, sw, sh, device.cornerRadius * s);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(sx, sy, sw, sh);
  ctx.drawImage(img, sx, sy, sw, sh);
  ctx.restore();

  // Notch / island. In landscape (counter-clockwise rotation) the portrait top
  // edge becomes the left edge, so the cutout moves there and centers vertically.
  if (device.notch.type !== 'none' && device.notch.type !== 'punch-hole') {
    const landscape = orientation === 'landscape';
    const nW = (landscape ? device.notch.height : device.notch.width) * s;
    const nH = (landscape ? device.notch.width : device.notch.height) * s;
    const inset = device.notch.type === 'island' ? device.notch.top * s : 0;
    const nX = landscape ? sx + inset : sx + (sw - nW) / 2;
    const nY = landscape ? sy + (sh - nH) / 2 : sy + inset;
    ctx.fillStyle = '#000';
    roundRect(ctx, nX, nY, nW, nH, device.notch.radius * s);
    ctx.fill();
  }

  return canvas.toDataURL('image/png').split(',')[1];
}
