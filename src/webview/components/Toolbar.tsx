import type { Device } from '@shared/devices/types';
import type { ZoomLevel } from '@shared/protocol';
import { ZoomControls } from './ZoomControls';
import {
  BrowserIcon,
  CameraIcon,
  ChevronDownIcon,
  FullscreenIcon,
  PlugIcon,
  RefreshIcon,
  RotateIcon,
} from './icons';

interface ToolbarProps {
  device: Device;
  orientation: string;
  zoom: ZoomLevel;
  canRotate: boolean;
  onOpenPicker: () => void;
  onRotate: () => void;
  onRefresh: () => void;
  onReconnect: () => void;
  onZoom: (zoom: ZoomLevel) => void;
  onOpenBrowser: () => void;
  onConnectUrl: () => void;
  onScreenshot: () => void;
  onToggleFullscreen: () => void;
}

/** Primary toolbar with the device selector, actions, and zoom controls. */
export function Toolbar(props: ToolbarProps) {
  const { device } = props;
  return (
    <div className="dp-toolbar" role="toolbar" aria-label="PocketView toolbar">
      <button
        className="dp-device-select"
        onClick={props.onOpenPicker}
        aria-haspopup="dialog"
        aria-label="Choose device"
        title="Choose device"
      >
        <span className="dp-device-select__name">{device.name}</span>
        <span className="dp-device-select__meta">
          {device.viewport.width}×{device.viewport.height} · {device.pixelRatio}x
        </span>
        <ChevronDownIcon />
      </button>

      <span className="dp-sep" />

      <button
        className="dp-iconbtn"
        onClick={props.onRotate}
        disabled={!props.canRotate}
        aria-label="Rotate device"
        title="Rotate"
      >
        <RotateIcon />
      </button>
      <button className="dp-iconbtn" onClick={props.onRefresh} aria-label="Refresh preview" title="Refresh">
        <RefreshIcon />
      </button>
      <button
        className="dp-iconbtn"
        onClick={props.onReconnect}
        aria-label="Reconnect to dev server"
        title="Reconnect"
      >
        <PlugIcon />
      </button>

      <span className="dp-toolbar__spacer" />

      <ZoomControls zoom={props.zoom} onChange={props.onZoom} />

      <span className="dp-sep" />

      <button
        className="dp-iconbtn"
        onClick={props.onScreenshot}
        aria-label="Capture screenshot"
        title="Capture screenshot"
      >
        <CameraIcon />
      </button>
      <button
        className="dp-iconbtn"
        onClick={props.onConnectUrl}
        aria-label="Connect to URL"
        title="Connect to URL"
      >
        URL
      </button>
      <button
        className="dp-iconbtn"
        onClick={props.onOpenBrowser}
        aria-label="Open in browser"
        title="Open in browser"
      >
        <BrowserIcon />
      </button>
      <button
        className="dp-iconbtn"
        onClick={props.onToggleFullscreen}
        aria-label="Toggle fullscreen"
        title="Toggle fullscreen"
      >
        <FullscreenIcon />
      </button>
    </div>
  );
}
