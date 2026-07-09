import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import {
  correctTrackingForOrigin,
  updateVisitedStops,
} from '../utils/tracking-corrections';
import { OperationsMap } from '../components/OperationsMap';
import { FleetPanel } from '../components/FleetPanel';
import { TripDetailPanel } from '../components/TripDetailPanel';
import { RoutePlanner } from '../components/RoutePlanner';
import { StopArrivalsCard } from '../components/StopArrivalsCard';
import { BusIcon, FleetIcon, RouteIcon } from '../components/Icons';
import { isSparseRoutePolyline, parseRoutePolyline } from '../utils/route-geometry';
import { ArcGisConfig, BusStop, Route, RouteCalculation, TripTrackingState } from '../types';

const POLL_MS = 5000;

async function loadRouteForMap(route: Route): Promise<{ polyline?: number[][]; stops: BusStop[] }> {
  const { route: detail, stops } = await api.getRoute(route.id);

  const storedPolyline = parseRoutePolyline(
    detail.route_polyline as Parameters<typeof parseRoutePolyline>[0]
  );
  const stopFallback = stops.map((s) => [s.longitude, s.latitude]);

  const routeRequest = {
    origin_longitude: detail.origin_longitude,
    origin_latitude: detail.origin_latitude,
    destination_longitude: detail.destination_longitude,
    destination_latitude: detail.destination_latitude,
    waypoints: stops.slice(1, -1).map((s) => ({
      longitude: s.longitude,
      latitude: s.latitude,
      name: s.name,
    })),
  };

  // Prefer ArcGIS road geometry — stored polylines are often only stop coordinates.
  if (!storedPolyline || isSparseRoutePolyline(storedPolyline, stops.length)) {
    try {
      const calc = await api.calculateRoute(routeRequest);
      const roadPolyline = parseRoutePolyline(calc.polyline);
      if (roadPolyline && roadPolyline.length >= 2) {
        return { polyline: roadPolyline, stops };
      }
    } catch {
      /* fall through to stored / stop vertices */
    }
  }

  const polyline =
    storedPolyline && storedPolyline.length >= 2 ? storedPolyline : stopFallback;

  return { polyline, stops };
}

