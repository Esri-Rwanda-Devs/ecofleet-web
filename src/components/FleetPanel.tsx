import { TripTrackingState } from '../types';
import { BusIcon, ClockIcon, GpsIcon, SpeedIcon } from './Icons';

interface FleetPanelProps {
  tracking: TripTrackingState[];
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function FleetPanel({ tracking, selectedTripId, onSelectTrip }: FleetPanelProps) {
  if (!tracking.length) {
    return (
      <div className="panel fleet-panel">
        <div className="panel-header">
          <h2>Live Fleet</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">
            <BusIcon size={24} />
          </div>
          <p>No active trips</p>
          <span style={{ fontSize: '0.8rem' }}>Buses will appear here when drivers start trips</span>
        </div>
      </div>
    );
  }

  return (
    <div className="panel fleet-panel">
      <div className="panel-header">
        <h2>Live Fleet</h2>
        <span className="panel-count">{tracking.length}</span>
      </div>
      <div className="fleet-list">
        {tracking.map((t) => (
          <button
            key={t.trip_id}
            className={`fleet-card ${selectedTripId === t.trip_id ? 'selected' : ''}`}
            onClick={() => onSelectTrip(t.trip_id)}
          >
            <div className="fleet-card-header">
              <span className="plate">{t.vehicle_plate}</span>
              <span className={`gps-badge ${t.gps_connected ? 'connected' : 'disconnected'}`}>
                <GpsIcon size={12} />
                {t.gps_connected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="fleet-card-body">
              <p className="route-name">{t.route_name}</p>
              <p className="driver">{t.driver_name}</p>
              <div className="metric-chips">
                <span className="metric-chip">
                  <SpeedIcon size={12} />
                  {t.speed_kmh.toFixed(0)} km/h
                </span>
                <span className="metric-chip">
                  <ClockIcon size={12} />
                  {formatDuration(t.remaining_duration_seconds)}
                </span>
                <span className="metric-chip">
                  {formatDistance(t.remaining_distance_meters)} left
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${t.completion_percentage}%` }} />
              </div>
              <p className="progress-text">{t.completion_percentage.toFixed(0)}% route complete</p>
              {t.delay_status && <p className="status delayed">{t.delay_status}</p>}
              {t.early_status && <p className="status early">{t.early_status}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
