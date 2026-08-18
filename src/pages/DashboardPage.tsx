import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket, subscribeDispatchRooms, subscribeTripRoom } from '../services/socket';
import {
  correctTrackingForOrigin,
  dedupeRouteStops,
  updateVisitedStops,
} from '../utils/tracking-corrections';
import { normalizeTripId, sameTripId } from '../utils/trip-id';
import { OperationsMap } from '../components/OperationsMap';
import { FleetPanel } from '../components/FleetPanel';
import { TripDetailPanel } from '../components/TripDetailPanel';
import { StopArrivalsCard } from '../components/StopArrivalsCard';
import { AlertsFeed, AlertEvent } from '../components/AlertsFeed';
import { ThemeToggle } from '../components/ThemeToggle';
import { RouteFilter } from '../components/RouteFilter';
import { Logo } from '../components/Logo';
import { SearchIcon } from '../components/Icons';
import { formatRouteName, formatStopName } from '../utils/display-names';
import { routeColorAt } from '../utils/route-colors';
import { isSparseRoutePolyline, parseRoutePolyline } from '../utils/route-geometry';
import {
  ArcGisConfig,
  BusStop,
  FleetOverview,
  NetworkStop,
  Route,
  TripTrackingState,
} from '../types';

/** Poll cadence while the realtime socket is down. */
const POLL_MS = 4000;
/** Slow reconciliation sweep while the socket is live (safety net only). */
const RECONCILE_MS = 15000;
/** Fleet overview refresh (server caches it for 15s). */
const OVERVIEW_MS = 30000;

