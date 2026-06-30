import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { OperationsMap } from '../components/OperationsMap';
import { FleetPanel } from '../components/FleetPanel';
import { TripDetailPanel } from '../components/TripDetailPanel';
import { RoutePlanner } from '../components/RoutePlanner';
import { BusIcon, FleetIcon, RouteIcon } from '../components/Icons';
import { parseRoutePolyline } from '../utils/route-geometry';
import { ArcGisConfig, BusStop, Route, RouteCalculation, TripTrackingState } from '../types';

const POLL_MS = 5000;

async function loadRouteForMap(route: Route): Promise<{ polyline?: number[][]; stops: BusStop[] }> {
  const { route: detail, stops } = await api.getRoute(route.id);

  let polyline = parseRoutePolyline(detail.route_polyline as Parameters<typeof parseRoutePolyline>[0]);

  if (!polyline || polyline.length < 2) {
    try {
      const calc = await api.calculateRoute({
        origin_longitude: detail.origin_longitude,
        origin_latitude: detail.origin_latitude,
        destination_longitude: detail.destination_longitude,
        destination_latitude: detail.destination_latitude,
        waypoints: stops.slice(1, -1).map((s) => ({
          longitude: s.longitude,
          latitude: s.latitude,
          name: s.name,
        })),
      });
      polyline = parseRoutePolyline(calc.polyline);
    } catch {
      polyline = stops.map((s) => [s.longitude, s.latitude]);
    }
  }

  return { polyline, stops };
}

export function DashboardPage() {
  const [config, setConfig] = useState<ArcGisConfig | null>(null);
  const [tracking, setTracking] = useState<TripTrackingState[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeDisplay, setRouteDisplay] = useState<{ polyline?: number[][]; stops?: BusStop[] }>();
  const [activeTab, setActiveTab] = useState<'fleet' | 'routes'>('fleet');

  const selectedTrip = tracking.find((t) => t.trip_id === selectedTripId) || null;
  const connectedCount = tracking.filter((t) => t.gps_connected).length;
  const delayedCount = tracking.filter((t) => t.is_delayed).length;

  const refreshTracking = useCallback(async () => {
    try {
      const data = await api.getActiveTracking();
      setTracking(data.tracking);
    } catch {
      /* backend may be starting */
    }
  }, []);

  useEffect(() => {
    Promise.all([api.getArcGisConfig(), api.getActiveTracking(), api.getRoutes()])
      .then(async ([arcgisConfig, trackingData, routesData]) => {
        setConfig(arcgisConfig);
        setTracking(trackingData.tracking);
        setRoutes(routesData.routes);

        if (routesData.routes.length > 0) {
          const display = await loadRouteForMap(routesData.routes[0]);
          setRouteDisplay(display);
        }
      })
      .catch(console.error);

    const interval = setInterval(refreshTracking, POLL_MS);
    return () => clearInterval(interval);
  }, [refreshTracking]);

  const handleRouteCalculated = (result: RouteCalculation, stops: BusStop[]) => {
    const polyline = parseRoutePolyline(result.polyline) ?? undefined;
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
            <span>Bus Transport Services · Kigali, Rwanda · Satellite Imagery</span>
          </div>
        </div>
        <div className="header-actions">
          <div className="live-indicator">
            <span className="live-dot" />
            Live · updates every {POLL_MS / 1000}s
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
          <div className="stat-icon green">
            <BusIcon size={18} />
          </div>
          <div>
            <div className="stat-value">{connectedCount}</div>
            <div className="stat-label">GPS Connected</div>
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
            <div className="stat-label">Delayed</div>
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
          />
        </main>
      </div>
    </div>
  );
}
