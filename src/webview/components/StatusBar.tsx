import type { ServerStatus } from '@shared/protocol';

interface StatusBarProps {
  status: ServerStatus;
  route: string | null;
  autoRefresh: boolean;
  lastRefresh: number | null;
  onOpenBrowser: () => void;
}

const LABEL: Record<ServerStatus['state'], string> = {
  connected: 'Connected',
  searching: 'Searching…',
  disconnected: 'Disconnected',
};

function timeAgo(ts: number): string {
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  return `${mins}m ago`;
}

/** Bottom status bar mirroring the connection state, server URL and activity. */
export function StatusBar({ status, route, autoRefresh, lastRefresh, onOpenBrowser }: StatusBarProps) {
  return (
    <div className="dp-statusbar" role="status" aria-live="polite">
      <span className="dp-status" title={status.detail}>
        <span className={`dp-status__dot is-${status.state}`} />
        {LABEL[status.state]}
      </span>

      {status.url && (
        <span className="dp-status dp-status--link" onClick={onOpenBrowser} title="Open in browser">
          {status.url.replace(/^https?:\/\//, '')}
          {route && route !== '/' ? <strong>{route}</strong> : null}
        </span>
      )}

      {status.hmr && status.state === 'connected' && <span className="dp-status">HMR</span>}

      <span className="dp-statusbar__spacer" />

      {autoRefresh && <span className="dp-status">Watching files</span>}
      {lastRefresh && <span className="dp-status">Refreshed {timeAgo(lastRefresh)}</span>}
    </div>
  );
}
