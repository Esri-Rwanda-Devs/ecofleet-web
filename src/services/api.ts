import type {
  ArcGisConfig,
  FleetOverview,
  Route,
  BusStop,
  RouteCalculation,
  StationArrival,
  TripTrackingState,
} from '../types';

/** Always call the Nest backend — never the UI origin. */
const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://esrirw.rw:8000'
).replace(/\/$/, '');

class ApiClient {
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.detail || 'Request failed');
    }

    return res.json();
  }

  getArcGisConfig() {
    return this.request<ArcGisConfig>('/api/config');
  }

  getWebMap() {
    return this.request<{
      fallback: boolean;
      basemapId?: string;
      reason?: string;
    }>('/api/arcgis/webmap');
  }

  getRoutes() {
    return this.request<{ routes: Route[] }>('/api/routes');
  }

  getRoute(id: string) {
    return this.request<{ route: Route; stops: BusStop[] }>(`/api/routes/${id}`);
  }

  calculateRoute(data: {
    origin_longitude: number;
    origin_latitude: number;
    destination_longitude: number;
    destination_latitude: number;
    origin_name?: string;
    destination_name?: string;
    waypoints?: { longitude: number; latitude: number; name?: string }[];
  }) {
    return this.request<RouteCalculation>('/api/routes/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getFleetOverview() {
    return this.request<FleetOverview>('/trip/fleet/overview');
  }

  getActiveTracking() {
    return this.request<{ tracking: TripTrackingState[] }>('/api/trips/active/tracking');
  }

  getTrips() {
    return this.request<{ trips: unknown[] }>('/api/trips');
  }

  getVehicles() {
    return this.request<{ vehicles: unknown[] }>('/api/vehicles');
  }

  getStationArrivals(stopId: string) {
    return this.request<StationArrival[]>(`/tracking/station/${stopId}/arrivals`).then(
      (payload) => (Array.isArray(payload) ? payload : [])
    );
  }
}

export const api = new ApiClient();
