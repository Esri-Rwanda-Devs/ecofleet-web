import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
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

/** Poll cadence while the realtime socket is down. */
const POLL_MS = 5000;
/** Slow reconciliation sweep while the socket is live. */
const RECONCILE_MS = 30000;

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
  const [socketLive, setSocketLive] = useState(false);

  const selectedTrip = tracking.find((t) => t.trip_id === selectedTripId) || null;
  const delayedCount = tracking.filter((t) => t.is_delayed).length;
  const [detailStops, setDetailStops] = useState<BusStop[]>();

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

  const correctOne = useCallback(
    async (t: TripTrackingState) => {
      const stops = await stopsForRouteName(t.route_name);
      if (!stops) return t;
      let visited = visitedRef.current.get(t.trip_id);
      if (!visited) {
        visited = new Set();
        visitedRef.current.set(t.trip_id, visited);
      }
      updateVisitedStops(t, stops, visited);
      return correctTrackingForOrigin(t, stops, visited);
    },
    [stopsForRouteName]
  );

  const applyCorrections = useCallback(
    async (list: TripTrackingState[]) => {
      const corrected = await Promise.all(list.map(correctOne));
      // Drop visit history of trips that are no longer active.
      const activeIds = new Set(list.map((t) => t.trip_id));
      for (const id of [...visitedRef.current.keys()]) {
        if (!activeIds.has(id)) visitedRef.current.delete(id);
      }
      return corrected;
    },
    [correctOne]
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
  }, [applyCorrections]);

  // Realtime feed: GPS pings arrive as fleet:update the moment the driver app
  // sends them; fleet:all re-syncs the whole list on (re)connect.
  useEffect(() => {
    const socket = getSocket();

    const subscribe = () => {
      setSocketLive(true);
      socket.emit('subscribe:dispatch');
      socket.emit('subscribe:alerts');
    };
    const onDisconnect = () => setSocketLive(false);
    const onFleetAll = async (states: TripTrackingState[]) => {
      setTracking(await applyCorrections(states));
    };
    const onFleetUpdate = async (state: TripTrackingState) => {
      const corrected = await correctOne(state);
      setTracking((prev) => {
        const i = prev.findIndex((t) => t.trip_id === corrected.trip_id);
        if (i === -1) return [...prev, corrected];
        const next = prev.slice();
        next[i] = corrected;
        return next;
      });
    };
    const onAlert = (event: { channel?: string }) => {
      // Trips appearing/disappearing aren't covered by fleet:update — re-sync.
      if (event?.channel === 'trip:started' || event?.channel === 'trip:completed') {
        void refreshTracking();
      }
    };

    socket.on('connect', subscribe);
    socket.on('disconnect', onDisconnect);
    socket.on('fleet:all', onFleetAll);
    socket.on('fleet:update', onFleetUpdate);
    socket.on('alert', onAlert);
    if (socket.connected) subscribe();

    return () => {
      socket.off('connect', subscribe);
      socket.off('disconnect', onDisconnect);
      socket.off('fleet:all', onFleetAll);
      socket.off('fleet:update', onFleetUpdate);
      socket.off('alert', onAlert);
    };
  }, [applyCorrections, correctOne, refreshTracking]);

  // Polling is the fallback: a slow reconciliation sweep while the socket is
  // live, the old 5s cadence only when it drops.
  useEffect(() => {
    const interval = setInterval(refreshTracking, socketLive ? RECONCILE_MS : POLL_MS);
    return () => clearInterval(interval);
  }, [socketLive, refreshTracking]);

  // Full stop list of the selected trip's route — feeds the timeline's
  // "stops passed" section (uses the same per-route cache as corrections).
  useEffect(() => {
    let cancelled = false;
    setDetailStops(undefined);
    if (!selectedTrip?.route_name) return;
    stopsForRouteName(selectedTrip.route_name).then((stops) => {
      if (!cancelled) setDetailStops(stops);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTrip?.route_name, stopsForRouteName]);

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
        <div className="header-actions">
          <span className={`live-indicator ${socketLive ? '' : 'offline'}`} role="status">
            <span className="live-dot" />
            {socketLive ? 'Live' : 'Polling'}
          </span>
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
            <FleetPanel
              tracking={tracking}
              selectedTripId={selectedTripId}
              onSelectTrip={(tripId) =>
                setSelectedTripId((prev) => (prev === tripId ? undefined : tripId))
              }
            />
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
        {selectedTrip && (
          <TripDetailPanel
            trip={selectedTrip}
            routeStops={detailStops}
            onClose={() => setSelectedTripId(undefined)}
          />
        )}
      </div>
    </div>
  );
}
