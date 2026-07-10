import { useMemo, useState } from 'react';
import { BusStop, StopEta, TripTrackingState } from '../types';
import {
  BusIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  GpsIcon,
} from './Icons';

interface TripDetailPanelProps {
  trip: TripTrackingState;
  /** Full ordered stop list of the trip's route, when loaded — enables the
   *  "stops passed" section above the live bus marker. */
  routeStops?: BusStop[];
  onClose: () => void;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Arriving';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** "~02:44 PM" from the stop's ISO eta, falling back to now + countdown. */
function formatArrivalClock(s: StopEta): string {
  const fromIso = s.eta ? new Date(s.eta) : null;
  const date =
    fromIso && !Number.isNaN(fromIso.getTime())
      ? fromIso
      : new Date(Date.now() + s.remaining_duration_seconds * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** "+3 min" / "−2 min", or null when within a minute of plan. */
function formatDelay(seconds: number | undefined): { label: string; late: boolean } | null {
  if (seconds == null) return null;
  const mins = Math.round(Math.abs(seconds) / 60);
  if (mins < 1) return null;
  return seconds > 0
    ? { label: `+${mins} min`, late: true }
    : { label: `−${mins} min`, late: false };
}

type StatusTone = 'late' | 'early' | 'ontime' | 'deadhead';

function tripStatus(trip: TripTrackingState): { tone: StatusTone; text: string } {
  if (trip.in_service === false) {
    return {
      tone: 'deadhead',
      text: `Heading to start — service begins at ${trip.next_stop_name || 'the origin stop'}`,
    };
  }
  if (trip.delay_status) return { tone: 'late', text: `Running ${trip.delay_status}` };
  if (trip.early_status) return { tone: 'early', text: `Running ${trip.early_status}` };
  return { tone: 'ontime', text: 'On time' };
}

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

  const status = tripStatus(trip);
  const stops = trip.stop_etas;

  return (
    <aside className="detail-drawer" aria-label={`Trip details — ${trip.vehicle_plate}`}>
      <header className="drawer-header">
        <div className="drawer-heading">
          <div className="drawer-title">
            <span className="plate">{trip.vehicle_plate}</span>
            <span className={`gps-badge ${trip.gps_connected ? 'connected' : 'disconnected'}`}>
              <GpsIcon size={12} />
              {trip.gps_connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <p className="drawer-route">{trip.route_name}</p>
          <p className="drawer-driver">Driver · {trip.driver_name}</p>
        </div>
        <button className="drawer-close" onClick={onClose} aria-label="Close trip details">
          <CloseIcon size={16} />
        </button>
      </header>

      <div className="drawer-scroll">
        <div className={`trip-status-banner ${status.tone}`} role="status">
          {status.text}
        </div>

        <div className="drawer-stats">
          <div className="drawer-stat">
            <label>Speed</label>
            <span>{trip.speed_kmh.toFixed(0)} km/h</span>
          </div>
          <div className="drawer-stat">
            <label>Dest. ETA</label>
            <span>{formatCountdown(trip.remaining_duration_seconds)}</span>
          </div>
          <div className="drawer-stat">
            <label>Left</label>
            <span>{formatDistance(trip.remaining_distance_meters)}</span>
          </div>
        </div>

        <div className="drawer-progress">
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={Math.round(trip.completion_percentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Route completion"
          >
            <div className="progress-fill" style={{ width: `${trip.completion_percentage}%` }} />
          </div>
          <p className="progress-text">{trip.completion_percentage.toFixed(0)}% of route completed</p>
        </div>

        <section className="timeline" aria-label="Stop timeline">
          <h3>Route timeline</h3>

          {stops.length === 0 ? (
            <p className="timeline-empty">No upcoming stops — the bus is arriving at its destination.</p>
          ) : (
            <ol className="tl">
              {passedStops.length > 0 && (
                <li className="tl-passed">
                  <span className="tl-node passed" aria-hidden="true">
                    <CheckIcon size={11} />
                  </span>
                  <button
                    className="tl-passed-toggle"
                    onClick={() => setShowPassed((v) => !v)}
                    aria-expanded={showPassed}
                  >
                    {passedStops.length} {passedStops.length === 1 ? 'stop' : 'stops'} passed
                    <ChevronDownIcon size={13} className={showPassed ? 'flip' : ''} />
                  </button>
                  {showPassed && (
                    <ul className="tl-passed-list">
                      {passedStops.map((s) => (
                        <li key={s.id}>{s.name}</li>
                      ))}
                    </ul>
                  )}
                </li>
              )}

              <li className="tl-bus">
                <span className="tl-node bus" aria-hidden="true">
                  <BusIcon size={13} />
                </span>
                <div className="tl-bus-chip">
                  <span className="tl-bus-plate">{trip.vehicle_plate}</span>
                  <span className="tl-bus-speed">{trip.speed_kmh.toFixed(0)} km/h</span>
                </div>
              </li>

              {stops.map((s, i) => {
                const isNext = i === 0;
                const isLast = i === stops.length - 1;
                const legMeters = s.leg_distance_meters;
                const legSeconds =
                  s.leg_duration_seconds ??
                  (legMeters != null && s.segment_speed_kmh
                    ? Math.round((legMeters / 1000 / s.segment_speed_kmh) * 3600)
                    : null);
                const legFrom = isNext ? 'from bus' : `from ${stops[i - 1].stop_name}`;
                const delay = formatDelay(s.delay_seconds);
                return (
                  <li
                    key={s.stop_id}
                    className={`tl-stop ${isNext ? 'next' : ''} ${isLast ? 'terminus' : ''}`}
                  >
                    {legMeters != null && legSeconds != null && (
                      <span className="tl-leg">
                        {formatDistance(legMeters)} · {formatCountdown(legSeconds)}{' '}
                        <em>{legFrom}</em>
                      </span>
                    )}
                    <div className="tl-row">
                      <span className="tl-node" aria-hidden="true" />
                      <div className="tl-info">
                        <span className="tl-name">{s.stop_name}</span>
                        <span className="tl-sub">
                          {formatDistance(s.remaining_distance_meters)} from bus
                        </span>
                      </div>
                      <div className="tl-timing">
                        <span className="tl-eta">{formatCountdown(s.remaining_duration_seconds)}</span>
                        <span className="tl-clock">
                          ~{formatArrivalClock(s)}
                          {delay && (
                            <span className={`tl-delay ${delay.late ? 'late' : 'early'}`}>
                              {' '}
                              {delay.label}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </aside>
  );
}
