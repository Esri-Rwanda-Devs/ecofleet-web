import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, CloseIcon, RouteIcon, SearchIcon } from './Icons';
import { formatRouteName } from '../utils/display-names';
import { routeColorAt } from '../utils/route-colors';
import type { Route } from '../types';

interface RouteFilterProps {
  routes: Route[];
  /** Route ids currently pinned to the map. Empty = show everything. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Live bus count per route name, for the "3 live" hint on each row. */
  liveCountByRouteName?: Map<string, number>;
  className?: string;
}

/**
 * Route picker for the operations map.
 *
 * Multi-select on purpose: an operator comparing Kimironko→CBD against its
 * return leg needs both lines on the map at once. An empty selection means "no
 * filter" rather than "nothing" — the map falls back to following the live
 * fleet, which is the dashboard's resting state.
 */
export function RouteFilter({
  routes,
  selectedIds,
  onChange,
  liveCountByRouteName,
  className = '',
}: RouteFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Colour comes from the route's index in the full sorted list, so pinning a
  // second route never recolours the first.
  const ordered = useMemo(
    () =>
      routes
        .map((route, index) => ({
          route,
          color: routeColorAt(index),
          label: formatRouteName(route.name),
        }))
        .sort((a, b) => a.label.name.localeCompare(b.label.name)),
    [routes]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      ({ route, label }) =>
        label.name.toLowerCase().includes(q) ||
        (label.code ?? '').toLowerCase().includes(q) ||
        route.name.toLowerCase().includes(q)
    );
  }, [ordered, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setQuery('');
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const count = selectedIds.length;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        title="Filter routes shown on the map"
        className={`pressable flex h-10 items-center gap-2 rounded-2xl border px-3 text-[0.9375rem] font-semibold transition-colors duration-200 ease-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          count > 0
            ? 'border-primary/30 bg-primary-soft text-primary'
            : 'border-line/50 bg-muted-bg/60 text-ink hover:bg-muted-bg'
        }`}
      >
        <RouteIcon size={16} className="shrink-0" />
        <span className="hidden sm:inline">Routes</span>
        {count > 0 && (
          <span className="num rounded-full bg-primary px-1.5 py-0.5 text-[0.6875rem] font-bold leading-none text-white">
            {count}
          </span>
        )}
        <ChevronDownIcon
          size={13}
          className={`shrink-0 transition-transform duration-200 ease-smooth ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {count > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          title="Clear route filter"
          aria-label="Clear route filter"
          className="pressable absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line/50 bg-surface text-muted shadow-card hover:text-ink"
        >
          <CloseIcon size={11} />
        </button>
      )}

      {open && (
        <div
          className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line/50 bg-surface shadow-pop animate-sheet-in"
          role="dialog"
          aria-label="Filter routes"
        >
          <div className="border-b border-line/40 p-2.5">
            <label className="relative flex items-center rounded-xl border border-line/50 bg-muted-bg/60 focus-within:border-primary/30 focus-within:bg-surface">
              <SearchIcon
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="Search routes"
                aria-label="Search routes"
                className="h-9 w-full rounded-xl bg-transparent pl-8 pr-3 text-[0.875rem] font-medium text-ink placeholder:text-muted focus:outline-none"
              />
            </label>
          </div>

          <div className="max-h-[min(22rem,50vh)] overflow-y-auto py-1">
            {visible.length === 0 && (
              <p className="px-3.5 py-6 text-center text-[0.8125rem] font-medium text-muted">
                No routes match “{query.trim()}”.
              </p>
            )}

            {visible.map(({ route, color, label }) => {
              const isOn = selected.has(route.id);
              const live = liveCountByRouteName?.get(route.name) ?? 0;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => toggle(route.id)}
                  aria-pressed={isOn}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 ${
                    isOn ? 'bg-primary-soft/60' : 'hover:bg-muted-bg'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 ${
                      isOn ? 'border-primary bg-primary text-white' : 'border-line bg-surface'
                    }`}
                    aria-hidden="true"
                  >
                    {isOn && <CheckIcon size={11} />}
                  </span>

                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/70"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-semibold text-ink">
                      {label.name || route.name}
                    </span>
                    {label.code && (
                      <span className="num block text-[0.6875rem] font-semibold text-muted">
                        {label.code}
                      </span>
                    )}
                  </span>

                  {live > 0 && (
                    <span className="num shrink-0 rounded-full bg-success-bg px-1.5 py-0.5 text-[0.6875rem] font-bold text-success">
                      {live} live
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line/40 px-2.5 py-2">
            <span className="num text-[0.75rem] font-semibold text-muted">
              {count > 0 ? `${count} of ${routes.length} pinned` : `${routes.length} routes`}
            </span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChange(visible.map(({ route }) => route.id))}
                disabled={visible.length === 0}
                className="pressable rounded-lg px-2.5 py-1.5 text-[0.75rem] font-bold text-ink hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={count === 0}
                className="pressable rounded-lg px-2.5 py-1.5 text-[0.75rem] font-bold text-muted hover:bg-muted-bg hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
