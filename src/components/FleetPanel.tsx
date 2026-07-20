import { useEffect, useState } from 'react';
import { TripTrackingState } from '../types';
import { BusIcon, ClockIcon, MapPinIcon, SpeedIcon } from './Icons';
import {
  DelayChip,
  FreshnessChip,
  StatusBadge,
  tripDelayView,
  tripStatusKind,
} from './StatusChips';
import { formatRouteName, formatStopName, isPlaceholderDriver } from '../utils/display-names';
import {
  formatJourneyDistance,
  formatJourneyDuration,
  getJourneyTotals,
} from '../utils/journey-totals';

interface FleetPanelProps {
  tracking: TripTrackingState[];
  query?: string;
  /** Unfiltered fleet size (for header copy when search is active). */
  totalFleetCount?: number;
  /** When true, parent already filtered to delayed — keep Delayed tab selected. */
  delayedFilter?: boolean;
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function nextStopMeta(t: TripTrackingState): { name: string; eta: string } | null {
  const next = t.stop_etas[0];
  const name = formatStopName(next?.stop_name ?? t.next_stop_name);
  const seconds = next?.remaining_duration_seconds ?? t.remaining_duration_seconds;
  if (!name) return null;
  return { name, eta: formatDuration(seconds) };
}

function fleetLiveMetrics(t: TripTrackingState): {
  speedKmh: number;
  journeyDistanceMeters: number;
  journeyDurationSeconds: number;
} {
  const journey = getJourneyTotals(t);
  return {
    speedKmh: t.speed_kmh,
    journeyDistanceMeters: journey.distanceMeters,
    journeyDurationSeconds: journey.durationSeconds,
  };
}

const FILTER_BTN =
  'num pressable rounded-full px-3 py-1.5 text-[0.875rem] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function FleetPanel({
  tracking,
  query,
  totalFleetCount,
  delayedFilter = false,
  selectedTripId,
  onSelectTrip,
}: FleetPanelProps) {
  const [filter, setFilter] = useState<'all' | 'delayed'>('all');

  useEffect(() => {
    setFilter(delayedFilter ? 'delayed' : 'all');
  }, [delayedFilter]);

  const q = (query ?? '').trim().toLowerCase();
  // Parent already filters by stop search / header stats — only apply All/Delayed here
  // when the delayed filter is local (not driven by the header).
  const delayedCount = tracking.filter((t) => t.is_delayed).length;
  const list =
    delayedFilter || filter === 'all'
      ? tracking
      : tracking.filter((t) => t.is_delayed);
  const fleetTotal = totalFleetCount ?? tracking.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-5 md:pt-6">
        <div className="min-w-0">
          <h2 className="text-[1.1875rem] font-bold leading-snug tracking-tight text-ink">
            Live fleet
          </h2>
          <p className="mt-0.5 text-[0.875rem] font-medium text-muted">
            {q
              ? `${tracking.length} of ${fleetTotal} ${fleetTotal === 1 ? 'vehicle' : 'vehicles'} at this stop`
              : `${fleetTotal} ${fleetTotal === 1 ? 'vehicle' : 'vehicles'} on the road`}
          </p>
        </div>
        <div
          className="inline-flex rounded-full bg-muted-bg p-0.5 shadow-inner"
          role="tablist"
          aria-label="Filter fleet"
        >
          <button
            role="tab"
            aria-selected={filter === 'all'}
            className={`${FILTER_BTN} ${
              filter === 'all' ? 'bg-white text-primary shadow-card' : 'text-muted hover:text-ink'
            }`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            role="tab"
            aria-selected={filter === 'delayed'}
            className={`${FILTER_BTN} ${
              filter === 'delayed' ? 'bg-white text-primary shadow-card' : 'text-muted hover:text-ink'
            }`}
            onClick={() => setFilter('delayed')}
          >
            Delayed{delayedCount > 0 ? ` · ${delayedCount}` : ''}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
          <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted-bg text-primary">
            <BusIcon size={24} />
          </div>
          {fleetTotal === 0 ? (
            <>
              <p className="text-[1.0625rem] font-semibold text-ink">Waiting for trips</p>
              <span className="max-w-[16rem] text-[0.9375rem] leading-relaxed text-muted">
                Active buses appear here as soon as drivers start a trip
              </span>
            </>
          ) : q && tracking.length === 0 ? (
            <>
              <p className="text-[1.0625rem] font-semibold text-ink">No buses for this stop</p>
              <span className="text-[0.9375rem] text-muted">Try another stop name</span>
            </>
          ) : (
            <>
              <p className="text-[1.0625rem] font-semibold text-ink">All clear</p>
              <span className="text-[0.9375rem] text-muted">No delayed buses right now</span>
            </>
          )}
        </div>
      ) : (
        <div className="scrollbar-thin flex min-h-0 flex-col gap-2.5 overflow-y-auto px-3 pb-4">
          {list.map((t) => {
            const route = formatRouteName(t.route_name);
            const next = nextStopMeta(t);
            const live = fleetLiveMetrics(t);
            const delay = tripDelayView(t);
            const selected = selectedTripId === t.trip_id;
            return (
              <button
                key={t.trip_id}
                className={`pressable group relative w-full overflow-hidden rounded-2xl border p-3.5 text-left
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
                  transition-[border-color,box-shadow,background-color] duration-200 ease-smooth ${
                  selected
                    ? 'border-primary/30 bg-primary-soft/80 shadow-panel'
                    : 'border-line/50 bg-white hover:border-primary/20 hover:shadow-card'
                }`}
                onClick={() => onSelectTrip(t.trip_id)}
                title={t.route_name}
              >
                <span
                  className={`absolute inset-y-3.5 left-0 w-[3px] rounded-full transition-all duration-200 ease-smooth ${
                    selected ? 'bg-primary opacity-100' : 'bg-primary opacity-0 group-hover:opacity-40'
                  }`}
                  aria-hidden="true"
                />

                <div className="flex items-start justify-between gap-2 pl-1">
                  <div className="min-w-0 flex-1">
                    <span className="num block break-words text-[1.125rem] font-bold tracking-wide text-ink">
                      {t.vehicle_plate}
                    </span>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                      <span
                        className="min-w-0 break-words text-[0.9375rem] font-medium leading-snug text-ink-soft"
                        title={route.name}
                      >
                        {route.name}
                      </span>
                      {route.code && (
                        <span className="num shrink-0 rounded-md bg-primary-soft px-1.5 py-px text-[0.75rem] font-bold text-primary">
                          {route.code}
                        </span>
                      )}
                    </div>
                  </div>
                  {selected ? (
                    <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-white">
                      Viewing
                    </span>
                  ) : (
                    <FreshnessChip connected={t.gps_connected} lastUpdated={t.last_updated} />
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-muted-bg/70 px-1.5 py-2 sm:gap-1.5 sm:px-2">
                  <div className="min-w-0 text-center">
                    <p className="break-words text-[0.6875rem] font-bold uppercase leading-tight tracking-[0.06em] text-muted">
                      Speed
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[0.8125rem] font-semibold leading-tight text-ink sm:text-[0.875rem]">
                      <SpeedIcon size={11} className="shrink-0 text-primary" />
                      <span className="num break-all">{live.speedKmh.toFixed(0)} km/h</span>
                    </p>
                  </div>
                  <div className="min-w-0 text-center">
                    <p className="break-words text-[0.6875rem] font-bold uppercase leading-tight tracking-[0.06em] text-muted">
                      Trip dist.
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[0.8125rem] font-semibold leading-tight text-ink sm:text-[0.875rem]">
                      <MapPinIcon size={11} className="shrink-0 text-primary" />
                      <span className="num break-all">
                        {formatJourneyDistance(live.journeyDistanceMeters)}
                      </span>
                    </p>
                  </div>
                  <div className="min-w-0 text-center">
                    <p className="break-words text-[0.6875rem] font-bold uppercase leading-tight tracking-[0.06em] text-muted">
                      Trip time
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[0.8125rem] font-semibold leading-tight text-ink sm:text-[0.875rem]">
                      <ClockIcon size={11} className="shrink-0 text-primary" />
                      <span className="num break-all">
                        {formatJourneyDuration(live.journeyDurationSeconds)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-between gap-3 pl-1">
                  {next ? (
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-muted">
                        Next stop
                      </p>
                      <p
                        className="mt-0.5 flex items-start gap-1.5 text-[0.9375rem] font-semibold leading-snug text-ink"
                        title={next.name}
                      >
                        <ClockIcon size={13} className="mt-0.5 shrink-0 text-primary" />
                        <span className="min-w-0 break-words">{next.name}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="break-words text-[0.9375rem] font-medium text-muted">
                      Arriving at destination
                    </p>
                  )}
                  {next && (
                    <div className="shrink-0 text-right">
                      <p className="num text-[1.25rem] font-bold leading-none text-primary">
                        {next.eta}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-1">
                  <StatusBadge kind={tripStatusKind(t)} />
                  <DelayChip view={delay} />
                </div>

                {!isPlaceholderDriver(t.driver_name) && (
                  <p className="mt-2 break-words pl-1 text-[0.8125rem] text-muted">{t.driver_name}</p>
                )}

                <div
                  className="mt-3 h-1 overflow-hidden rounded-full bg-line/70"
                  role="progressbar"
                  aria-valuenow={Math.round(t.completion_percentage)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Route completion"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700 ease-smooth"
                    style={{ width: `${Math.min(100, Math.max(0, t.completion_percentage))}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
