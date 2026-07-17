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
import { StopArrivalsCard } from '../components/StopArrivalsCard';
import { AlertsFeed, AlertEvent } from '../components/AlertsFeed';
import {
  BusIcon,
  SearchIcon,
} from '../components/Icons';
import { formatRouteName } from '../utils/display-names';
import { isSparseRoutePolyline, parseRoutePolyline } from '../utils/route-geometry';
import { ArcGisConfig, BusStop, FleetOverview, Route, TripTrackingState } from '../types';

/** Poll cadence while the realtime socket is down. */
const POLL_MS = 5000;
/** Slow reconciliation sweep while the socket is live. */
const RECONCILE_MS = 30000;
/** Fleet overview refresh (server caches it for 15s). */
const OVERVIEW_MS = 30000;

/** Live wall clock for the top bar — one quiet line. */
function ClockNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="num whitespace-nowrap text-[0.9375rem] font-semibold text-ink">
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

function StatItem({
  label,
  value,
  tone = 'neutral',
  className = '',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'danger' | 'success';
  className?: string;
}) {
  const valueCls =
    tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-ink';
  return (
    <div className={`stat-strip__item ${className}`}>
      <b className={`num text-[1.125rem] font-bold leading-none ${valueCls}`}>{value}</b>
      <span className="text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </span>
    </div>
  );
}

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
  const [overview, setOverview] = useState<FleetOverview | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string>();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeDisplay, setRouteDisplay] = useState<{ polyline?: number[][]; stops?: BusStop[] }>();
  const [selectedStop, setSelectedStop] = useState<{ id: string; name: string } | null>(null);
  const [socketLive, setSocketLive] = useState(false);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const alertIdRef = useRef(0);

  const selectedTrip = tracking.find((t) => t.trip_id === selectedTripId) || null;
  const delayedCount = tracking.filter((t) => t.is_delayed).length;
  const [detailStops, setDetailStops] = useState<BusStop[]>();

  // Client-side arrival truth (mirrors the mobile app): stops each bus has
  // genuinely been near, plus cached stop lists per route name.
  const routesRef = useRef<Route[]>([]);
  // Mirror of the live list for alert-label resolution outside React's flow.
  const trackingRef = useRef<TripTrackingState[]>([]);
  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);
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

  const refreshOverview = useCallback(async () => {
    try {
      setOverview(await api.getFleetOverview());
    } catch {
      /* endpoint optional — KPIs degrade gracefully */
    }
  }, []);

  useEffect(() => {
    Promise.all([api.getArcGisConfig(), api.getActiveTracking(), api.getRoutes()])
      .then(async ([arcgisConfig, trackingData, routesData]) => {
        setConfig(arcgisConfig);
        routesRef.current = routesData.routes;
        setRoutes(routesData.routes);
        setTracking(await applyCorrections(trackingData.tracking));
      })
      .catch(console.error);
  }, [applyCorrections]);

  // Network-wide stats for the command bar KPIs.
  useEffect(() => {
    void refreshOverview();
    const id = setInterval(refreshOverview, OVERVIEW_MS);
    return () => clearInterval(id);
  }, [refreshOverview]);

  // The map follows the live operation: it always shows the route of the
  // selected trip, or of the first active trip when nothing is selected —
  // so a return trip's route appears the moment the driver starts it.
  const mapRouteName = selectedTrip?.route_name ?? tracking[0]?.route_name;
  const routeDisplayCacheRef = useRef<Map<string, { polyline?: number[][]; stops: BusStop[] }>>(
    new Map()
  );

  useEffect(() => {
    if (!mapRouteName) return;
    const route = routesRef.current.find((r) => r.name === mapRouteName);
    if (!route) return;

    const cached = routeDisplayCacheRef.current.get(route.id);
    if (cached) {
      setRouteDisplay(cached);
      return;
    }

    let cancelled = false;
    loadRouteForMap(route)
      .then((display) => {
        routeDisplayCacheRef.current.set(route.id, display);
        if (!cancelled) setRouteDisplay(display);
      })
      .catch(() => {
        /* keep whatever route is currently displayed */
      });
    return () => {
      cancelled = true;
    };
  }, [mapRouteName, routes]);

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
    const onAlert = (event: {
      channel?: string;
      payload?: {
        trip_id?: string;
        route_id?: string;
        extra_minutes?: number;
        reason?: string;
      };
    }) => {
      const channel = event?.channel ?? '';
      const payload = event?.payload ?? {};
      if (
        channel === 'trip:started' ||
        channel === 'trip:completed' ||
        channel === 'notifications:delay'
      ) {
        // Resolve labels now — the trip may leave the live list moments later.
        const live = trackingRef.current.find((t) => t.trip_id === payload.trip_id);
        const rawRoute =
          live?.route_name ?? routesRef.current.find((r) => r.id === payload.route_id)?.name;
        setAlerts((prev) => [
          ...prev.slice(-29),
          {
            id: ++alertIdRef.current,
            channel,
            at: new Date(),
            plate: live?.vehicle_plate,
            routeName: rawRoute ? formatRouteName(rawRoute).name : undefined,
            extraMinutes: payload.extra_minutes,
            reason: payload.reason,
          },
        ]);
      }
      // Trips appearing/disappearing aren't covered by fleet:update — re-sync.
      if (channel === 'trip:started' || channel === 'trip:completed') {
        void refreshTracking();
        void refreshOverview();
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
  }, [applyCorrections, correctOne, refreshTracking, refreshOverview]);

  // "/" focuses the fleet search from anywhere (except while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  if (!config) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 bg-canvas">
        <div className="brand-mark h-12 w-12 shadow-panel">
          <BusIcon size={20} />
        </div>
        <div className="spinner h-8 w-8" role="status" aria-label="Loading" />
        <p className="text-[1rem] font-medium text-muted">Loading operations map…</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#E7F0ED]">
      <header className="relative z-30 shrink-0">
        <div className="pointer-events-auto section-bg flex min-h-[4.25rem] flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5 md:px-5">
          <div className="flex max-w-[min(100%,24rem)] items-center gap-2.5 rounded-xl bg-white px-2 py-1.5 shadow-card">
            <div className="brand-mark">
              <BusIcon size={15} />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-[1.125rem] font-bold tracking-tight text-ink">
                BTS Operations
              </h1>
              <p className="truncate text-[0.8125rem] font-medium text-muted">
                Kigali · Real-Time Command
              </p>
            </div>
            <span
              className={`ml-0.5 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8125rem] font-bold ${
                socketLive ? 'bg-success-bg text-success' : 'bg-muted-bg text-muted'
              }`}
              role="status"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  socketLive ? 'animate-pulse-dot bg-success' : 'bg-muted'
                }`}
                aria-hidden="true"
              />
              {socketLive ? 'LIVE' : 'POLL'}
            </span>
          </div>

          <div className="hidden xl:block">
            <div className="stat-strip">
              <StatItem label="active" value={tracking.length} />
              <StatItem
                label="delayed"
                value={delayedCount}
                tone={delayedCount > 0 ? 'danger' : 'success'}
              />
              <StatItem label="routes" value={routes.length} />
              <StatItem label="available" value={overview?.buses_available ?? '—'} />
              <StatItem
                label="done"
                value={overview?.completed_trips_today ?? '—'}
                className="max-[1500px]:hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative hidden items-center rounded-xl bg-white shadow-card sm:flex">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setQuery('');
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                type="search"
                placeholder="Search plate or route"
                aria-label="Search fleet"
                className="h-10 w-48 rounded-xl bg-transparent pl-9 pr-8 text-[0.9375rem] font-medium text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 lg:w-60"
              />
              <kbd
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-muted-bg px-1.5 py-0.5 text-[12px] font-bold text-muted"
                aria-hidden="true"
              >
                /
              </kbd>
            </label>

            <div className="flex items-center gap-0.5 rounded-xl bg-white p-1 pl-1.5 shadow-card">
              <AlertsFeed alerts={alerts} />
              <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
              <span className="hidden px-2.5 sm:block">
                <ClockNow />
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <OperationsMap
            config={config}
            tracking={tracking}
            selectedRoute={routeDisplay}
            onVehicleClick={setSelectedTripId}
            onStopClick={setSelectedStop}
            highlightStopId={selectedStop?.id ?? null}
            followTripId={selectedTripId ?? null}
          />
        </div>

        <aside
          className={`absolute z-20 flex min-h-0 flex-col sheet animate-sheet-in
            max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:max-h-[46vh] max-md:rounded-t-sheet max-md:border-x-0 max-md:border-b-0
            md:inset-y-0 md:left-0 md:w-[380px] md:rounded-none md:border-b-0 md:border-l-0 md:border-t-0
            ${selectedTrip ? 'max-lg:hidden' : ''}`}
        >
          <div className="sheet-handle md:hidden" aria-hidden="true" />
          <FleetPanel
            tracking={tracking}
            query={query}
            selectedTripId={selectedTripId}
            onSelectTrip={(tripId) =>
              setSelectedTripId((prev) => (prev === tripId ? undefined : tripId))
            }
          />
        </aside>

        {selectedTrip && (
          <TripDetailPanel
            trip={selectedTrip}
            routeStops={detailStops}
            onClose={() => setSelectedTripId(undefined)}
          />
        )}

        {selectedStop && (
          <StopArrivalsCard
            stop={selectedStop}
            tracking={tracking}
            onClose={() => setSelectedStop(null)}
          />
        )}
      </div>
    </div>
  );
}
