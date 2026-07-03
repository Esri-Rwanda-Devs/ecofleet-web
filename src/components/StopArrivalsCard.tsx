import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { StationArrival } from '../types';

// Backend caches arrivals for 8s; 10s polling keeps ETAs fresh without spam.
const POLL_MS = 10_000;

const STATUS_LABELS: Record<string, string> = {
  approaching: 'Approaching',
  at_station: 'At station',
  departed: 'Departed',
};

interface StopArrivalsCardProps {
  stop: { id: string; name: string };
  onClose: () => void;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return 'Arriving';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return mins === 1 ? '1 min' : `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function StopArrivalsCard({ stop, onClose }: StopArrivalsCardProps) {
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

  const sorted = arrivals ? [...arrivals].sort((a, b) => a.eta_seconds - b.eta_seconds) : [];

  return (
    <div className="stop-arrivals-card" role="dialog" aria-label={`Arrivals at ${stop.name}`}>
      <div className="stop-arrivals-header">
        <h3>{stop.name}</h3>
        <button className="stop-arrivals-close" onClick={onClose} aria-label="Close stop details">
          ×
        </button>
      </div>

      {arrivals === null ? (
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
              {sorted.map((arrival) => (
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
                      {arrival.delay_minutes > 0 && (
                        <span className="stop-arrival-delay">+{arrival.delay_minutes} min</span>
                      )}
                    </span>
                  </div>
                  <span className="stop-arrival-eta">{formatEta(arrival.eta_seconds)}</span>
                </li>
              ))}
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
