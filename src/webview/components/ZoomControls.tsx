import type { ZoomLevel } from '@shared/protocol';
import { ZoomInIcon, ZoomOutIcon } from './icons';

interface ZoomControlsProps {
  zoom: ZoomLevel;
  onChange: (zoom: ZoomLevel) => void;
}

const STEPS: ZoomLevel[] = [25, 50, 75, 100, 125, 150, 200];

/** Zoom stepper with discrete 25–200% levels plus a Fit-to-Panel toggle. */
export function ZoomControls({ zoom, onChange }: ZoomControlsProps) {
  const numeric = zoom === 'fit' ? 100 : zoom;

  const step = (dir: 1 | -1) => {
    const idx = STEPS.indexOf(numeric as ZoomLevel);
    const fallback = STEPS.indexOf(100);
    const nextIdx = Math.min(STEPS.length - 1, Math.max(0, (idx === -1 ? fallback : idx) + dir));
    onChange(STEPS[nextIdx]);
  };

  return (
    <div className="dp-zoom" role="group" aria-label="Zoom">
      <button
        className="dp-iconbtn"
        onClick={() => step(-1)}
        aria-label="Zoom out"
        disabled={zoom !== 'fit' && numeric === STEPS[0]}
      >
        <ZoomOutIcon />
      </button>
      <span className="dp-zoom__value" aria-live="polite">
        {zoom === 'fit' ? 'Fit' : `${zoom}%`}
      </span>
      <button
        className="dp-iconbtn"
        onClick={() => step(1)}
        aria-label="Zoom in"
        disabled={zoom !== 'fit' && numeric === STEPS[STEPS.length - 1]}
      >
        <ZoomInIcon />
      </button>
      <button
        className={`dp-iconbtn ${zoom === 'fit' ? 'is-active' : ''}`}
        onClick={() => onChange('fit')}
        aria-label="Fit to panel"
        title="Fit to panel"
      >
        Fit
      </button>
    </div>
  );
}
