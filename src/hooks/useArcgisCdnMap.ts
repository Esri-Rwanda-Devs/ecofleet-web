import { useEffect, useRef, useState } from 'react';
import { esriRequire, loadArcgisCdn } from '../arcgis/cdnLoader';
import type { EsriGraphicsLayer, EsriMapView } from '../arcgis/cdnTypes';
import { KIGALI_CENTER } from '../arcgis/constants';

const ARCGIS_TOKEN = import.meta.env.VITE_ARCGIS_TOKEN || '';
const LOAD_TIMEOUT_MS = 25_000;

export interface ArcgisCdnLayers {
  routeLayer: EsriGraphicsLayer;
  stopLayer: EsriGraphicsLayer;
  vehicleLayer: EsriGraphicsLayer;
}

export interface UseArcgisCdnMapOptions {
  center?: { longitude: number; latitude: number };
  zoom?: number;
  onVehicleClick?: (tripId: string) => void;
}

async function buildMap(
  Map: new (p: { basemap: unknown }) => { addMany(layers: unknown[]): void },
  Basemap: new (p: { baseLayers: unknown[]; title?: string }) => unknown,
  TileLayer: new (p: { url: string }) => { load(): Promise<void> },
  OpenStreetMapLayer: new () => unknown,
  esriConfig: { apiKey?: string }
): Promise<{ map: { addMany(layers: unknown[]): void }; basemapName: string }> {
  if (ARCGIS_TOKEN) esriConfig.apiKey = ARCGIS_TOKEN;

  // 1) With API key — Esri World Imagery
  if (ARCGIS_TOKEN) {
    try {
      const imagery = new TileLayer({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
      });
      await imagery.load();
      const basemap = new Basemap({ baseLayers: [imagery], title: 'Satellite' });
      return { map: new Map({ basemap }), basemapName: 'Satellite' };
    } catch {
      /* fall through */
    }
  }

  // 2) OpenStreetMap — always free, no API key (reliable in Rwanda)
  try {
    const osm = new OpenStreetMapLayer();
    const basemap = new Basemap({ baseLayers: [osm], title: 'OpenStreetMap' });
    return { map: new Map({ basemap }), basemapName: 'OpenStreetMap' };
  } catch {
    /* fall through */
  }

  // 3) Built-in basemap id
  for (const id of ['osm', 'streets', 'satellite'] as const) {
    try {
      return { map: new Map({ basemap: id }), basemapName: id };
    } catch {
      /* next */
    }
  }

  throw new Error('No basemap could be loaded');
}

export function useArcgisCdnMap({
  center = KIGALI_CENTER,
  zoom = 15,
  onVehicleClick,
}: UseArcgisCdnMapOptions) {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EsriMapView | null>(null);
  const [layers, setLayers] = useState<ArcgisCdnLayers | null>(null);
  const [view, setView] = useState<EsriMapView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basemapName, setBasemapName] = useState('');

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    let cancelled = false;
    let clickHandle: { remove(): void } | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const fail = (message: string) => {
      if (cancelled) return;
      setError(message);
      setIsLoading(false);
    };

    timeoutId = setTimeout(() => {
      fail('Map load timed out — check network access to js.arcgis.com');
    }, LOAD_TIMEOUT_MS);

    const init = async () => {
      try {
        await loadArcgisCdn();

        const [Map, MapView, GraphicsLayer, Basemap, TileLayer, OpenStreetMapLayer, esriConfig] =
          await esriRequire<
            [
              new (p: { basemap: unknown }) => { addMany(layers: unknown[]): void },
              new (p: Record<string, unknown>) => EsriMapView,
              new (p?: Record<string, unknown>) => EsriGraphicsLayer,
              new (p: { baseLayers: unknown[]; title?: string }) => unknown,
              new (p: { url: string }) => { load(): Promise<void> },
              new () => unknown,
              { apiKey?: string },
            ]
          >([
            'esri/Map',
            'esri/views/MapView',
            'esri/layers/GraphicsLayer',
            'esri/Basemap',
            'esri/layers/TileLayer',
            'esri/layers/OpenStreetMapLayer',
            'esri/config',
          ]);

        if (cancelled || !mapRef.current) return;

        const { map, basemapName: name } = await buildMap(
          Map,
          Basemap,
          TileLayer,
          OpenStreetMapLayer,
          esriConfig
        );
        setBasemapName(name);

        const routeLayer = new GraphicsLayer({ id: 'selected-route' });
        const stopLayer = new GraphicsLayer({ id: 'selected-stops' });
        const vehicleLayer = new GraphicsLayer({ id: 'live-vehicles' });
        map.addMany([routeLayer, stopLayer, vehicleLayer]);

        const mapView = new MapView({
          container: mapRef.current,
          map,
          center: [center.longitude, center.latitude],
          zoom,
          constraints: { minZoom: 10, maxZoom: 19 },
          ui: { components: ['attribution', 'zoom'] },
        });

        await mapView.when();
        if (cancelled) {
          mapView.destroy();
          return;
        }

        clearTimeout(timeoutId);
        viewRef.current = mapView;
        setView(mapView);
        setLayers({ routeLayer, stopLayer, vehicleLayer });
        setIsLoading(false);

        clickHandle = mapView.on('click', (event: unknown) => {
          mapView.hitTest(event as object, { include: [vehicleLayer] }).then((response) => {
            const hit = response.results.find(
              (r) =>
                typeof r === 'object' &&
                r !== null &&
                'graphic' in r &&
                (r as { graphic?: { layer?: unknown; attributes?: { tripId?: string } } }).graphic
                  ?.layer === vehicleLayer
            ) as { graphic?: { attributes?: { tripId?: string } } } | undefined;
            const tripId = hit?.graphic?.attributes?.tripId;
            if (tripId && onVehicleClick) onVehicleClick(tripId);
          });
        });

        resizeObserver = new ResizeObserver(() => {
          if (typeof mapView.resize === 'function') mapView.resize();
        });
        resizeObserver.observe(mapRef.current);
      } catch (err) {
        clearTimeout(timeoutId);
        fail(err instanceof Error ? err.message : 'Map failed to load');
        console.error('ArcGIS CDN map failed:', err);
      }
    };

    init();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clickHandle?.remove();
      resizeObserver?.disconnect();
      viewRef.current?.destroy();
      viewRef.current = null;
      setView(null);
      setLayers(null);
    };
  }, [center.longitude, center.latitude, zoom, onVehicleClick]);

  return { mapRef, view, layers, isLoading, error, basemapName };
}
