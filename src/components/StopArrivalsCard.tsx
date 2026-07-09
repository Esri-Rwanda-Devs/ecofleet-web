import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { StationArrival, StopEta, TripTrackingState } from '../types';

// Backend caches arrivals for 8s; 10s polling keeps ETAs fresh without spam.
const POLL_MS = 10_000;

const STATUS_LABELS: Record<string, string> = {
  approaching: 'Approaching',
  at_station: 'At station',
  departed: 'Departed',
};

interface StopArrivalsCardProps {
  stop: { id: string; name: string };
  /** Live fleet tracking from the dashboard poll — source of leg-based ETAs. */
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

/** A station arrival enriched with live tracking data when available. */
interface LiveArrival extends StationArrival {
  /** Live road distance from the bus to this stop, when tracked. */
  distance_meters?: number;
  /** Live delay at THIS stop (+late/−early, seconds), from the ETA engine. */
  live_delay_seconds?: number;
}

/**
 * Merge the station-board arrivals with the live tracking state. The station
 * endpoint estimates ETA as straight-line distance with a schedule floor, while
 * `stop_etas` carries the leg-based live ETA shown in the fleet timeline — when
 * a bus has a live entry for this stop, that ETA wins so both panels agree.
 */
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

  // Buses the station board missed (e.g. its 8s cache) but that are live now.
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

  return merged.sort((a, b) => a.eta_seconds - b.eta_seconds);
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
  // null = nothing loaded yet for this stop (show spinner / first-fetch error).
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
        // Discard responses that arrive after close or after switching stops.
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
  // Live tracking can render rows before the station endpoint answers.
  const loading = arrivals === null && sorted.length === 0;

  return (
    <div className="stop-arrivals-card" role="dialog" aria-label={`Arrivals at ${stop.name}`}>
      <div className="stop-arrivals-header">
        <h3>{stop.name}</h3>
        <button className="stop-arrivals-close" onClick={onClose} aria-label="Close stop details">
          ×
        </button>
      </div>

      {loading ? (
        error ? (
          <p className="stop-arrivals-error">{error}</p>
        ) : (
          <p className="stop-arrivals-loading">Loading arrivals…</p>
        )
      ) : (
        <>
          {sorted.length === 0 ? (
            <p className="stop-arrivals-empty">No buses heading to this stop right now</p>
          ) : (
            <ul className="stop-arrivals-list">
              {sorted.map((arrival) => {
                // Prefer the live per-stop delay; fall back to reported minutes.
                const delaySec =
                  arrival.live_delay_seconds ?? arrival.delay_minutes * 60;
                const delayMins = Math.round(Math.abs(delaySec) / 60);
                return (
                  <li key={arrival.trip_id} className="stop-arrival-row">
                    <div className="stop-arrival-info">
                      <span className="stop-arrival-route">{arrival.route_name}</span>
                      <span className="stop-arrival-meta">
                        <span className="stop-arrival-plate">{arrival.plate_number}</span>
                        <span
                          className={`stop-arrival-status ${
                            arrival.status === 'at_station' ? 'at-station' : ''
                          }`}
                        >
                          {STATUS_LABELS[arrival.status] ?? arrival.status}
                        </span>
                      </span>
                      <span className="stop-arrival-sub">
                        {arrival.distance_meters != null &&
                          `${formatDistance(arrival.distance_meters)} away · `}
                        arrives ~{formatClock(arrival.eta_seconds)}
                      </span>
                    </div>
                    <div className="stop-arrival-timing">
                      <span className="stop-arrival-eta">{formatEta(arrival.eta_seconds)}</span>
                      {delayMins >= 1 && (
                        <span className={`stop-eta-badge ${delaySec > 0 ? 'late' : 'early'}`}>
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
            <p className="stop-arrivals-stale">
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
