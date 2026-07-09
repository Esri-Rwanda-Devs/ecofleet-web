import { useState } from 'react';
import { Route, BusStop, RouteCalculation } from '../types';
import { api } from '../services/api';
import { RouteIcon } from './Icons';

interface RoutePlannerProps {
  routes: Route[];
  onRouteCalculated: (result: RouteCalculation, stops: BusStop[]) => void;
  onRouteSelect?: (route: Route) => void;
}

/**
 * The Esri solve sometimes reports travel time in the wrong unit (the route
 * service's cost-attribute metadata is misread upstream, e.g. seconds labelled
 * as minutes), producing absurd durations. If the implied speed falls outside
 * plausible bus speeds, estimate from distance at a 25 km/h city average.
 */
function plausibleDurationSeconds(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters > 0 && durationSeconds > 0) {
    const impliedKmh = distanceMeters / 1000 / (durationSeconds / 3600);
    if (impliedKmh >= 3 && impliedKmh <= 120) return durationSeconds;
  }
  return Math.round((distanceMeters / 1000 / 25) * 3600);
}

export function RoutePlanner({ routes, onRouteCalculated, onRouteSelect }: RoutePlannerProps) {
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RouteCalculation | null>(null);
  const [directions, setDirections] = useState<{ text: string; length: number; time: number }[]>([]);

  const handleLoadRoute = async () => {
    if (!selectedRouteId) return;
    setLoading(true);
    setError('');
    try {
      const { route, stops } = await api.getRoute(selectedRouteId);

      const calc = await api.calculateRoute({
        origin_longitude: route.origin_longitude,
        origin_latitude: route.origin_latitude,
        destination_longitude: route.destination_longitude,
        destination_latitude: route.destination_latitude,
        origin_name: route.origin_name,
        destination_name: route.destination_name,
        waypoints: stops.slice(1, -1).map((s) => ({
          longitude: s.longitude,
          latitude: s.latitude,
          name: s.name,
        })),
      });

      setResult(calc);
      setDirections(calc.directions);
      onRouteCalculated(calc, stops);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel route-planner">
      <div className="panel-header">
        <h2>Route Management</h2>
        <RouteIcon size={18} />
      </div>

      <div className="form-group">
        <label htmlFor="route-select">Select Route</label>
        <select
          id="route-select"
          value={selectedRouteId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedRouteId(id);
            const route = routes.find((r) => r.id === id);
            if (route && onRouteSelect) onRouteSelect(route);
          }}
        >
          <option value="">Choose a route...</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.origin_name} → {r.destination_name})
            </option>
          ))}
        </select>
      </div>

      <button className="btn primary full" onClick={handleLoadRoute} disabled={!selectedRouteId || loading}>
        {loading ? 'Calculating via ArcGIS...' : 'Generate Route'}
      </button>

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <div className="route-summary">
          <h3>Route Summary</h3>
          <div className="summary-grid">
            <div className="summary-card">
              <label>Distance</label>
              <span>{(result.summary.total_distance_meters / 1000).toFixed(2)} km</span>
            </div>
            <div className="summary-card">
              <label>Travel Time</label>
              <span>
                {Math.round(
                  plausibleDurationSeconds(
                    result.summary.total_distance_meters,
                    result.summary.total_duration_seconds
                  ) / 60
                )}{' '}
                min
              </span>
            </div>
            <div className="summary-card">
              <label>ETA</label>
              <span>
                {new Date(
                  Date.now() +
                    plausibleDurationSeconds(
                      result.summary.total_distance_meters,
                      result.summary.total_duration_seconds
                    ) *
                      1000
                ).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {result.segment_analytics.length > 0 && (
            <>
              <h3>Segment Analytics</h3>
              <table className="segment-table">
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th>Distance</th>
                    <th>Time</th>
                    <th>ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {result.segment_analytics.map((seg, i) => (
                    <tr key={i}>
                      <td>{seg.from} → {seg.to}</td>
                      <td>{(seg.distance_meters / 1000).toFixed(2)} km</td>
                      <td>
                        {Math.round(
                          plausibleDurationSeconds(seg.distance_meters, seg.duration_seconds) / 60
                        )}{' '}
                        min
                      </td>
                      <td>{new Date(seg.eta).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {directions.length > 0 && (
            <>
              <h3>Turn-by-Turn Directions</h3>
              <ol className="directions-list">
                {directions.map((d, i) => (
                  <li key={i}>
                    {d.text}
                    <span className="dir-meta">
                      {(d.length / 1000).toFixed(2)} km ·{' '}
                      {Math.round(plausibleDurationSeconds(d.length, d.time) / 60)} min
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}
