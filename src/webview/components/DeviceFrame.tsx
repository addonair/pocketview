import { forwardRef, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import type { Device, Orientation } from '@shared/devices/types';
import type { SystemSettings } from '@shared/protocol';
import { screenSize } from '../deviceGeometry';

interface DeviceFrameProps {
  device: Device;
  orientation: Orientation;
  url: string | null;
  reloadNonce: number;
  /** Draw the physical body (bezel, buttons); false renders a frameless screen. */
  chrome: boolean;
  /** Show the safe-area guide overlay. */
  showSafeArea: boolean;
  /** Simulated system environment pushed into the app via the proxy agent. */
  system: SystemSettings;
  onLoad: () => void;
  onError: () => void;
}

/**
 * Renders a realistic device entirely in CSS from a {@link Device} definition:
 * bezel, corner radius, notch / Dynamic Island / punch-hole, hardware buttons,
 * home indicator, and safe-area guides. The app is shown in an iframe that fills
 * the screen area. No per-device code — everything derives from the data object.
 */
export const DeviceFrame = forwardRef<HTMLDivElement, DeviceFrameProps>(function DeviceFrame(
  { device, orientation, url, reloadNonce, chrome, showSafeArea, system, onLoad, onError },
  screenRef,
) {
  const screen = screenSize(device, orientation);
  const bezel = chrome ? device.bezel : 0;
  const outerW = screen.width + bezel * 2;
  const outerH = screen.height + bezel * 2;
  const landscape = orientation === 'landscape';

  // Notch geometry is authored in portrait; swap axes in landscape so it stays
  // on the same physical edge (which is now on the left/right).
  const notch = device.notch;
  const insets = device.safeAreaInsets;

  // Push the current system simulation into the app. The proxy-injected agent
  // listens for these messages; without the proxy (direct connection) they are
  // harmlessly ignored. Re-sent on every load so a reloaded app re-applies.
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const postSettings = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ pocketViewSettings: system }, '*');
  }, [system]);
  const handleLoad = () => {
    postSettings();
    onLoad();
  };
  // Settings changed while the app is already loaded — apply without a reload.
  useEffect(() => {
    postSettings();
  }, [postSettings]);

  return (
    <div
      className={`dp-device ${chrome ? '' : 'is-frameless'} ${showSafeArea ? 'show-safe' : ''}`}
      style={{
        width: outerW,
        height: outerH,
        borderRadius: chrome ? device.cornerRadius + bezel : device.cornerRadius,
        padding: bezel,
      }}
      role="img"
      aria-label={`${device.name} frame, ${orientation}`}
    >
      {/* Hardware buttons (chrome only) */}
      {chrome && device.hardwareButtons.map((btn, i) => {
        const along = btn.side === 'left' || btn.side === 'right' ? outerH : outerW;
        const thickness = 3;
        const style: CSSProperties =
          btn.side === 'left' || btn.side === 'right'
            ? { top: along * btn.offset, height: along * btn.length, width: thickness }
            : { left: along * btn.offset, width: along * btn.length, height: thickness };
        return (
          <span
            key={i}
            className={`dp-button dp-button--${btn.side}`}
            style={style}
            aria-hidden
            title={btn.label}
          />
        );
      })}

      <div
        className="dp-device__screen"
        ref={screenRef}
        style={{
          top: bezel,
          left: bezel,
          width: screen.width,
          height: screen.height,
          borderRadius: device.cornerRadius,
        }}
      >
        {/* Notch / island / punch-hole. Rotation is counter-clockwise, so the
            portrait top edge (where these live) becomes the left edge. */}
        {chrome && notch.type !== 'none' && (
          <span
            className={`dp-notch ${notch.type === 'island' ? 'dp-notch--island' : ''}`}
            style={
              landscape
                ? {
                    width: notch.height,
                    height: notch.width,
                    left: notch.type === 'island' ? notch.top : 0,
                    top: notch.type === 'punch-hole' ? 12 : '50%',
                    transform: notch.type === 'punch-hole' ? 'none' : 'translateY(-50%)',
                    borderRadius:
                      notch.type === 'notch'
                        ? `0 ${notch.radius}px ${notch.radius}px 0`
                        : notch.radius,
                  }
                : {
                    width: notch.width,
                    height: notch.height,
                    top: notch.type === 'island' ? notch.top : 0,
                    // `left: auto` beats the stylesheet's `left: 50%` so the
                    // punch-hole can actually sit at `right: 12`.
                    left: notch.type === 'punch-hole' ? 'auto' : '50%',
                    right: notch.type === 'punch-hole' ? 12 : undefined,
                    transform: notch.type === 'punch-hole' ? 'none' : 'translateX(-50%)',
                    borderRadius:
                      notch.type === 'notch'
                        ? `0 0 ${notch.radius}px ${notch.radius}px`
                        : notch.radius,
                  }
            }
            aria-hidden
          />
        )}

        {url ? (
          <iframe
            key={reloadNonce}
            ref={iframeRef}
            title={`${device.name} preview`}
            src={url}
            onLoad={handleLoad}
            onError={onError}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads"
            allow="accelerometer; camera; microphone; geolocation; clipboard-read; clipboard-write"
          />
        ) : null}

        {/* Home indicator for gesture-nav devices (chrome only) */}
        {chrome && device.navBarHeight > 0 && (
          <span
            className="dp-home-indicator"
            style={{ bottom: 8, width: Math.min(140, screen.width * 0.35), height: 5 }}
            aria-hidden
          />
        )}

        {/* Safe-area guide (hidden unless .show-safe toggled on the device) */}
        <span
          className="dp-safe-area"
          style={{
            borderTopWidth: landscape ? insets.left : insets.top,
            borderBottomWidth: landscape ? insets.right : insets.bottom,
            borderLeftWidth: landscape ? insets.top : insets.left,
            borderRightWidth: landscape ? insets.bottom : insets.right,
          }}
          aria-hidden
        />
      </div>
    </div>
  );
});
