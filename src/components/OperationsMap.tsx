import { useEffect, useRef, useState, useMemo } from 'react';
import type { ArcGisConfig, BusStop, TripTrackingState } from '../types';

const ENV_ARCGIS_TOKEN = import.meta.env.VITE_ARCGIS_TOKEN || '';

/**
 * The map no longer takes Bus_Lanes_BTS layer URLs. That FeatureServer still
 * publishes the retired STP-* stops and the pre-rebuild lines, so it disagrees
 * with the geodatabase; the network now arrives over `setNetwork` instead. The
 * token still goes through — the basemap and any other service need it.
 */
function buildMapUrl(config: ArcGisConfig): string {
  const params = new URLSearchParams();
  const token = config.arcgisToken || ENV_ARCGIS_TOKEN;
  if (token) params.set('token', token);
  if (config.portalUrl) params.set('portal', config.portalUrl);
  const qs = params.toString();
  return qs ? `/operations-map.html?${qs}` : '/operations-map.html';
}

interface OperationsMapProps {
  config: ArcGisConfig;
  tracking: TripTrackingState[];
  /**
   * The whole bus network from the geodatabase, drawn as blue background
   * context. Replaces the Bus_Lanes_BTS feature layers, which still publish the
   * retired stop set and the pre-rebuild lines.
   */
  network?: {
    routes: { id: string; name: string; polyline: number[][] }[];
    stops: { id: string; name: string; longitude: number; latitude: number }[];
  };
  selectedRoute?: {
    polyline?: number[][];
    stops?: BusStop[];
    arcgisObjectId?: number;
  };
  /** Routes pinned by the route filter, drawn beneath the selected trip. */
  routeFilter?: {
    routes: {
      id: string;
      name: string;
      color: string;
      polyline?: number[][];
      stops?: BusStop[];
    }[];
    /** Increment to re-fit the camera to the pinned set. */
    fitKey: number;
  };
  onVehicleClick?: (tripId: string) => void;
  /** Fired when the user clicks a stop marker on the map. */
  onStopClick?: (stop: { id: string; name: string; longitude?: number; latitude?: number }) => void;
  /** Stop id to draw a selection ring around; null clears it. */
  highlightStopId?: string | null;
  /** Trip whose bus the camera should zoom to and follow; null releases it. */
  followTripId?: string | null;
  /** Points to fit when `fitKey` changes (e.g. header Active / Delayed click). */
  fitPoints?: { longitude: number; latitude: number }[];
  /** Increment to re-trigger fitBounds even if points are unchanged. */
  fitKey?: number;
}

/**
 * Esri satellite imagery map (CDN iframe — same as mobile WebView pattern).
 */
export function OperationsMap({
  config,
  tracking,
  network,
  selectedRoute,
  routeFilter,
  onVehicleClick,
  onStopClick,
  highlightStopId,
  followTripId,
  fitPoints,
  fitKey = 0,
}: OperationsMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapSrc = useMemo(
    () => buildMapUrl(config),
    [config.portalUrl, config.arcgisToken],
  );

  useEffect(() => {
    setMapReady(false);
  }, [mapSrc]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'mapReady') {
        setMapReady(true);
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'setCenter',
            longitude: config.center.longitude,
            latitude: config.center.latitude,
            zoom: 15,
          },
          '*'
        );
      }
      if (event.data?.type === 'vehicleClick' && onVehicleClick) {
        onVehicleClick(event.data.tripId);
      }
      if (event.data?.type === 'stopClick' && onStopClick) {
        if (typeof event.data.stopId === 'string' && typeof event.data.name === 'string') {
          onStopClick({
            id: event.data.stopId,
            name: event.data.name,
            longitude:
              typeof event.data.longitude === 'number' ? event.data.longitude : undefined,
            latitude:
              typeof event.data.latitude === 'number' ? event.data.latitude : undefined,
          });
        }
      }
    };
    window.addEventListener('message', onMessage);

    // Fallback: hide overlay if iframe map never posts mapReady (e.g. blocked CDN)
    const fallback = setTimeout(() => setMapReady(true), 15000);

    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(fallback);
    };
  }, [config.center.longitude, config.center.latitude, onVehicleClick, onStopClick]);

  useEffect(() => {
    if (!mapReady || !iframeRef.current?.contentWindow) return;
    if (!network) return;
    iframeRef.current.contentWindow.postMessage(
      { type: 'setNetwork', routes: network.routes, stops: network.stops },
      '*'
    );
  }, [mapReady, network]);

  useEffect(() => {
    if (!mapReady || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      {
        type: 'setRoute',
        polyline: selectedRoute?.polyline,
        stops: selectedRoute?.stops ?? [],
      },
      '*'
    );
  }, [mapReady, selectedRoute]);

  useEffect(() => {
    if (!mapReady || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      {
        type: 'setRouteFilter',
        routes: (routeFilter?.routes ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          color: r.color,
          polyline: r.polyline,
          stops: (r.stops ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            longitude: s.longitude,
            latitude: s.latitude,
          })),
        })),
        fitKey: routeFilter?.fitKey ?? 0,
      },
      '*'
    );
  }, [mapReady, routeFilter]);

  useEffect(() => {
    if (!mapReady || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'setTracking', tracking }, '*');
  }, [mapReady, tracking]);

  useEffect(() => {
    if (!mapReady || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: 'setHighlightStop', stopId: highlightStopId ?? null },
      '*'
    );
  }, [mapReady, highlightStopId]);

  useEffect(() => {
    if (!mapReady || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: 'followVehicle', tripId: followTripId ?? null },
      '*'
    );
  }, [mapReady, followTripId]);

  useEffect(() => {
    if (!mapReady || !iframeRef.current?.contentWindow || !fitKey) return;
    if (!fitPoints?.length) return;
    iframeRef.current.contentWindow.postMessage(
      { type: 'fitBounds', points: fitPoints },
      '*'
    );
  }, [mapReady, fitKey, fitPoints]);

  return (
    <div className="absolute inset-0 h-full w-full">
      <iframe
        key={mapSrc}
        ref={iframeRef}
        src={mapSrc}
        title="Satellite operations map"
        className="block h-full w-full border-0 bg-[#1a1a1a]"
        allow="geolocation"
      />
      {!mapReady && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#E8E8E8] text-[1rem] font-medium text-muted dark:bg-[#141416]"
          role="status"
        >
          <div className="spinner h-8 w-8" />
          <p>Loading map…</p>
        </div>
      )}
    </div>
  );
}
