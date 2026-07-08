import type { SystemSettings, TextDirection, ThemeMode } from '@shared/protocol';
import { TEXT_SCALE_RANGE } from '../state/reducer';
import { CloseIcon } from './icons';

interface SettingsPanelProps {
  system: SystemSettings;
  showFrame: boolean;
  showSafeArea: boolean;
  onTheme: (theme: ThemeMode) => void;
  onTextScale: (scale: number) => void;
  onDirection: (direction: TextDirection) => void;
  onToggleFrame: () => void;
  onToggleSafeArea: () => void;
  onReset: () => void;
  onClose: () => void;
}

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const DIRECTIONS: { value: TextDirection; label: string }[] = [
  { value: 'ltr', label: 'LTR' },
  { value: 'rtl', label: 'RTL' },
];

/**
 * Slide-out panel mirroring device_preview's "system" section: forced color
 * scheme, text scaling, and text direction (applied to the previewed app via
 * the proxy agent), plus the display toggles for the device frame and
 * safe-area guides.
 */
export function SettingsPanel(props: SettingsPanelProps) {
  const { system } = props;
  return (
    <>
      <div className="dp-scrim" onClick={props.onClose} aria-hidden />
      <aside className="dp-settings" role="dialog" aria-label="Preview settings">
        <header className="dp-settings__head">
          <h2>Settings</h2>
          <button className="dp-iconbtn" onClick={props.onClose} aria-label="Close settings" title="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="dp-settings__body">
          <section className="dp-field">
            <span className="dp-field__label">Appearance</span>
            <div className="dp-segmented" role="group" aria-label="Color scheme">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  className={`dp-seg ${system.theme === t.value ? 'is-active' : ''}`}
                  onClick={() => props.onTheme(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="dp-field__hint">
              Drives JS-based theming (matchMedia, dark class). Pure CSS
              prefers-color-scheme can’t be forced from here.
            </p>
          </section>

          <section className="dp-field">
            <span className="dp-field__label">
              Text scale <span className="dp-field__value">{Math.round(system.textScale * 100)}%</span>
            </span>
            <input
              type="range"
              className="dp-range"
              min={TEXT_SCALE_RANGE.min}
              max={TEXT_SCALE_RANGE.max}
              step={TEXT_SCALE_RANGE.step}
              value={system.textScale}
              onChange={(e) => props.onTextScale(Number(e.target.value))}
              aria-label="Text scale"
            />
            <p className="dp-field__hint">Scales the app’s root font size (rem/em-based type).</p>
          </section>

          <section className="dp-field">
            <span className="dp-field__label">Text direction</span>
            <div className="dp-segmented" role="group" aria-label="Text direction">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.value}
                  className={`dp-seg ${system.direction === d.value ? 'is-active' : ''}`}
                  onClick={() => props.onDirection(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          <hr className="dp-settings__rule" />

          <section className="dp-field">
            <span className="dp-field__label">Display</span>
            <label className="dp-switch">
              <input type="checkbox" checked={props.showFrame} onChange={props.onToggleFrame} />
              <span>Device frame</span>
            </label>
            <label className="dp-switch">
              <input type="checkbox" checked={props.showSafeArea} onChange={props.onToggleSafeArea} />
              <span>Safe-area guides</span>
            </label>
          </section>
        </div>

        <footer className="dp-settings__foot">
          <button className="dp-btn" onClick={props.onReset}>
            Reset system settings
          </button>
        </footer>
      </aside>
    </>
  );
}