export function DashboardPage() {
  const [config, setConfig] = useState<ArcGisConfig | null>(null);
  const [tracking, setTracking] = useState<TripTrackingState[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeDisplay, setRouteDisplay] = useState<{ polyline?: number[][]; stops?: BusStop[] }>();
  const [activeTab, setActiveTab] = useState<'fleet' | 'routes'>('fleet');
  const [selectedStop, setSelectedStop] = useState<{ id: string; name: string } | null>(null);

  const selectedTrip = tracking.find((t) => t.trip_id === selectedTripId) || null;
  const delayedCount = tracking.filter((t) => t.is_delayed).length;

  // Client-side arrival truth (mirrors the mobile app): stops each bus has
  // genuinely been near, plus cached stop lists per route name.
  const routesRef = useRef<Route[]>([]);
  const routeStopsRef = useRef<Map<string, BusStop[]>>(new Map());
  const visitedRef = useRef<Map<string, Set<string>>>(new Map());

  const stopsForRouteName = useCallback(async (routeName: string) => {
    const cached = routeStopsRef.current.get(routeName);
    if (cached) return cached;
    const route = routesRef.current.find((r) => r.name === routeName);
    if (!route) return undefined;
    try {
      const { stops } = await api.getRoute(route.id);
      routeStopsRef.current.set(routeName, stops);
      return stops;
    } catch {
      return undefined;
    }
  }, []);

  const applyCorrections = useCallback(
    async (list: TripTrackingState[]) => {
      const activeIds = new Set<string>();
      const corrected = await Promise.all(
        list.map(async (t) => {
          activeIds.add(t.trip_id);
          const stops = await stopsForRouteName(t.route_name);
          if (!stops) return t;
          let visited = visitedRef.current.get(t.trip_id);
          if (!visited) {
            visited = new Set();
            visitedRef.current.set(t.trip_id, visited);
          }
          updateVisitedStops(t, stops, visited);
          return correctTrackingForOrigin(t, stops, visited);
        })
      );
      // Drop visit history of trips that are no longer active.
      for (const id of [...visitedRef.current.keys()]) {
        if (!activeIds.has(id)) visitedRef.current.delete(id);
      }
      return corrected;
    },
    [stopsForRouteName]
  );

  const refreshTracking = useCallback(async () => {
    try {
      const data = await api.getActiveTracking();
      setTracking(await applyCorrections(data.tracking));
    } catch {
      /* backend may be starting */
    }
  }, [applyCorrections]);

  useEffect(() => {
    Promise.all([api.getArcGisConfig(), api.getActiveTracking(), api.getRoutes()])
      .then(async ([arcgisConfig, trackingData, routesData]) => {
        setConfig(arcgisConfig);
        routesRef.current = routesData.routes;
        setRoutes(routesData.routes);
        setTracking(await applyCorrections(trackingData.tracking));

        if (routesData.routes.length > 0) {
          const display = await loadRouteForMap(routesData.routes[0]);
          setRouteDisplay(display);
        }
      })
      .catch(console.error);

    const interval = setInterval(refreshTracking, POLL_MS);
    return () => clearInterval(interval);
  }, [refreshTracking, applyCorrections]);

  const handleRouteCalculated = (result: RouteCalculation, stops: BusStop[]) => {
    const polyline = parseRoutePolyline(result.polyline) ?? undefined;
    setSelectedStop(null);
    setRouteDisplay({ polyline, stops });
  };

  if (!config) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">
            <BusIcon size={22} />
          </div>
          <div>
            <h1>BTS Operations</h1>
            <span>Bus Transport Services · Kigali, Rwanda</span>
          </div>
        </div>
      </header>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon teal">
            <FleetIcon size={18} />
          </div>
          <div>
            <div className="stat-value">{tracking.length}</div>
            <div className="stat-label">Active Buses</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <RouteIcon size={18} />
          </div>
          <div>
            <div className="stat-value">{routes.length}</div>
            <div className="stat-label">Routes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal">
            <span style={{ fontSize: '1rem', fontWeight: 800 }}>!</span>
          </div>
          <div>
            <div className="stat-value">{delayedCount}</div>
            <div className="stat-label">Delayed Buses</div>
          </div>
        </div>
      </div>

      <div className="tab-bar">
        <button
          className={`tab ${activeTab === 'fleet' ? 'active' : ''}`}
          onClick={() => setActiveTab('fleet')}
        >
          <FleetIcon size={16} />
          Live Fleet
        </button>
        <button
          className={`tab ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          <RouteIcon size={16} />
          Route Management
        </button>
      </div>

      <div className="dashboard-body">
        <aside className="sidebar">
          {activeTab === 'fleet' ? (
            <>
              <FleetPanel
                tracking={tracking}
                selectedTripId={selectedTripId}
                onSelectTrip={setSelectedTripId}
              />
              <TripDetailPanel trip={selectedTrip} />
            </>
          ) : (
            <RoutePlanner
              routes={routes}
              onRouteCalculated={handleRouteCalculated}
              onRouteSelect={async (route) => {
                setSelectedStop(null);
                const display = await loadRouteForMap(route);
                setRouteDisplay(display);
              }}
            />
          )}
        </aside>
        <main className="map-area">
          <OperationsMap
            config={config}
            tracking={tracking}
            selectedRoute={routeDisplay}
            onVehicleClick={setSelectedTripId}
            onStopClick={setSelectedStop}
            highlightStopId={selectedStop?.id ?? null}
          />
          {selectedStop && (
            <StopArrivalsCard
              stop={selectedStop}
              tracking={tracking}
              onClose={() => setSelectedStop(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
