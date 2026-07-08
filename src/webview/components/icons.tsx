import type { SVGProps } from 'react';

/** Minimal inline SVG icon set (24×24 viewBox) — no external font dependency. */
type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
  ...props,
});

export const RotateIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 6V3L8 7l4 4V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
  </svg>
);

export const RefreshIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M17.65 6.35A8 8 0 1 0 19.73 14h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </svg>
);

export const PlugIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 2v6H7v3a5 5 0 0 0 4 4.9V22h2v-6.1A5 5 0 0 0 17 11V8h-2V2h-2v6h-2V2H9z" />
  </svg>
);

export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 3l-1.8 2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
  </svg>
);

export const BrowserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-3a15.7 15.7 0 0 0-1.3-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.6 1.9 4h-3.8c.4-1.4 1.1-2.8 1.9-4zM4.3 14a7.9 7.9 0 0 1 0-4h3.4a17.8 17.8 0 0 0 0 4H4.3zm.8 2h3a15.7 15.7 0 0 0 1.3 3.6A8 8 0 0 1 5.1 16zm3-8h-3a8 8 0 0 1 4.3-3.6A15.7 15.7 0 0 0 8.1 8zM12 20c-.8-1.2-1.5-2.6-1.9-4h3.8c-.4 1.4-1.1 2.8-1.9 4zm2.3-6H9.7a15.8 15.8 0 0 1 0-4h4.6a15.8 15.8 0 0 1 0 4zm.6 5.6c.6-1.1 1-2.3 1.3-3.6h3a8 8 0 0 1-4.3 3.6zm1.7-5.6a17.8 17.8 0 0 0 0-4h3.4a7.9 7.9 0 0 1 0 4h-3.4z" />
  </svg>
);

export const FullscreenIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 10l5 5 5-5z" />
  </svg>
);

export const StarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 17.3l6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7 2 9.3l5.4 4.7-1.6 7z" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
  </svg>
);

export const ZoomInIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 7h-2v3H8v2h3v3h2v-3h3v-2h-3V7z" />
  </svg>
);

export const ZoomOutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 10h8v2H8z" />
  </svg>
);

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19.4 13a7.8 7.8 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1l-.3-2.5H10.9l-.4 2.6a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.8 7.8 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.8 1.7 1l.4 2.5h4.2l.4-2.6c.6-.2 1.2-.5 1.7-1l2.4 1 2-3.4-2-1.5zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
  </svg>
);

export const FrameIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm0 18H7V5h10v14z" />
  </svg>
);

export const SafeAreaIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7z" opacity="0.9" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18.3 5.7l-1.4-1.4L12 9.2 7.1 4.3 5.7 5.7 10.6 12l-4.9 4.9 1.4 1.4L12 13.4l4.9 4.9 1.4-1.4L13.4 12z" />
  </svg>
);
