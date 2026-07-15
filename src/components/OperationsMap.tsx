import { useEffect, useRef, useState, useMemo } from 'react';
import type { ArcGisConfig, BusStop, TripTrackingState } from '../types';

const ENV_ARCGIS_TOKEN = import.meta.env.VITE_ARCGIS_TOKEN || '';

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
  selectedRoute?: {
    polyline?: number[][];
    stops?: BusStop[];
    arcgisObjectId?: number;
  };
  onVehicleClick?: (tripId: string) => void;
  /** Fired when the user clicks a stop marker on the map. */
  onStopClick?: (stop: { id: string; name: string }) => void;
  /** Stop id to draw a selection ring around; null clears it. */
  highlightStopId?: string | null;
  /** Trip whose bus the camera should zoom to and follow; null releases it. */
  followTripId?: string | null;
}

/**
 * Esri satellite imagery map (CDN iframe — same as mobile WebView pattern).
 */
export function OperationsMap({
  config,
  tracking,
  selectedRoute,
  onVehicleClick,
  onStopClick,
  highlightStopId,
  followTripId,
}: OperationsMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapSrc = useMemo(() => buildMapUrl(config), [config.portalUrl, config.arcgisToken]);

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
          onStopClick({ id: event.data.stopId, name: event.data.name });
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
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#E8E8E8] text-[1rem] font-medium text-muted"
          role="status"
        >
          <div className="spinner h-8 w-8" />
          <p>Loading map…</p>
        </div>
      )}
    </div>
  );
}
