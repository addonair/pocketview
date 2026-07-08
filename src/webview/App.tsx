import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { HostToWebview, PersistedState, ZoomLevel } from '@shared/protocol';
import { resolveDevice } from '@shared/devices/registry';
import { reducer, initialState, type UiState } from './state/reducer';
import { useVscodeApi } from './hooks/useVscodeApi';
import { compositeDeviceFrame } from './screenshotComposite';
import { Toolbar } from './components/Toolbar';
import { DeviceStage } from './components/DeviceStage';
import { DevicePicker } from './components/DevicePicker';
import { StatusBar } from './components/StatusBar';

/** Extract the persisted slice of the UI state. */
function toPersisted(state: UiState): PersistedState {
  return {
    deviceId: state.deviceId,
    zoom: state.zoom,
    orientation: state.orientation,
    favorites: state.favorites,
    recents: state.recents,
  };
}

/** Root component: owns UI state, host messaging, screenshots, and shortcuts. */
export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const initializedRef = useRef(false);
  const screenRef = useRef<HTMLDivElement>(null);

  const device = resolveDevice(state.deviceId);

  // --- Host → webview messages ---------------------------------------------
  const handleHostMessage = useCallback((message: HostToWebview) => {
    switch (message.type) {
      case 'init':
        initializedRef.current = true;
        dispatch({ type: 'init', config: message.config, state: message.state, status: message.status });
        break;
      case 'serverStatus':
        dispatch({ type: 'status', status: message.status });
        break;
      case 'applyConfig':
        dispatch({ type: 'applyConfig', config: message.config });
        break;
      case 'reload':
        dispatch({ type: 'reload' });
        break;
      case 'setDevice':
        dispatch({ type: 'selectDevice', deviceId: message.deviceId });
        break;
      case 'nextDevice':
        dispatch({ type: 'cycleDevice', direction: message.direction });
        break;
      case 'rotate':
        dispatch({ type: 'rotate' });
        break;
      case 'setZoom':
        dispatch({ type: 'setZoom', zoom: message.zoom });
        break;
      case 'toggleFullscreen':
        dispatch({ type: 'toggleFullscreen' });
        break;
      case 'fileChanged':
        dispatch({ type: 'fileChanged', at: message.at });
        break;
      case 'error':
        dispatch({ type: 'setError', error: message.message });
        break;
      case 'requestScreenshot':
        beginScreenshot();
        break;
      case 'screenshotResult':
        if (message.ok && message.framePngBase64) {
          void finishComposite(message.framePngBase64);
        }
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { post } = useVscodeApi(handleHostMessage);

  // Announce readiness so the host sends the initial state.
  useEffect(() => {
    post({ type: 'ready' });
  }, [post]);

  // Persist UI state whenever the relevant slice changes (after init).
  useEffect(() => {
    if (!initializedRef.current) return;
    post({ type: 'persistState', state: toPersisted(stateRef.current) });
  }, [state.deviceId, state.orientation, state.zoom, state.favorites, state.recents, post]);

  // The proxy injects a reporter into the app that posts its route on every
  // navigation; relay it into UI state and to the host (screenshot default).
  useEffect(() => {
    const onRoute = (event: MessageEvent) => {
      const data = event.data as { pocketViewRoute?: unknown } | null;
      if (data && typeof data.pocketViewRoute === 'string') {
        dispatch({ type: 'setRoute', route: data.pocketViewRoute });
        post({ type: 'routeChanged', route: data.pocketViewRoute });
      }
    };
    window.addEventListener('message', onRoute);
    return () => window.removeEventListener('message', onRoute);
  }, [post]);

  // Track focus so the host can scope keybindings to the panel.
  useEffect(() => {
    const onFocus = () => post({ type: 'setContext', focused: true });
    const onBlur = () => post({ type: 'setContext', focused: false });
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, [post]);

  // --- Screenshot flow ------------------------------------------------------
  const beginScreenshot = useCallback(() => {
    const s = stateRef.current;
    post({ type: 'captureScreenshot', deviceId: s.deviceId, orientation: s.orientation });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishComposite = useCallback(async (screenPng: string) => {
    const s = stateRef.current;
    try {
      const framed = await compositeDeviceFrame(resolveDevice(s.deviceId), s.orientation, screenPng);
      post({ type: 'compositeScreenshot', pngBase64: framed });
    } catch (err) {
      post({
        type: 'log',
        level: 'error',
        message: `Frame composite failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      // Fall back to the raw capture so the user still gets an image.
      post({ type: 'compositeScreenshot', pngBase64: screenPng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- In-webview keyboard shortcuts ---------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) return;
      if (stateRef.current.pickerOpen) return;
      switch (e.key.toLowerCase()) {
        case 'r':
          dispatch({ type: 'rotate' });
          break;
        case 'f':
          dispatch({ type: 'toggleFullscreen' });
          break;
        case 'arrowright':
          dispatch({ type: 'cycleDevice', direction: 1 });
          break;
        case 'arrowleft':
          dispatch({ type: 'cycleDevice', direction: -1 });
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- Callbacks passed to children ----------------------------------------
  const onZoom = useCallback((zoom: ZoomLevel) => dispatch({ type: 'setZoom', zoom }), []);
  const onReconnect = useCallback(() => post({ type: 'reconnect' }), [post]);
  const onOpenBrowser = useCallback(() => post({ type: 'openInBrowser' }), [post]);
  const onConnectUrl = useCallback(() => {
    // Empty url asks the host to show its native "Connect to URL" input box.
    post({ type: 'connectUrl', url: '' });
  }, [post]);

  return (
    <div className={`dp-app ${state.fullscreen ? 'is-fullscreen' : ''}`}>
      <Toolbar
        device={device}
        orientation={state.orientation}
        zoom={state.zoom}
        canRotate={device.orientations.length > 1}
        onOpenPicker={() => dispatch({ type: 'setPicker', open: true })}
        onRotate={() => dispatch({ type: 'rotate' })}
        onRefresh={() => dispatch({ type: 'reload' })}
        onReconnect={onReconnect}
        onZoom={onZoom}
        onOpenBrowser={onOpenBrowser}
        onConnectUrl={onConnectUrl}
        onScreenshot={beginScreenshot}
        onToggleFullscreen={() => dispatch({ type: 'toggleFullscreen' })}
      />

      <DeviceStage
        device={device}
        orientation={state.orientation}
        zoom={state.zoom}
        status={state.status}
        loading={state.loading}
        error={state.error}
        reloadNonce={state.reloadNonce}
        screenRef={screenRef}
        onIframeLoad={() => dispatch({ type: 'setLoading', loading: false })}
        onIframeError={() => dispatch({ type: 'setError', error: 'The page could not be displayed.' })}
        onReconnect={onReconnect}
        onConnectUrl={onConnectUrl}
      />

      <StatusBar
        status={state.status}
        route={state.route}
        autoRefresh={state.config.autoRefresh}
        lastRefresh={state.lastRefresh}
        onOpenBrowser={onOpenBrowser}
      />

      {state.pickerOpen && (
        <DevicePicker
          currentId={state.deviceId}
          favorites={state.favorites}
          recents={state.recents}
          onSelect={(id) => dispatch({ type: 'selectDevice', deviceId: id })}
          onToggleFavorite={(id) => dispatch({ type: 'toggleFavorite', deviceId: id })}
          onClose={() => dispatch({ type: 'setPicker', open: false })}
        />
      )}
    </div>
  );
}
