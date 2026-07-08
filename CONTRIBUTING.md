# Contributing to PocketView

Thanks for your interest in improving PocketView! This guide covers the dev
workflow and the (deliberately simple) process for adding devices.

## Prerequisites

- Node.js 18+
- VS Code 1.85+

## Setup

```bash
npm install
npm run build
```

Press <kbd>F5</kbd> to launch the Extension Development Host. Run
`npm run watch` in a terminal for incremental rebuilds while you iterate; reload
the dev host window (`Developer: Reload Window`) to pick up changes.

## Project layout

```
src/
  extension.ts            Extension entry point
  extension/
    commands/             Command registration
    preview/              PreviewPanel (webview host) + PreviewController
    services/             ServerDetector, ScreenshotService, StateStore
    watchers/             FileWatcher
    statusbar/            StatusBarManager
    utils/                logger, debounce, httpProbe
  webview/                React UI (components, hooks, state, styles)
  shared/
    protocol.ts           Typed host <-> webview messages
    devices/              Device model, registry, and catalog
test/
  unit/                   Vitest unit tests
  webview/                Vitest + Testing Library component tests
  integration/            @vscode/test-electron suite
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run build` | Build extension host and webview bundles |
| `npm run watch` | Rebuild both bundles on change |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | ESLint (must be warning-free) |
| `npm run format` | Prettier |
| `npm test` | Unit + webview tests |
| `npm run test:integration` | Integration tests in a real VS Code |
| `npm run package` | Produce a `.vsix` |

## Adding a device

Devices are pure data — the frame renders entirely from the definition, so you
never touch rendering code.

1. Open the appropriate file in `src/shared/devices/catalog/` (e.g.
   `apple-iphone.ts`, `google-pixel.ts`) or create a new one.
2. Add an entry using the `makeDevice` helper, which fills in sensible defaults:

   ```ts
   makeDevice({
     id: 'my-phone-pro',
     name: 'My Phone Pro',
     manufacturer: 'Acme',
     category: 'phone',
     releaseYear: 2025,
     os: 'Android 15',
     viewport: { width: 412, height: 915 },
     pixelRatio: 2.6,
     cornerRadius: 40,
     notch: { type: 'punch-hole-center', width: 22, height: 22, top: 10, radius: 11 },
     safeAreaInsets: { top: 24, right: 0, bottom: 20, left: 0 },
     statusBarHeight: 26,
     navBarHeight: 20,
     hardwareButtons: phoneButtons,
     userAgent: UA.android('ACME-PRO'),
   });
   ```

3. If you created a new file, import and spread it in
   `src/shared/devices/registry.ts`.
4. Run `npm test` — `registry.test.ts` verifies ids are unique and dimensions
   are valid.

## Testing

- Keep pure logic (registry, reducer, utilities) covered by unit tests.
- Cover UI behavior (picker search/filter, toolbar actions, frame geometry) with
  Testing Library tests under `test/webview`.
- `npm run lint` must pass with zero warnings before you open a PR.
