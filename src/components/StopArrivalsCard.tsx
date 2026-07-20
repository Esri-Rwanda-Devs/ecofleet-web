import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { StationArrival, StopEta, TripTrackingState } from '../types';

const POLL_MS = 10_000;

const STATUS_LABELS: Record<string, string> = {
  approaching: 'Approaching',
  at_station: 'At station',
  departed: 'Departed',
};

interface StopArrivalsCardProps {
  stop: { id: string; name: string };
  tracking: TripTrackingState[];
  onClose: () => void;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return 'Arriving';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return mins === 1 ? '1 min' : `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

interface LiveArrival extends StationArrival {
  distance_meters?: number;
  live_delay_seconds?: number;
}

function mergeArrivals(
  apiArrivals: StationArrival[] | null,
  tracking: TripTrackingState[],
  stopId: string
): LiveArrival[] {
  const liveByTrip = new Map<string, { trip: TripTrackingState; eta: StopEta }>();
  for (const trip of tracking) {
    const eta = trip.stop_etas?.find((s) => s.stop_id === stopId);
    if (eta) liveByTrip.set(trip.trip_id, { trip, eta });
  }

  const merged: LiveArrival[] = [];
  const seen = new Set<string>();

  for (const arrival of apiArrivals ?? []) {
    const live = liveByTrip.get(arrival.trip_id);
    seen.add(arrival.trip_id);
    merged.push(
      live
        ? {
            ...arrival,
            eta_seconds: live.eta.remaining_duration_seconds,
            distance_meters: live.eta.remaining_distance_meters,
            live_delay_seconds: live.eta.delay_seconds,
          }
        : arrival
    );
  }

  for (const [tripId, { trip, eta }] of liveByTrip) {
    if (seen.has(tripId)) continue;
    merged.push({
      trip_id: tripId,
      plate_number: trip.vehicle_plate,
      route_name: trip.route_name,
      eta_seconds: eta.remaining_duration_seconds,
      delay_minutes: trip.is_delayed ? Math.round(trip.delay_seconds / 60) : 0,
      current_stop_sequence: trip.current_stop_index,
      status: 'approaching',
      distance_meters: eta.remaining_distance_meters,
      live_delay_seconds: eta.delay_seconds,
    });
  }

  return merged.sort((a, b) => {
    const aDeparted = a.status === 'departed' ? 1 : 0;
    const bDeparted = b.status === 'departed' ? 1 : 0;
    if (aDeparted !== bDeparted) return aDeparted - bDeparted;
    return a.eta_seconds - b.eta_seconds;
  });
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatClock(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StopArrivalsCard({ stop, tracking, onClose }: StopArrivalsCardProps) {
  const [arrivals, setArrivals] = useState<StationArrival[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const stopIdRef = useRef(stop.id);

  useEffect(() => {
    stopIdRef.current = stop.id;
    setArrivals(null);
    setError(null);
    setUpdatedAt(null);

    let cancelled = false;
    const fetchArrivals = async () => {
      const requestedId = stop.id;
      try {
        const data = await api.getStationArrivals(requestedId);
        if (cancelled || stopIdRef.current !== requestedId) return;
        setArrivals(data);
        setError(null);
        setUpdatedAt(new Date());
      } catch (err) {
        if (cancelled || stopIdRef.current !== requestedId) return;
        setError(err instanceof Error ? err.message : 'Failed to load arrivals');
      }
    };

    fetchArrivals();
    const interval = setInterval(fetchArrivals, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stop.id]);

  const sorted = mergeArrivals(arrivals, tracking, stop.id);
  const loading = arrivals === null && sorted.length === 0;

  return (
    <div
      className="absolute bottom-5 left-5 z-20 w-[340px] max-w-[calc(100%-2.5rem)] animate-sheet-in sheet rounded-sheet p-4 max-md:inset-x-3 max-md:bottom-[calc(46vh+1.25rem)] max-md:w-auto md:left-[calc(380px+1.25rem)]"
      role="dialog"
      aria-label={`Arrivals at ${stop.name}`}
    >
      <div className="mb-3.5 flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.07em] text-muted">
            Arrivals
          </p>
          <h3 className="mt-0.5 text-[1.125rem] font-bold tracking-tight text-ink">{stop.name}</h3>
        </div>
        <button
          className="pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-bg text-muted hover:bg-line/80 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={onClose}
          aria-label="Close stop details"
        >
          ×
        </button>
      </div>

      {loading ? (
        error ? (
          <p className="py-1 text-body text-danger">{error}</p>
        ) : (
          <p className="py-1 text-body text-muted">Loading arrivals…</p>
        )
      ) : (
        <>
          {sorted.length === 0 ? (
            <p className="py-1 text-body text-muted">No buses heading to this stop right now</p>
          ) : (
            <ul className="scrollbar-thin flex max-h-[260px] list-none flex-col gap-1.5 overflow-y-auto">
              {sorted.map((arrival) => {
                const delaySec =
                  arrival.live_delay_seconds ?? arrival.delay_minutes * 60;
                const delayMins = Math.round(Math.abs(delaySec) / 60);
                const atStation = arrival.status === 'at_station';
                const departed = arrival.status === 'departed';
                return (
                  <li
                    key={arrival.trip_id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-line/40 bg-muted-bg/60 px-3 py-2.5 transition-colors duration-200"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className="break-words text-[0.9375rem] font-bold leading-snug text-ink"
                        title={arrival.route_name}
                      >
                        {arrival.route_name}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="num text-[0.8125rem] font-semibold text-muted">
                          {arrival.plate_number}
                        </span>
                        {!departed && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                              atStation
                                ? 'bg-success-bg text-success'
                                : 'bg-primary-soft text-primary'
                            }`}
                          >
                            {STATUS_LABELS[arrival.status] ?? arrival.status}
                          </span>
                        )}
                      </span>
                      {!atStation && !departed && (
                        <span className="num break-words text-[0.75rem] leading-snug text-muted">
                          {arrival.distance_meters != null &&
                            `${formatDistance(arrival.distance_meters)} away · `}
                          arrives ~{formatClock(arrival.eta_seconds)}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span
                        className={`num whitespace-nowrap text-[1rem] ${
                          departed ? 'font-semibold text-muted' : 'font-bold text-ink'
                        }`}
                      >
                        {departed
                          ? 'Departed'
                          : atStation
                            ? 'Arrived'
                            : formatEta(arrival.eta_seconds)}
                      </span>
                      {delayMins >= 1 && (
                        <span
                          className={`num whitespace-nowrap rounded-full px-2 py-px text-[0.75rem] font-bold ${
                            delaySec > 0
                              ? 'bg-danger-bg text-danger'
                              : 'bg-st-early-bg text-st-early'
                          }`}
                        >
                          {delaySec > 0
                            ? `+${delayMins} min late`
                            : `${delayMins} min early`}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {error && updatedAt && (
            <p className="mt-2 text-[0.8125rem] font-semibold text-warning">
              Update failed — showing{' '}
              {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} data,
              retrying…
            </p>
          )}
        </>
      )}
    </div>
  );
}