/** True when a trip serves a stop whose display name matches `q` (lowercase). */
function tripServesStopQuery(t: TripTrackingState, q: string, routeStops?: BusStop[]): boolean {
  if (formatStopName(t.next_stop_name).toLowerCase().includes(q)) return true;
  if (t.stop_etas?.some((s) => formatStopName(s.stop_name).toLowerCase().includes(q))) return true;
  if (routeStops?.some((s) => formatStopName(s.name).toLowerCase().includes(q))) return true;
  return false;
}

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
  active = false,
  onClick,
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'danger' | 'success';
  className?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const valueCls =
    tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-ink';
  const content = (
    <>
      <b className={`num text-[1.125rem] font-bold leading-none ${valueCls}`}>{value}</b>
      <span className="text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </span>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`stat-strip__item pressable cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          active ? 'bg-primary-soft shadow-focus-primary' : 'hover:bg-muted-bg'
        } ${className}`}
      >
        {content}
      </button>
    );
  }
  return <div className={`stat-strip__item ${className}`}>{content}</div>;
}

async function loadRouteForMap(route: Route): Promise<{ polyline?: number[][]; stops: BusStop[] }> {
  const { route: detail, stops: rawStops } = await api.getRoute(route.id);
  const stops = dedupeRouteStops(rawStops);

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
  /** Every stop in the geodatabase — the map's background stop layer. */
  const [networkStops, setNetworkStops] = useState<NetworkStop[]>([]);
  const [routeDisplay, setRouteDisplay] = useState<{ polyline?: number[][]; stops?: BusStop[] }>();
  const [selectedStop, setSelectedStop] = useState<{ id: string; name: string } | null>(null);
  const [socketLive, setSocketLive] = useState(false);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [query, setQuery] = useState('');
  /** Routes pinned by the route filter. Empty = no filter (follow the fleet). */
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
  /** Bumped on every filter change so the map re-fits to the pinned routes. */
  const [routeFilterFitKey, setRouteFilterFitKey] = useState(0);
  const [routeGeoms, setRouteGeoms] = useState<
    Map<string, { polyline?: number[][]; stops: BusStop[] }>
  >(new Map());
  /** Header number click: filter map to active fleet or delayed only, then zoom. */
  const [statFocus, setStatFocus] = useState<'active' | 'delayed' | null>(null);
  const [fitBoundsKey, setFitBoundsKey] = useState(0);
  /** When set, camera fit uses these points instead of the filtered fleet. */
  const [fitOverride, setFitOverride] = useState<
    { longitude: number; latitude: number }[] | null
  >(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const alertIdRef = useRef(0);
  const routesRef = useRef<Route[]>([]);
  const trackingRef = useRef<TripTrackingState[]>([]);
  const selectedTripIdRef = useRef<string | undefined>(undefined);
  const routeStopsRef = useRef<Map<string, BusStop[]>>(new Map());
  const visitedRef = useRef<Map<string, Set<string>>>(new Map());

  const selectedTrip = tracking.find((t) => sameTripId(t.trip_id, selectedTripId)) || null;
  const delayedCount = tracking.filter((t) => t.is_delayed).length;
  const [detailStops, setDetailStops] = useState<BusStop[]>();

  const searchQuery = query.trim().toLowerCase();

  /** Fleet + map filter: buses that serve a stop matching the search. */
  const filteredTracking = useMemo(() => {
    if (!searchQuery) return tracking;
    return tracking.filter((t) =>
      tripServesStopQuery(t, searchQuery, routeStopsRef.current.get(t.route_name))
    );
  }, [tracking, searchQuery]);

  const routeFilterActive = selectedRouteIds.length > 0;

  /** Stable colour per route — position in the API list, not in the selection. */
  const colorByRouteId = useMemo(
    () => new Map(routes.map((r, i) => [r.id, routeColorAt(i)])),
    [routes]
  );

  /** Tracking joins to routes by name, so the filter resolves to names too. */
  const selectedRouteNames = useMemo(() => {
    const names = new Set<string>();
    for (const id of selectedRouteIds) {
      const route = routes.find((r) => r.id === id);
      if (route) names.add(route.name);
    }
    return names;
  }, [selectedRouteIds, routes]);

  /** Live bus count per route, shown as a hint next to each row in the filter. */
  const liveCountByRouteName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tracking) {
      counts.set(t.route_name, (counts.get(t.route_name) ?? 0) + 1);
    }
    return counts;
  }, [tracking]);

  /** Stop search, then pinned routes, then header stat focus — in that order. */
  const mapTracking = useMemo(() => {
    let list = filteredTracking;
    if (selectedRouteNames.size > 0) {
      list = list.filter((t) => selectedRouteNames.has(t.route_name));
    }
    if (statFocus === 'delayed') list = list.filter((t) => t.is_delayed);
    return list;
  }, [filteredTracking, statFocus, selectedRouteNames]);

  const fitPoints = useMemo(() => {
    if (fitOverride?.length) return fitOverride;
    return mapTracking
      .filter((t) => Number.isFinite(t.longitude) && Number.isFinite(t.latitude))
      .map((t) => ({ longitude: t.longitude, latitude: t.latitude }));
  }, [fitOverride, mapTracking]);

  const focusStat = useCallback((kind: 'active' | 'delayed') => {
    setFitOverride(null);
    setStatFocus(kind);
    setSelectedTripId(undefined);
    setSelectedStop(null);
    setFitBoundsKey((k) => k + 1);
  }, []);

  const changeRouteFilter = useCallback((ids: string[]) => {
    setSelectedRouteIds(ids);
    setSelectedStop(null);
    setFitOverride(null);
    setStatFocus(null);
    // Re-fit the camera to the new pinned set (or release it when cleared).
    setRouteFilterFitKey((k) => k + 1);
  }, []);

  const selectTrip = useCallback((tripId: string | undefined) => {
    setSelectedStop(null);
    setSelectedTripId(tripId);
  }, []);

  const toggleTrip = useCallback((tripId: string) => {
    setSelectedStop(null);
    setSelectedTripId((prev) => (prev === tripId ? undefined : tripId));
  }, []);

  /** Zoom + highlight a bus stop (timeline number or map marker). */
  const focusStopOnMap = useCallback(
    (stop: { id: string; name: string; longitude?: number; latitude?: number }) => {
      setSelectedStop({ id: stop.id, name: stop.name });
      let lng = stop.longitude;
      let lat = stop.latitude;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        const fromRoute =
          detailStops?.find((s) => s.id === stop.id) ??
          routeDisplay?.stops?.find((s) => s.id === stop.id);
        lng = fromRoute?.longitude;
        lat = fromRoute?.latitude;
      }
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        setFitOverride([{ longitude: lng as number, latitude: lat as number }]);
        setFitBoundsKey((k) => k + 1);
      }
    },
    [detailStops, routeDisplay]
  );

  /** Map route markers: when searching, only show matching stops. */
  const mapRouteDisplay = useMemo(() => {
    if (!routeDisplay) return routeDisplay;
    if (!searchQuery || !routeDisplay.stops?.length) return routeDisplay;
    const matched = routeDisplay.stops.filter((s) =>
      formatStopName(s.name).toLowerCase().includes(searchQuery)
    );
    return matched.length > 0 ? { ...routeDisplay, stops: matched } : routeDisplay;
  }, [routeDisplay, searchQuery]);

  /** Prefer highlighting the first stop that matches the search on the map route. */
  const searchHighlightStopId = useMemo(() => {
    if (!searchQuery || !mapRouteDisplay?.stops?.length) return null;
    return mapRouteDisplay.stops[0]?.id ?? null;
  }, [searchQuery, mapRouteDisplay]);

  // Drop selection if the trip no longer matches stop search / stat filter.
  useEffect(() => {
    if (!selectedTripId) return;
    if (!mapTracking.some((t) => sameTripId(t.trip_id, selectedTripId))) {
      setSelectedTripId(undefined);
    }
  }, [mapTracking, selectedTripId]);

  // Client-side arrival truth (mirrors the mobile app): stops each bus has
  // genuinely been near, plus cached stop lists per route name.
  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  useEffect(() => {
    selectedTripIdRef.current = selectedTripId;
  }, [selectedTripId]);

  const stopsForRouteName = useCallback(async (routeName: string) => {
    const cached = routeStopsRef.current.get(routeName);
    if (cached) return cached;
    const route = routesRef.current.find((r) => r.name === routeName);
    if (!route) return undefined;
    try {
      const { stops: raw } = await api.getRoute(route.id);
      const stops = dedupeRouteStops(raw);
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
      const key = normalizeTripId(t.trip_id) || t.trip_id;
      let visited = visitedRef.current.get(key);
      if (!visited) {
        visited = new Set();
        visitedRef.current.set(key, visited);
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
      const activeIds = new Set(
        list.map((t) => normalizeTripId(t.trip_id) || t.trip_id),
      );
      for (const id of [...visitedRef.current.keys()]) {
        if (!activeIds.has(id) && !activeIds.has(normalizeTripId(id))) {
          visitedRef.current.delete(id);
        }
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

  // Background stop layer for the map. The route geometry rides along with
  // /api/routes above, so this is the only extra request the network costs.
  useEffect(() => {
    let cancelled = false;
    api
      .getNetworkStops()
      .then((stops) => {
        if (!cancelled) setNetworkStops(stops);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  // Network-wide stats for the command bar KPIs.
  useEffect(() => {
    void refreshOverview();
    const id = setInterval(refreshOverview, OVERVIEW_MS);
    return () => clearInterval(id);
  }, [refreshOverview]);

  // The map follows the live operation: it always shows the route of the
  // selected trip, or of the first active trip when nothing is selected —
  // so a return trip's route appears the moment the driver starts it.
  // When searching by stop, prefer the first trip that serves that stop.
  // While routes are pinned, the last fallback is dropped: auto-showing an
  // unpinned route's line would contradict the filter the operator just set.
  const mapRouteName =
    selectedTrip?.route_name ??
    mapTracking[0]?.route_name ??
    (routeFilterActive ? undefined : tracking[0]?.route_name);
  const routeDisplayCacheRef = useRef<Map<string, { polyline?: number[][]; stops: BusStop[] }>>(
    new Map()
  );

  useEffect(() => {
    if (!mapRouteName) {
      setRouteDisplay(undefined);
      return;
    }
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

  // Geometry for every pinned route. Shares routeDisplayCacheRef with the
  // selected-trip route above, so pinning a route already on screen costs
  // nothing and the (slow) /api/routes/:id + ArcGIS solve runs at most once.
  const routeFilterKey = selectedRouteIds.join('|');
  useEffect(() => {
    const ids = routeFilterKey ? routeFilterKey.split('|') : [];
    if (!ids.length) {
      setRouteGeoms(new Map());
      return;
    }

    let cancelled = false;
    void (async () => {
      const loaded = await Promise.all(
        ids.map(async (id) => {
          const cached = routeDisplayCacheRef.current.get(id);
          if (cached) return [id, cached] as const;
          const route = routesRef.current.find((r) => r.id === id);
          if (!route) return null;
          try {
            const display = await loadRouteForMap(route);
            routeDisplayCacheRef.current.set(id, display);
            return [id, display] as const;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      setRouteGeoms(
        new Map(loaded.filter((e): e is NonNullable<typeof e> => e !== null))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [routeFilterKey, routes]);

  /**
   * The whole network for the map's blue background layer.
   *
   * `/api/routes` already carries `route_polyline` for every route, so this
   * costs no extra request — only the stop list is fetched separately. Routes
   * whose geometry is missing or degenerate are dropped rather than drawn as a
   * stray two-point line across the city.
   */
  const networkForMap = useMemo(() => {
    const drawable = routes.flatMap((route) => {
      const polyline = parseRoutePolyline(
        route.route_polyline as Parameters<typeof parseRoutePolyline>[0]
      );
      if (!polyline || polyline.length < 2) return [];
      return [
        {
          id: route.id,
          name: formatRouteName(route.name).name || route.name,
          polyline,
        },
      ];
    });
    return {
      routes: drawable,
      stops: networkStops.map((s) => ({
        id: s.stop_id || s.id,
        name: s.name,
        longitude: s.longitude,
        latitude: s.latitude,
      })),
    };
  }, [routes, networkStops]);

  /** Pinned routes + their colours, in the shape the map iframe expects. */
  const routeFilterForMap = useMemo(() => {
    const pinned = selectedRouteIds.flatMap((id) => {
      const route = routes.find((r) => r.id === id);
      if (!route) return [];
      const geom = routeGeoms.get(id);
      return [
        {
          id,
          name: formatRouteName(route.name).name || route.name,
          color: colorByRouteId.get(id) ?? routeColorAt(0),
          polyline: geom?.polyline,
          stops: geom?.stops,
        },
      ];
    });
    return { routes: pinned, fitKey: routeFilterFitKey };
  }, [selectedRouteIds, routes, routeGeoms, colorByRouteId, routeFilterFitKey]);

  // Realtime feed: GPS pings arrive as fleet:update the moment the driver app
  // sends them; fleet:all re-syncs the whole list on (re)connect.
  useEffect(() => {
    const socket = getSocket();

    const mergeTracking = (state: TripTrackingState) => {
      // Apply backend snapshot immediately so ETA/position update on the same
      // frame as the socket event — origin corrections run after without blocking.
      setTracking((prev) => {
        const i = prev.findIndex((t) => sameTripId(t.trip_id, state.trip_id));
        if (i === -1) return [...prev, state];
        const cur = prev[i];
        const incomingTs = Date.parse(state.last_updated || '') || 0;
        const currentTs = Date.parse(cur.last_updated || '') || 0;
        if (incomingTs && currentTs && incomingTs < currentTs) return prev;
        const next = prev.slice();
        next[i] = state;
        return next;
      });
      void correctOne(state).then((corrected) => {
        setTracking((prev) => {
          const i = prev.findIndex((t) => sameTripId(t.trip_id, corrected.trip_id));
          if (i === -1) return prev;
          const cur = prev[i];
          const correctedTs = Date.parse(corrected.last_updated || '') || 0;
          const currentTs = Date.parse(cur.last_updated || '') || 0;
          // A newer GPS ping landed while we awaited route-stop corrections.
          if (currentTs && correctedTs && currentTs > correctedTs) return prev;
          const next = prev.slice();
          next[i] = corrected;
          return next;
        });
      });
    };

    const subscribe = () => {
      setSocketLive(true);
      subscribeDispatchRooms(socket);
      const selected = selectedTripIdRef.current;
      if (selected) subscribeTripRoom(selected, socket);
      // Re-sync REST snapshot after reconnect so we never miss a gap.
      void refreshTracking();
    };
    const onDisconnect = () => setSocketLive(false);
    const onFleetAll = async (states: TripTrackingState[]) => {
      setTracking(await applyCorrections(states));
    };
    const onFleetUpdate = (state: TripTrackingState) => {
      void mergeTracking(state);
    };
    const onTripUpdate = (state: TripTrackingState) => {
      void mergeTracking(state);
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
        const live = trackingRef.current.find((t) =>
          sameTripId(t.trip_id, payload.trip_id),
        );
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
    socket.on('trip:update', onTripUpdate);
    socket.on('alert', onAlert);
    if (socket.connected) subscribe();

    return () => {
      socket.off('connect', subscribe);
      socket.off('disconnect', onDisconnect);
      socket.off('fleet:all', onFleetAll);
      socket.off('fleet:update', onFleetUpdate);
      socket.off('trip:update', onTripUpdate);
      socket.off('alert', onAlert);
    };
  }, [applyCorrections, correctOne, refreshTracking, refreshOverview]);

  // Keep the selected trip room subscribed for a dedicated trip:update stream.
  useEffect(() => {
    if (!selectedTripId) return;
    subscribeTripRoom(selectedTripId);
  }, [selectedTripId]);

  // "/" focuses the fleet search from anywhere (except while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        return;
      }
      e.preventDefault();
      const inputs = document.querySelectorAll<HTMLInputElement>('input[data-fleet-search]');
      const visible = [...inputs].find((input) => input.offsetParent !== null) ?? inputs[0];
      visible?.focus();
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
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-canvas">
        <Logo className="h-12" />
        <div className="spinner h-7 w-7" role="status" aria-label="Loading" />
        <p className="text-[0.8125rem] font-medium text-muted">Loading operations map…</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-app flex-col overflow-hidden bg-canvas">
      <header className="relative z-30 shrink-0 safe-pt">
        <div className="pointer-events-auto section-bg border-b border-line/50">
          <div className="flex min-h-14 items-center justify-between gap-2 safe-px py-2 md:min-h-16 md:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[min(100%,24rem)] sm:flex-none">
              <Link
                to="/"
                className="pressable group flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-2.5"
                aria-label="Back to landing page"
                title="Back to home"
              >
                <Logo className="h-7 sm:h-8" />
                <p className="hidden truncate text-[0.75rem] font-medium text-muted sm:block">
                  Kigali · Real-Time Command
                </p>
              </Link>
              <span
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[0.6875rem] font-bold sm:ml-1 sm:px-2.5 sm:text-[0.75rem] ${
                  socketLive ? 'bg-success-bg text-success' : 'bg-stale-bg text-stale'
                }`}
                role="status"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    socketLive ? 'animate-pulse-dot bg-success' : 'bg-stale'
                  }`}
                  aria-hidden="true"
                />
                {socketLive ? 'LIVE' : 'POLL'}
              </span>
            </div>

            <div className="hidden lg:block">
              <div className="stat-strip">
                <StatItem
                  label="active"
                  value={tracking.length}
                  active={statFocus === 'active'}
                  onClick={() => focusStat('active')}
                />
                <StatItem
                  label="delayed"
                  value={delayedCount}
                  tone={delayedCount > 0 ? 'danger' : 'success'}
                  active={statFocus === 'delayed'}
                  onClick={() => focusStat('delayed')}
                />
                <StatItem label="routes" value={routes.length} className="hidden xl:flex" />
                <StatItem
                  label="available"
                  value={overview?.buses_available ?? '—'}
                  className="hidden xl:flex"
                />
                {/* <StatItem
                  label="done"
                  value={overview?.completed_trips_today ?? '—'}
                  className="hidden 2xl:flex"
                /> */}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <label className="relative hidden items-center rounded-2xl border border-line/50 bg-muted-bg/60 transition-[border-color,box-shadow] duration-200 ease-smooth focus-within:border-primary/30 focus-within:bg-surface focus-within:shadow-card md:flex">
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
                  data-fleet-search
                  placeholder="Search bus stop"
                  aria-label="Search bus stop"
                  className="h-10 w-44 rounded-2xl bg-transparent pl-9 pr-8 text-[0.9375rem] font-medium text-ink placeholder:text-muted focus:outline-none lg:w-56 xl:w-64"
                />
                <kbd
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-surface/80 px-1.5 py-0.5 text-[11px] font-bold text-muted"
                  aria-hidden="true"
                >
                  /
                </kbd>
              </label>

              <RouteFilter
                routes={routes}
                selectedIds={selectedRouteIds}
                onChange={changeRouteFilter}
                liveCountByRouteName={liveCountByRouteName}
                className="hidden md:block"
              />

              <div className="flex items-center gap-0.5 rounded-2xl border border-line/50 bg-muted-bg/60 p-1">
                <AlertsFeed alerts={alerts} />
                <ThemeToggle className="h-9 w-9" />
                <span className="mx-1 hidden h-5 w-px bg-line/70 lg:block" aria-hidden="true" />
                <span className="hidden px-2.5 lg:block">
                  <ClockNow />
                </span>
              </div>
            </div>
          </div>

          {/* Mobile / tablet search + compact stats */}
          <div className="flex flex-col gap-2 border-t border-line/40 px-3 pb-2.5 pt-2 safe-px md:hidden">
            <div className="flex items-center gap-2">
              <label className="relative flex min-w-0 flex-1 items-center rounded-2xl border border-line/50 bg-muted-bg/60 focus-within:border-primary/30 focus-within:bg-surface">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setQuery('');
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                type="search"
                data-fleet-search
                placeholder="Search bus stop"
                aria-label="Search bus stop"
                className="h-11 w-full rounded-2xl bg-transparent pl-9 pr-3 text-[1rem] font-medium text-ink placeholder:text-muted focus:outline-none"
              />
              </label>
              <RouteFilter
                routes={routes}
                selectedIds={selectedRouteIds}
                onChange={changeRouteFilter}
                liveCountByRouteName={liveCountByRouteName}
                className="shrink-0"
              />
            </div>
            <div className="stat-strip w-full justify-between gap-1 overflow-x-auto">
              <StatItem
                label="active"
                value={tracking.length}
                active={statFocus === 'active'}
                onClick={() => focusStat('active')}
                className="min-w-[3.5rem] flex-1"
              />
              <StatItem
                label="delayed"
                value={delayedCount}
                tone={delayedCount > 0 ? 'danger' : 'success'}
                active={statFocus === 'delayed'}
                onClick={() => focusStat('delayed')}
                className="min-w-[3.5rem] flex-1"
              />
              <StatItem label="routes" value={routes.length} className="min-w-[3.5rem] flex-1" />
              <StatItem
                label="free"
                value={overview?.buses_available ?? '—'}
                className="min-w-[3.5rem] flex-1"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <OperationsMap
            config={config}
            tracking={mapTracking}
            network={networkForMap}
            selectedRoute={mapRouteDisplay}
            routeFilter={routeFilterForMap}
            onVehicleClick={selectTrip}
            onStopClick={focusStopOnMap}
            highlightStopId={selectedStop?.id ?? searchHighlightStopId}
            followTripId={selectedTripId ?? null}
            fitPoints={fitPoints}
            fitKey={fitBoundsKey}
          />
        </div>

        <aside
          className={`absolute z-20 flex min-h-0 flex-col sheet animate-sheet-in
            max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:max-h-[min(48vh,420px)] max-md:rounded-t-sheet max-md:border-x-0 max-md:border-b-0 max-md:safe-pb
            md:inset-y-0 md:left-0 md:w-[min(380px,38vw)] md:rounded-none md:border-b-0 md:border-l-0 md:border-t-0
            lg:w-[380px]
            ${selectedTrip ? 'max-lg:hidden' : ''}`}
        >
          <div className="sheet-handle md:hidden" aria-hidden="true" />
          <FleetPanel
            tracking={mapTracking}
            query={query}
            totalFleetCount={tracking.length}
            delayedFilter={statFocus === 'delayed'}
            selectedTripId={selectedTripId}
            onSelectTrip={toggleTrip}
          />
        </aside>

        {selectedTrip && (
          <TripDetailPanel
            trip={selectedTrip}
            routeStops={detailStops}
            onStopNumberClick={focusStopOnMap}
            onClose={() => setSelectedTripId(undefined)}
          />
        )}

        {selectedStop && (
          <StopArrivalsCard
            stop={selectedStop}
            tracking={mapTracking}
            onClose={() => setSelectedStop(null)}
          />
        )}
      </div>
    </div>
  );
}
