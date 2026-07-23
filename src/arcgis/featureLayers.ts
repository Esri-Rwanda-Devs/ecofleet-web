import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import PopupTemplate from '@arcgis/core/PopupTemplate';

const API_URL = import.meta.env.VITE_API_URL || 'https://esrirw.rw:8000' || 'http://localhost:8000';

export type BuslaneLayer = GeoJSONLayer;

function allFieldsPopupTemplate(title: string): PopupTemplate {
  return new PopupTemplate({
    title,
    content: [{ type: 'fields', fieldInfos: [] }],
    outFields: ['*'],
  });
}

async function fetchBuslaneGeoJSON(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URL}${path}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const hint = body.hint ? ` ${body.hint}` : '';
    throw new Error(`${body.error || 'Request failed'}${hint}`);
  }

  return res.json();
}

function geoJsonBlobUrl(geojson: Record<string, unknown>): string {
  const blob = new Blob([JSON.stringify(geojson)], { type: 'application/json' });
  return URL.createObjectURL(blob);
}

function createBusStopsLayer(geojson: Record<string, unknown>): GeoJSONLayer {
  const url = geoJsonBlobUrl(geojson);
  return new GeoJSONLayer({
    id: 'bus-stops',
    title: 'Bus Stops',
    url,
    outFields: ['*'],
    popupEnabled: true,
    popupTemplate: allFieldsPopupTemplate('Bus Stop'),
    legendEnabled: true,
    renderer: new SimpleRenderer({
      symbol: new SimpleMarkerSymbol({
        style: 'circle',
        color: '#FBBF24',
        size: 11,
        outline: { color: '#ffffff', width: 2 },
      }),
    }),
  });
}

function createBusRoutesLayer(geojson: Record<string, unknown>): GeoJSONLayer {
  const url = geoJsonBlobUrl(geojson);
  return new GeoJSONLayer({
    id: 'bus-routes',
    title: 'Bus Routes',
    url,
    outFields: ['*'],
    popupEnabled: true,
    popupTemplate: allFieldsPopupTemplate('Bus Route'),
    legendEnabled: true,
    renderer: new SimpleRenderer({
      symbol: new SimpleLineSymbol({
        color: '#22D3EE',
        width: 5,
        cap: 'round',
        join: 'round',
      }),
    }),
  });
}

/**
 * Loads bus stops/routes via the backend (server-side ArcGIS token + proxy).
 * Avoids direct FeatureServer access from the browser, which fails without auth.
 */
export async function loadFeatureLayers(): Promise<{
  busStops: GeoJSONLayer | null;
  busRoutes: GeoJSONLayer | null;
  errors: string[];
}> {
  const errors: string[] = [];
  let busStops: GeoJSONLayer | null = null;
  let busRoutes: GeoJSONLayer | null = null;

  const [stopsResult, routesResult] = await Promise.allSettled([
    fetchBuslaneGeoJSON('/api/arcgis/buslane/stops'),
    fetchBuslaneGeoJSON('/api/arcgis/buslane/routes'),
  ]);

  if (stopsResult.status === 'fulfilled') {
    busStops = createBusStopsLayer(stopsResult.value);
    try {
      await busStops.load();
      busStops.popupTemplate = busStops.createPopupTemplate();
    } catch (err) {
      errors.push(`Bus Stops: ${reasonMessage(err)}`);
      busStops = null;
    }
  } else {
    errors.push(`Bus Stops: ${reasonMessage(stopsResult.reason)}`);
  }

  if (routesResult.status === 'fulfilled') {
    busRoutes = createBusRoutesLayer(routesResult.value);
    try {
      await busRoutes.load();
      busRoutes.popupTemplate = busRoutes.createPopupTemplate();
    } catch (err) {
      errors.push(`Bus Routes: ${reasonMessage(err)}`);
      busRoutes = null;
    }
  } else {
    errors.push(`Bus Routes: ${reasonMessage(routesResult.reason)}`);
  }

  return { busStops, busRoutes, errors };
}

function reasonMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
