import { useEffect, useMemo, useRef, useState } from 'react';
import type { Device, DeviceCategory } from '@shared/devices/types';
import {
  CATEGORIES,
  DEVICES,
  MANUFACTURERS,
  filterDevices,
  sortDevices,
  type DeviceSort,
} from '@shared/devices/registry';
import { SearchIcon, StarIcon } from './icons';

interface DevicePickerProps {
  currentId: string;
  favorites: string[];
  recents: string[];
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
}

interface Group {
  title: string;
  devices: Device[];
}

/**
 * Searchable, filterable device picker modal. Supports instant search, favorites
 * (pinned to the top), recently used devices, manufacturer/category filters, and
 * multiple sort orders. Fully keyboard navigable.
 */
export function DevicePicker(props: DevicePickerProps) {
  const { currentId, favorites, recents } = props;
  const [query, setQuery] = useState('');
  const [manufacturer, setManufacturer] = useState<string | undefined>();
  const [category, setCategory] = useState<DeviceCategory | undefined>();
  const [sort, setSort] = useState<DeviceSort>('name');
  const [highlight, setHighlight] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(
    () => sortDevices(filterDevices(DEVICES, { query, manufacturer, category }), sort),
    [query, manufacturer, category, sort],
  );

  const isFiltering = !!query.trim() || !!manufacturer || !!category;

  const groups: Group[] = useMemo(() => {
    if (isFiltering) return [{ title: 'Results', devices: filtered }];
    const favDevices = favorites
      .map((id) => DEVICES.find((d) => d.id === id))
      .filter((d): d is Device => !!d);
    const recentDevices = recents
      .map((id) => DEVICES.find((d) => d.id === id))
      .filter((d): d is Device => !!d && !favorites.includes(d.id));
    const result: Group[] = [];
    if (favDevices.length) result.push({ title: 'Favorites', devices: favDevices });
    if (recentDevices.length) result.push({ title: 'Recently used', devices: recentDevices });
    result.push({ title: 'All devices', devices: filtered });
    return result;
  }, [isFiltering, filtered, favorites, recents]);

  // Flatten for keyboard navigation.
  const flat = useMemo(() => groups.flatMap((g) => g.devices), [groups]);

  useEffect(() => {
    setHighlight(0);
  }, [query, manufacturer, category, sort]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      props.onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(flat.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const device = flat[highlight];
      if (device) props.onSelect(device.id);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('.is-highlighted');
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [highlight]);

  let runningIndex = -1;

  return (
    <div
      className="dp-picker__backdrop"
      onClick={props.onClose}
      role="presentation"
    >
      <div
        className="dp-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a device"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="dp-picker__search">
          <SearchIcon width={16} height={16} style={{ fill: 'var(--dp-fg-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search devices…"
            aria-label="Search devices"
            spellCheck={false}
          />
        </div>

        <div className="dp-picker__filters">
          <button
            className={`dp-chip ${!category ? 'is-active' : ''}`}
            onClick={() => setCategory(undefined)}
          >
            All types
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`dp-chip ${category === cat ? 'is-active' : ''}`}
              onClick={() => setCategory(category === cat ? undefined : cat)}
            >
              {cat}
            </button>
          ))}
          <select
            className="dp-picker__select"
            value={manufacturer ?? ''}
            onChange={(e) => setManufacturer(e.target.value || undefined)}
            aria-label="Filter by manufacturer"
          >
            <option value="">All brands</option>
            {MANUFACTURERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="dp-picker__select"
            value={sort}
            onChange={(e) => setSort(e.target.value as DeviceSort)}
            aria-label="Sort devices"
          >
            <option value="name">Sort: Name</option>
            <option value="size">Sort: Screen size</option>
            <option value="resolution">Sort: Resolution</option>
            <option value="dpr">Sort: Pixel density</option>
            <option value="year">Sort: Release year</option>
          </select>
        </div>

        <div className="dp-picker__list" ref={listRef}>
          {flat.length === 0 && <div className="dp-picker__empty">No devices match your search.</div>}
          {groups.map((group) => (
            <div key={group.title}>
              <div className="dp-picker__group-title">{group.title}</div>
              {group.devices.map((device) => {
                runningIndex += 1;
                const idx = runningIndex;
                const isFav = favorites.includes(device.id);
                return (
                  <button
                    key={`${group.title}-${device.id}`}
                    className={`dp-devrow ${idx === highlight ? 'is-highlighted' : ''} ${
                      device.id === currentId ? 'is-current' : ''
                    }`}
                    onClick={() => props.onSelect(device.id)}
                    onMouseEnter={() => setHighlight(idx)}
                  >
                    <span className="dp-devrow__logo" aria-hidden>
                      {device.manufacturer.charAt(0)}
                    </span>
                    <span className="dp-devrow__main">
                      <span className="dp-devrow__name">{device.name}</span>
                      <span className="dp-devrow__meta">
                        {device.viewport.width}×{device.viewport.height} · {device.pixelRatio}x ·{' '}
                        {device.os} · {device.releaseYear}
                      </span>
                    </span>
                    <span
                      className={`dp-devrow__star ${isFav ? 'is-fav' : ''}`}
                      role="button"
                      tabIndex={-1}
                      aria-label={isFav ? 'Unpin favorite' : 'Pin favorite'}
                      title={isFav ? 'Unpin favorite' : 'Pin favorite'}
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onToggleFavorite(device.id);
                      }}
                    >
                      <StarIcon width={15} height={15} />
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
