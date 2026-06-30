import { TripTrackingState } from '../types';
import { BusIcon, ClockIcon, GpsIcon, MapPinIcon, UserIcon } from './Icons';

interface TripDetailPanelProps {
  trip: TripTrackingState | null;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatMinutes(seconds: number): string {
  if (seconds <= 0) return 'Arriving';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return mins === 1 ? '1 min' : `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function TripDetailPanel({ trip }: TripDetailPanelProps) {
  if (!trip) {
    return (
      <div className="panel detail-panel">
        <div className="panel-header">
          <h2>Trip Details</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">
            <BusIcon size={24} />
          </div>
          <p>Select a vehicle on the map</p>
          <span style={{ fontSize: '0.8rem' }}>Click a bus marker or fleet card to view details</span>
        </div>
      </div>
    );
  }

  const initials = trip.vehicle_plate.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase();

  return (
    <div className="panel detail-panel">
      <div className="vehicle-header">
        <div className="vehicle-avatar">{initials}</div>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'none', letterSpacing: 0 }}>
            {trip.vehicle_plate}
          </h2>
          <p className="subtitle">{trip.route_name}</p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-item">
          <label><UserIcon size={12} /> Driver</label>
          <span>{trip.driver_name}</span>
        </div>
        <div className="detail-item">
          <label>Speed</label>
          <span>{trip.speed_kmh.toFixed(1)} km/h</span>
        </div>
        <div className="detail-item">
          <label><MapPinIcon size={12} /> Current Stop</label>
          <span>{trip.current_stop_name || 'En route'}</span>
        </div>
        <div className="detail-item">
          <label><MapPinIcon size={12} /> Next Stop</label>
          <span>{trip.next_stop_name || 'Destination'}</span>
        </div>
        <div className="detail-item">
          <label><ClockIcon size={12} /> Destination ETA</label>
          <span>{formatMinutes(trip.remaining_duration_seconds)}</span>
        </div>
        <div className="detail-item">
          <label>Distance left</label>
          <span>{formatDistance(trip.remaining_distance_meters)}</span>
        </div>
        <div className="detail-item">
          <label><GpsIcon size={12} /> GPS</label>
          <span className={trip.gps_connected ? 'text-green' : 'text-red'}>
            {trip.gps_connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {trip.delay_status && (
        <div className="alert delayed" role="status">{trip.delay_status}</div>
      )}
      {trip.early_status && (
        <div className="alert early" role="status">{trip.early_status}</div>
      )}

      {trip.stop_etas.length > 0 && (
        <div className="stop-etas">
          <h3>Stop ETAs (live)</h3>
          <p className="stop-etas-hint">
            ETA and distance update as the bus moves along the route.
          </p>
          <ul>
            {trip.stop_etas.map((s) => (
              <li key={s.stop_id}>
                <div className="stop-eta-main">
                  <span className="stop-name">{s.stop_name}</span>
                  <span className="stop-eta">{formatMinutes(s.remaining_duration_seconds)}</span>
                </div>
                <div className="stop-eta-meta">
                  <span>{formatDistance(s.remaining_distance_meters)} remaining</span>
                  {s.leg_distance_meters != null && s.segment_speed_kmh != null && (
                    <span>
                      Leg: {formatDistance(s.leg_distance_meters)} @ {s.segment_speed_kmh.toFixed(0)} km/h
                      {' → '}
                      {formatMinutes(
                        Math.round((s.leg_distance_meters / 1000 / s.segment_speed_kmh) * 3600)
                      )}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
