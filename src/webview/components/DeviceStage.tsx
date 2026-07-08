import { useEffect, useState, type RefObject } from 'react';
import type { Device, Orientation } from '@shared/devices/types';
import type { ServerStatus, ZoomLevel } from '@shared/protocol';
import { useElementSize } from '../hooks/useElementSize';
import { fitScale, frameSize } from '../deviceGeometry';
import { DeviceFrame } from './DeviceFrame';

interface DeviceStageProps {
  device: Device;
  orientation: Orientation;
  zoom: ZoomLevel;
  status: ServerStatus;
  loading: boolean;
  error: string | null;
  reloadNonce: number;
  screenRef: RefObject<HTMLDivElement>;
  onIframeLoad: () => void;
  onIframeError: () => void;
  onReconnect: () => void;
  onConnectUrl: () => void;
}

/**
 * Hosts the scaled device frame. Computes the effective scale (numeric zoom or
 * fit-to-panel), keeps the device centered on resize, and provides a pinch/pan
 * gesture layer that adjusts the frame zoom without reloading the app.
 */
export function DeviceStage(props: DeviceStageProps) {
  const {
    device,
    orientation,
    zoom,
    status,
    loading,
    error,
    reloadNonce,
    screenRef,
    onIframeLoad,
    onIframeError,
    onReconnect,
    onConnectUrl,
  } = props;

  const [stageRef, stageSize] = useElementSize<HTMLDivElement>();
  // Manual scale nudge applied by pinch gestures, multiplied onto the base zoom.
  const [pinch, setPinch] = useState(1);

  useEffect(() => {
    setPinch(1);
  }, [zoom, device.id, orientation]);

  const base = zoom === 'fit' ? fitScale(device, orientation, stageSize) : zoom / 100;
  const raw = Math.max(0.1, Math.min(base * pinch, 4));
  const frame = frameSize(device, orientation);
  // Snap the scale so the frame maps to a whole number of device pixels.
  // Fractional sizes make the compositor resample the iframe texture, which
  // visibly softens text — especially at fit-to-panel scales.
  const dpr = window.devicePixelRatio || 1;
  const scale = Math.round(frame.width * raw * dpr) / (frame.width * dpr);

  // Trackpad pinch / ctrl+wheel nudges the zoom without reloading the app.
  // Attached natively and non-passive: React registers wheel listeners as
  // passive, so preventDefault inside a React onWheel cannot stop the panel
  // from scrolling/zooming while the user pinches.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setPinch((p) => Math.max(0.3, Math.min(p * (e.deltaY < 0 ? 1.06 : 0.94), 3)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [stageRef]);

  const connected = status.state === 'connected' && !!status.url;

  return (
    <div
      className="dp-stage"
      ref={stageRef}
      aria-label="Device stage"
    >
      <div
        className="dp-stage__scaler"
        style={{ width: frame.width * scale, height: frame.height * scale }}
      >
        <div
          className="dp-stage__inner"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: frame.width,
            height: frame.height,
          }}
        >
          <DeviceFrame
            ref={screenRef}
            device={device}
            orientation={orientation}
            url={connected ? status.url : null}
            reloadNonce={reloadNonce}
            onLoad={onIframeLoad}
            onError={onIframeError}
          />
        </div>
      </div>

      {connected && loading && (
        <div className="dp-overlay" role="status" aria-live="polite">
          <div className="dp-spinner" />
          <span>Loading preview…</span>
        </div>
      )}

      {!connected && (
        <div className="dp-overlay">
          <div className="dp-empty">
            <h3>
              {status.state === 'searching'
                ? 'Searching for a dev server…'
                : 'No dev server found for this workspace'}
            </h3>
            <p>
              {status.state === 'searching'
                ? 'Looking for a dev server started from this workspace.'
                : (status.detail ??
                  'Start your dev server (e.g. npm run dev) or connect to a URL manually.')}
            </p>
            {status.state !== 'searching' && (
              <div className="dp-empty__actions">
                <button className="dp-btn dp-btn--primary" onClick={onReconnect}>
                  Retry detection
                </button>
                <button className="dp-btn" onClick={onConnectUrl}>
                  Connect to URL…
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && connected && (
        <div className="dp-overlay">
          <div className="dp-empty">
            <h3>Preview failed to load</h3>
            <p>{error}</p>
            <div className="dp-empty__actions">
              <button className="dp-btn dp-btn--primary" onClick={onReconnect}>
                Reconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
