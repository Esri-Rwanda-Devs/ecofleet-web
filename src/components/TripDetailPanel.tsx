import { useMemo, useState } from 'react';
import { BusStop, StopEta, TripTrackingState } from '../types';
import { BusIcon, CheckIcon, ChevronDownIcon, CloseIcon, GpsIcon } from './Icons';
import {
  DelayChip,
  FreshnessChip,
  StatusBadge,
  delayViewFromSeconds,
  tripDelayView,
  tripStatusKind,
} from './StatusChips';
import { formatRouteName, formatStopName, isPlaceholderDriver } from '../utils/display-names';
import {
  formatJourneyDistance,
  formatJourneyDuration,
  getJourneyTotals,
} from '../utils/journey-totals';

interface TripDetailPanelProps {
  trip: TripTrackingState;
  /** Full ordered stop list of the trip's route, when loaded — enables the
   *  "stops passed" section and stable stop numbering. */
  routeStops?: BusStop[];
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
const METRIC_LABEL = 'mb-1 block text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-muted';

export function TripDetailPanel({ trip, routeStops, onClose }: TripDetailPanelProps) {
  const [showPassed, setShowPassed] = useState(false);

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
  const journey = useMemo(() => getJourneyTotals(trip), [trip]);
  const stops = trip.stop_etas;
  const nextStop = stops[0];
  const delay = tripDelayView(trip);
  const totalStops = routeStops?.length ?? passedStops.length + stops.length;
  // With no GPS the numbers below are last-known, not live — say so visually.
  const stale = !trip.gps_connected;
  const metricValue = `num break-words text-[1.1875rem] font-semibold leading-tight tracking-tight ${
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
      <header className="shrink-0 px-5 pb-3 pt-3 md:pt-5">
        <div className="flex items-center gap-2.5">
          <span className="num text-[1.5rem] font-bold tracking-tight text-primary">
            {trip.vehicle_plate}
          </span>
          <FreshnessChip connected={trip.gps_connected} lastUpdated={trip.last_updated} />
          <button
            className="pressable ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-bg text-muted hover:bg-line hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={onClose}
            aria-label="Close trip details"
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-[0.9375rem] font-semibold uppercase tracking-wide text-ink">
          {route.name}
          {route.code && (
            <span className="num ml-1.5 rounded-md bg-muted-bg px-1.5 py-px text-[0.8125rem] font-bold normal-case tracking-wide text-primary">
              {route.code}
            </span>
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge kind={tripStatusKind(trip)} />
          <DelayChip view={delay} />
          {!isPlaceholderDriver(trip.driver_name) && (
            <span className="ml-auto text-[0.875rem] font-medium text-muted">{trip.driver_name}</span>
          )}
        </div>
        {nextStop && (
          <div className="heading-banner mt-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <BusIcon size={11} />
            </span>
            <span className="min-w-0 break-words">
              Heading to:{' '}
              <b className="text-primary">{formatStopName(nextStop.stop_name)}</b>
            </span>
          </div>
        )}
      </header>

      {stale && (
        <div className="flex shrink-0 items-center gap-2 border-b border-warning/30 bg-warning-bg px-4 py-2 text-[0.875rem] font-semibold text-[#92400E]">
          <GpsIcon size={12} className="shrink-0" />
          Signal lost — showing last known data
        </div>
      )}

      {/* Metric strip — mint tiles like the driver app */}
      <div className="mx-4 grid shrink-0 grid-cols-3 gap-2">
        <div className="mint-card min-w-0 overflow-visible">
          <label className={METRIC_LABEL}>Speed</label>
          <b className={metricValue}>
            {trip.speed_kmh.toFixed(0)}{' '}
            <small className="text-[0.8125rem] font-medium text-muted">km/h</small>
          </b>
        </div>
        <div className="mint-card min-w-0 overflow-visible">
          <label className={METRIC_LABEL}>Dest. ETA</label>
          <b className={metricValue}>{formatCountdown(trip.remaining_duration_seconds)}</b>
          <span className="num mt-0.5 block break-words text-[0.8125rem] text-muted">
            {clockIn(trip.remaining_duration_seconds)}
          </span>
          <span className="num mt-0.5 block break-words text-[0.8125rem] font-semibold text-ink">
            {formatDistance(trip.remaining_distance_meters)}
          </span>
        </div>
        <div className="mint-card min-w-0 overflow-visible">
          <label className={METRIC_LABEL}>Next stop</label>
          <b className={metricValue}>
            {nextStop ? formatCountdown(nextStop.remaining_duration_seconds) : '—'}
          </b>
          <span
            className="mt-0.5 block break-words text-[0.8125rem] leading-snug text-muted"
            title={nextStop ? formatStopName(nextStop.stop_name) : undefined}
          >
            {nextStop ? formatStopName(nextStop.stop_name) : 'Arriving'}
          </span>
        </div>
      </div>

      <div className="shrink-0 px-5 py-4">
        <div className="mb-2 flex items-center justify-between gap-2 text-[0.875rem] font-medium text-muted">
          <span>Full journey</span>
          <span>
            <b className="num font-semibold text-ink">
              {formatJourneyDistance(journey.distanceMeters)}
            </b>
            {' · '}
            <b className="num font-semibold text-ink">
              {formatJourneyDuration(journey.durationSeconds)}
            </b>
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={Math.round(trip.completion_percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Route completion"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${trip.completion_percentage}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between gap-2 text-[0.875rem] font-medium text-muted">
          <span>
            <b className="num font-semibold text-ink">{trip.completion_percentage.toFixed(0)}%</b>{' '}
            complete
          </span>
          <span>
            <b className="num font-semibold text-ink">
              {formatDistance(trip.remaining_distance_meters)}
            </b>{' '}
            remaining
          </span>
        </div>
      </div>

      <div className="shrink-0 px-5 pb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-muted">
        Route · {totalStops} stops
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5">
        {stops.length === 0 ? (
          <p className="mt-3 text-body text-muted">
            No upcoming stops — the bus is arriving at its destination.
          </p>
        ) : (
          <ol className="relative mt-4 list-none before:absolute before:bottom-3.5 before:left-[10px] before:top-2.5 before:w-0.5 before:bg-line before:content-['']">
            {passedStops.length > 0 && (
              <li className="relative pb-4 pl-9">
                <span
                  className="absolute left-0 top-0 z-[1] flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-line-light bg-muted-bg text-success"
                  aria-hidden="true"
                >
                  <CheckIcon size={11} />
                </span>
                <button
                  className="pressable flex items-center gap-1.5 py-0.5 text-[0.9375rem] font-semibold text-muted hover:text-ink focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  onClick={() => setShowPassed((v) => !v)}
                  aria-expanded={showPassed}
                >
                  {passedStops.length} {passedStops.length === 1 ? 'stop' : 'stops'} passed
                  <ChevronDownIcon
                    size={13}
                    className={`transition-transform duration-200 ${showPassed ? 'rotate-180' : ''}`}
                  />
                </button>
                {showPassed && (
                  <ul className="mt-1.5 list-none">
                    {passedStops.map((s) => (
                      <li key={s.id} className="py-0.5 text-[0.9375rem] text-muted">
                        {formatStopName(s.name)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}

            <li className="relative pb-4 pl-9">
              <span
                className="absolute -left-0.5 top-0 z-[1] flex h-[26px] w-[26px] items-center justify-center rounded-full bg-primary text-white shadow-card"
                aria-hidden="true"
              >
                <BusIcon size={13} />
              </span>
              <div className="inline-flex items-center gap-2.5 rounded-full bg-primary px-3.5 py-1.5 text-white">
                <span className="num text-[0.9375rem] font-bold tracking-wide">
                  {trip.vehicle_plate}
                </span>
                <span className="num text-[0.875rem] font-semibold text-white/70">
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

              // Next stop = teal (mobile active); later stops = orange (mobile upcoming).
              const nodeTone = isNext
                ? 'rounded-full border-primary bg-primary text-white shadow-ring-next'
                : isLast
                  ? 'rounded-[7px] border-accent bg-accent text-white'
                  : 'rounded-full border-accent bg-accent text-white';

              return (
                <li key={s.stop_id} className="relative pb-4 pl-9 last:pb-0">
                  <div
                    className={`relative rounded-2xl border px-3 py-2.5 ${
                      isNext ? 'border-primary/25 bg-muted-bg' : 'border-line bg-white'
                    }`}
                  >
                    <span
                      className={`num absolute -left-9 top-2.5 z-[1] flex h-6 w-6 items-center justify-center border-2 text-[0.75rem] font-bold ${nodeTone}`}
                      aria-hidden="true"
                    >
                      {stopNumber(s, i)}
                    </span>

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={`block break-words text-[1.0625rem] leading-snug ${
                            isNext ? 'font-bold text-primary' : 'font-medium text-ink'
                          }`}
                        >
                          {hereName}
                        </span>
                        <span className="mt-0.5 block break-words text-[0.8125rem] leading-snug text-muted">
                          {prevName} → {hereName}
                          {legMeters != null && (
                            <span className="num font-semibold text-ink">
                              {' · '}
                              {formatDistance(legMeters)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Travel time uses stop names; arrival clock separate */}
                    <div className="mt-2 space-y-1.5 border-t border-line/80 pt-2">
                      <div className="flex items-start justify-between gap-3 text-[0.875rem]">
                        <span className="min-w-0 flex-1 break-words leading-snug text-muted">
                          Travel time {prevName} to {hereName}
                        </span>
                        <span
                          className={`num shrink-0 pt-0.5 font-semibold ${
                            isNext ? 'text-primary' : 'text-ink'
                          }`}
                        >
                          {legSeconds != null ? formatCountdown(legSeconds) : '—'}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3 text-[0.875rem]">
                        <span className="min-w-0 break-words text-muted">Arrival time</span>
                        <span className="num shrink-0 font-semibold text-ink">
                          {formatArrivalClock(s)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3 text-[0.875rem]">
                        <span className="min-w-0 break-words text-muted">Delay</span>
                        <span className={`num shrink-0 font-semibold ${delay.tone}`}>
                          {delay.label}
                        </span>
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
