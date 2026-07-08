# Changelog

All notable changes to the PocketView extension are documented here. The
format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-07-08

First public release, as **PocketView** (formerly "Device Preview").

### Added

- Live device preview in a realistic, CSS-drawn device frame with bezel,
  notch / Dynamic Island / punch-hole, hardware buttons, home indicator, and
  safe-area guides — correct in both portrait and landscape.
- **Workspace-aware dev-server detection**: listening ports are matched to
  their owning process, and only servers started from the current workspace
  folder are used — running several projects at once never previews the wrong
  app. Most recently started server wins; full accept/reject diagnostics in
  the PocketView output channel.
- **Route tracking**: the preview is served through a local helper proxy that
  forwards to the dev server (HMR WebSockets included) and injects a route
  reporter, so PocketView knows which page you're on. The current route shows
  in the status bar, and the Capture Screenshot prompt is prefilled with the
  page you're viewing. Toggle with `pocketView.routeTracking`.
- `pocketView.url` setting to pin the preview to an exact URL per workspace.
- File watching with debounced refresh and an HMR-vs-reload heuristic that
  defers to Vite / Next / Nuxt when detected.
- Large, extensible device library across Apple, Google, Samsung, OnePlus,
  Xiaomi, Nothing, Motorola, Sony, plus desktop, laptop, generic, and watch
  presets — with a searchable picker (favorites, recents, filters, sorting).
- Rotate, zoom (25–200% + Fit-to-Panel, Ctrl+wheel pinch), fullscreen, and a
  scrollable stage when the device exceeds the panel.
- Screenshot capture via an invisible headless browser engine at exact device
  resolution, with optional device-frame compositing.
- Resolved server URL surfaced in the panel tab title and status bars.
- Theme-aware webview UI, status bar item, keyboard shortcuts, and
  accessibility support.
- Unit, webview, and VS Code integration tests (50+ tests), including
  real-process detection tests.
