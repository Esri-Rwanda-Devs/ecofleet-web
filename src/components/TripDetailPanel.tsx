import { useMemo, useState } from 'react';
import { BusStop, StopEta, TripTrackingState } from '../types';
import { BusIcon, CheckIcon, ChevronDownIcon, CloseIcon } from './Icons';
import {
  FreshnessChip,
  delayViewFromSeconds,
} from './StatusChips';
import { formatRouteName, formatStopName } from '../utils/display-names';

interface TripDetailPanelProps {
  trip: TripTrackingState;
  /** Full ordered stop list of the trip's route, when loaded — enables the
   *  "stops passed" section and stable stop numbering. */
  routeStops?: BusStop[];
  /** Click a stop number (or passed stop) → highlight + zoom that stop on the map. */
  onStopNumberClick?: (stop: { id: string; name: string; longitude: number; latitude: number }) => void;
  onClose: () => void;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatStopDelay(seconds: number | undefined): { label: string; tone: string } {
  if (seconds == null) return { label: '—', tone: 'text-ink' };
  const view = delayViewFromSeconds(seconds);
  const tone =
    view.tone === 'late'
      ? 'text-danger'
      : view.tone === 'early'
        ? 'text-st-early'
        : view.tone === 'stale'
          ? 'text-warning'
          : view.tone === 'ontime'
            ? 'text-success'
            : 'text-ink';
  return { label: view.tone === 'ontime' ? 'On time' : view.label, tone };
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Arriving';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** "02:44 PM" from the stop's ISO eta, falling back to now + countdown. */
function formatArrivalClock(s: StopEta): string {
  const fromIso = s.eta ? new Date(s.eta) : null;
  const date =
    fromIso && !Number.isNaN(fromIso.getTime())
      ? fromIso
      : new Date(Date.now() + s.remaining_duration_seconds * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function clockIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Uppercase micro-label used across the metric strip. */
const METRIC_LABEL = 'mb-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted';

export function TripDetailPanel({ trip, routeStops, onStopNumberClick, onClose }: TripDetailPanelProps) {
  const [showPassed, setShowPassed] = useState(false);

  const coordsById = useMemo(() => {
    const map = new Map<string, BusStop>();
    routeStops?.forEach((s) => map.set(s.id, s));
    return map;
  }, [routeStops]);

  const focusStop = (id: string, name: string) => {
    if (!onStopNumberClick) return;
    const hit = coordsById.get(id);
    if (!hit || !Number.isFinite(hit.longitude) || !Number.isFinite(hit.latitude)) return;
    onStopNumberClick({
      id: hit.id,
      name: hit.name || name,
      longitude: hit.longitude,
      latitude: hit.latitude,
    });
  };

  // Stops already behind the bus: route stops that sit before the first
  // upcoming stop in sequence and are no longer in the live ETA list.
  const passedStops = useMemo(() => {
    if (!routeStops?.length || !trip.stop_etas.length) return [];
    const upcomingIds = new Set(trip.stop_etas.map((s) => s.stop_id));
    const ordered = [...routeStops].sort((a, b) => a.sequence_order - b.sequence_order);
    const firstUpcoming = ordered.find((s) => upcomingIds.has(s.id));
    if (!firstUpcoming) return [];
    return ordered.filter(
      (s) => s.sequence_order < firstUpcoming.sequence_order && !upcomingIds.has(s.id)
    );
  }, [routeStops, trip.stop_etas]);

  // 1-based stop numbers that match the numbered labels on the map. Prefer
  // the route's own stop order; fall back to position in the live list.
  const stopNumber = useMemo(() => {
    const byId = new Map<string, number>();
    if (routeStops?.length) {
      [...routeStops]
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .forEach((s, i) => byId.set(s.id, i + 1));
    }
    return (s: StopEta, i: number) => byId.get(s.stop_id) ?? passedStops.length + i + 1;
  }, [routeStops, passedStops.length]);

  const route = formatRouteName(trip.route_name);
  const stops = trip.stop_etas;
  const nextStop = stops[0];
  const totalStops = routeStops?.length ?? passedStops.length + stops.length;
  // With no GPS the numbers below are last-known, not live — say so visually.
  const stale = !trip.gps_connected;
  const metricValue = `num break-words text-[1.125rem] font-semibold leading-tight tracking-tight ${
    stale ? 'text-muted' : 'text-ink'
  }`;

  return (
    <aside
      className="absolute z-20 flex min-h-0 flex-col sheet animate-drawer-in
        max-md:inset-0 max-md:z-[25] max-md:rounded-none
        md:inset-y-0 md:right-0 md:w-[400px] md:rounded-none md:border-b-0 md:border-r-0 md:border-t-0"
      aria-label={`Trip details — ${trip.vehicle_plate}`}
    >
      <div className="sheet-handle md:hidden" aria-hidden="true" />
      <header className="shrink-0 border-b border-line/40 px-5 pb-4 pt-3 md:pt-5">
        <div className="flex items-center gap-2.5">
          <span className="num text-[1.5rem] font-bold tracking-tight text-primary">
            {trip.vehicle_plate}
          </span>
          <FreshnessChip connected={trip.gps_connected} lastUpdated={trip.last_updated} />
          <button
            className="pressable ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-bg text-muted hover:bg-line/80 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={onClose}
            aria-label="Close trip details"
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-[0.9375rem] font-semibold tracking-wide text-ink">
          {route.name}
          {route.code && (
            <span className="num ml-1.5 rounded-md bg-primary-soft px-1.5 py-px text-[0.75rem] font-bold tracking-wide text-primary">
              {route.code}
            </span>
          )}
        </p>
      </header>

      <div className="mx-4 mt-4 grid shrink-0 grid-cols-3 gap-2">
        <div className="mint-card min-w-0 overflow-visible">
          <label className={METRIC_LABEL}>Speed</label>
          <b className={metricValue}>
            {trip.speed_kmh.toFixed(0)}{' '}
            <small className="text-[0.75rem] font-medium text-muted">km/h</small>
          </b>
        </div>
        <div className="mint-card min-w-0 overflow-visible">
          <label className={METRIC_LABEL}>Dest. ETA</label>
          <b className={metricValue}>{formatCountdown(trip.remaining_duration_seconds)}</b>
          <span className="num mt-0.5 block break-words text-[0.75rem] text-muted">
            {clockIn(trip.remaining_duration_seconds)} · {formatDistance(trip.remaining_distance_meters)}
          </span>
        </div>
        <div className="mint-card min-w-0 overflow-visible">
          <label className={METRIC_LABEL}>Next stop</label>
          <b className={metricValue}>
            {nextStop ? formatCountdown(nextStop.remaining_duration_seconds) : '—'}
          </b>
          <span
            className="mt-0.5 block break-words text-[0.75rem] leading-snug text-muted"
            title={nextStop ? formatStopName(nextStop.stop_name) : undefined}
          >
            {nextStop ? formatStopName(nextStop.stop_name) : 'Arriving'}
          </span>
        </div>
      </div>

      <div className="shrink-0 px-5 pb-1.5 pt-5 text-[0.75rem] font-semibold uppercase tracking-[0.07em] text-muted">
        Route · {totalStops} stops
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5">
        {stops.length === 0 ? (
          <p className="mt-3 text-body text-muted">
            No upcoming stops — the bus is arriving at its destination.
          </p>
        ) : (
          <ol className="relative mt-2 list-none before:absolute before:bottom-4 before:left-[11px] before:top-3 before:w-px before:bg-line/70 before:content-['']">
            {passedStops.length > 0 && (
              <li className="relative pb-5 pl-10">
                <span
                  className="absolute left-0 top-0.5 z-[1] flex h-6 w-6 items-center justify-center rounded-full border border-line bg-muted-bg text-success"
                  aria-hidden="true"
                >
                  <CheckIcon size={11} />
                </span>
                <button
                  className="pressable flex items-center gap-1.5 py-0.5 text-[0.875rem] font-semibold text-muted hover:text-ink focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  onClick={() => setShowPassed((v) => !v)}
                  aria-expanded={showPassed}
                >
                  {passedStops.length} {passedStops.length === 1 ? 'stop' : 'stops'} passed
                  <ChevronDownIcon
                    size={13}
                    className={`transition-transform duration-200 ease-smooth ${showPassed ? 'rotate-180' : ''}`}
                  />
                </button>
                {showPassed && (
                  <ul className="mt-2 list-none space-y-1">
                    {passedStops.map((s, pi) => (
                      <li key={s.id} className="text-[0.875rem] text-muted">
                        {onStopNumberClick ? (
                          <button
                            type="button"
                            className="pressable inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-muted-bg hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            onClick={() =>
                              onStopNumberClick({
                                id: s.id,
                                name: s.name,
                                longitude: s.longitude,
                                latitude: s.latitude,
                              })
                            }
                            aria-label={`Show stop ${pi + 1} on map: ${formatStopName(s.name)}`}
                          >
                            <span className="num inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-line-light text-[0.6875rem] font-bold text-ink-soft">
                              {pi + 1}
                            </span>
                            {formatStopName(s.name)}
                          </button>
                        ) : (
                          formatStopName(s.name)
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}

            <li className="relative pb-5 pl-10">
              <span
                className="absolute left-0 top-0 z-[1] flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-card"
                aria-hidden="true"
              >
                <BusIcon size={12} />
              </span>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-white">
                <span className="num text-[0.875rem] font-bold tracking-wide">
                  {trip.vehicle_plate}
                </span>
                <span className="num text-[0.8125rem] font-medium text-white/70">
                  {trip.speed_kmh.toFixed(0)} km/h
                </span>
              </div>
            </li>

            {stops.map((s, i) => {
              const isNext = i === 0;
              const isLast = i === stops.length - 1;
              const prevName = isNext
                ? 'Bus'
                : formatStopName(stops[i - 1]?.stop_name) || 'Previous stop';
              const hereName = formatStopName(s.stop_name);

              const legMeters =
                s.leg_distance_meters ?? (isNext ? s.remaining_distance_meters : undefined);
              const legSeconds =
                s.leg_duration_seconds ??
                (isNext
                  ? s.remaining_duration_seconds
                  : legMeters != null && s.segment_speed_kmh
                    ? Math.round((legMeters / 1000 / s.segment_speed_kmh) * 3600)
                    : null);
              const delay = formatStopDelay(s.delay_seconds ?? trip.delay_seconds);

              const nodeTone = isNext
                ? 'rounded-full border-primary bg-primary text-white shadow-ring-next'
                : isLast
                  ? 'rounded-lg border-accent bg-accent text-white'
                  : 'rounded-full border-accent/90 bg-accent text-white';

              const stopBtn = onStopNumberClick ? (
                <button
                  type="button"
                  className={`num absolute left-0 top-2.5 z-[1] flex h-6 w-6 items-center justify-center border text-[0.75rem] font-bold
                    pressable transition-transform duration-200 ease-smooth hover:scale-105
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${nodeTone}`}
                  onClick={() => focusStop(s.stop_id, s.stop_name)}
                  aria-label={`Show stop ${stopNumber(s, i)} on map: ${hereName}`}
                  title="Show on map"
                >
                  {stopNumber(s, i)}
                </button>
              ) : (
                <span
                  className={`num absolute left-0 top-2.5 z-[1] flex h-6 w-6 items-center justify-center border text-[0.75rem] font-bold ${nodeTone}`}
                  aria-hidden="true"
                >
                  {stopNumber(s, i)}
                </span>
              );

              return (
                <li key={s.stop_id} className="relative pb-3.5 pl-10 last:pb-0">
                  {stopBtn}
                  <div
                    className={`relative rounded-2xl px-3.5 py-3 transition-colors duration-200 ${
                      isNext
                        ? 'border border-primary/20 bg-primary-soft/40'
                        : 'border border-line/40 bg-muted-bg/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`block break-words text-[1rem] leading-snug ${
                          isNext ? 'font-bold text-primary' : 'font-semibold text-ink'
                        }`}
                      >
                        {hereName}
                      </span>
                      {legMeters != null && (
                        <span className="mt-0.5 block break-words text-[0.8125rem] leading-snug text-muted">
                          from {prevName}
                          <span className="num font-semibold text-ink-soft">
                            {' · '}
                            {formatDistance(legMeters)}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-line/40 pt-2.5">
                      <div className="min-w-0">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-muted">
                          Leg ETA
                        </p>
                        <p
                          className={`num mt-0.5 text-[0.875rem] font-semibold ${
                            isNext ? 'text-primary' : 'text-ink'
                          }`}
                        >
                          {legSeconds != null ? formatCountdown(legSeconds) : '—'}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-muted">
                          Arrival
                        </p>
                        <p className="num mt-0.5 text-[0.875rem] font-semibold text-ink">
                          {formatArrivalClock(s)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-muted">
                          Delay
                        </p>
                        <p className={`num mt-0.5 text-[0.875rem] font-semibold ${delay.tone}`}>
                          {delay.label}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
