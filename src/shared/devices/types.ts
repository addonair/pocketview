/**
 * Device model shared between the extension host and the webview.
 *
 * Every device in the library is *pure data* described by this interface. The
 * rendering logic (webview) and the screenshot engine (host) both consume these
 * objects, so adding a new device never requires touching rendering code — just
 * add a definition to a catalog file.
 */

/** High level grouping used by the device picker filters. */
export type DeviceCategory =
  | 'phone'
  | 'tablet'
  | 'foldable'
  | 'watch'
  | 'desktop'
  | 'laptop'
  | 'generic';

export type Orientation = 'portrait' | 'landscape';

/** Shape of the display cut-out / camera housing. */
export type NotchType = 'none' | 'notch' | 'island' | 'punch-hole' | 'punch-hole-center';

/** Geometry for a notch / Dynamic Island / punch-hole, in CSS pixels. */
export interface NotchGeometry {
  type: NotchType;
  /** Width of the cut-out in CSS px (portrait, measured along the top edge). */
  width: number;
  /** Height of the cut-out in CSS px. */
  height: number;
  /** Distance from the top of the screen in CSS px (islands float below the edge). */
  top: number;
  /** Corner radius of the cut-out in CSS px. */
  radius: number;
}

/** Safe-area insets in CSS pixels (portrait orientation). */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Physical hardware buttons rendered on the device bezel. */
export interface HardwareButton {
  /** Which edge the button sits on. */
  side: 'left' | 'right' | 'top' | 'bottom';
  /** Distance from the top (for left/right) or left (for top/bottom) edge, as a
   *  fraction (0–1) of that edge length. */
  offset: number;
  /** Length of the button along the edge, as a fraction (0–1) of the edge. */
  length: number;
  /** Human readable label for accessibility / tooltips. */
  label: string;
}

/** Foldable device configuration. */
export interface FoldableConfig {
  /** Viewport when fully unfolded (the primary large screen). */
  unfolded: { width: number; height: number };
  /** Viewport of the cover / folded screen. */
  folded: { width: number; height: number };
  /** Whether a half-open (laptop / flex) posture is supported. */
  supportsHalf: boolean;
  /** Orientation of the fold line on the unfolded screen. */
  foldAxis: 'vertical' | 'horizontal';
}

export interface Device {
  /** Stable, unique, kebab-case identifier (e.g. "iphone-15-pro"). */
  id: string;
  /** Human readable name (e.g. "iPhone 15 Pro"). */
  name: string;
  /** Manufacturer / brand (e.g. "Apple"). */
  manufacturer: string;
  /** Picker category. */
  category: DeviceCategory;
  /** Year of release. */
  releaseYear: number;
  /** Operating system label (e.g. "iOS 17"). */
  os: string;
  /** Logical viewport size in CSS pixels (portrait). */
  viewport: { width: number; height: number };
  /** CSS device pixel ratio. */
  pixelRatio: number;
  /** Native panel resolution in physical pixels. */
  physicalResolution: { width: number; height: number };
  /** Safe-area insets (portrait). */
  safeAreaInsets: SafeAreaInsets;
  /** Screen corner radius in CSS px. */
  cornerRadius: number;
  /** Bezel thickness around the screen in CSS px. */
  bezel: number;
  /** Display cut-out geometry. */
  notch: NotchGeometry;
  /** Hardware buttons drawn on the frame. */
  hardwareButtons: HardwareButton[];
  /** Status bar height in CSS px (0 for desktop/laptop). */
  statusBarHeight: number;
  /** Navigation bar / home indicator height in CSS px. */
  navBarHeight: number;
  /** Supported orientations. */
  orientations: Orientation[];
  /** Whether the device is touch capable. */
  touch: boolean;
  /** Default browser user agent used for screenshots. */
  userAgent: string;
  /** Optional foldable configuration. */
  foldable?: FoldableConfig;
}

/** A device paired with UI-facing state (favorite / recent flags). */
export interface DeviceListItem extends Device {
  favorite: boolean;
  recent: boolean;
}
