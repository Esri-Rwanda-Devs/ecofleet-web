import Map from '@arcgis/core/Map';
import Basemap from '@arcgis/core/Basemap';
import { SATELLITE_BASEMAP_ID, KIGALI_CENTER } from './constants';

/**
 * Operations map — Esri satellite imagery (same approach as ArcGIS JS CDN WebView maps).
 * Falls back to hybrid if satellite is unavailable.
 */
export async function loadOperationsWebMap(): Promise<Map> {
  const basemapIds = [SATELLITE_BASEMAP_ID, 'satellite', 'hybrid'] as const;

  for (const id of basemapIds) {
    try {
      const basemap = Basemap.fromId(id);
      if (!basemap) continue;
      await basemap.load();
      return new Map({ basemap });
    } catch {
      /* try next basemap id */
    }
  }

  // Last resort — ArcGIS Online default world imagery
  return new Map({ basemap: 'satellite' });
}

export function defaultMapCenter(): [number, number] {
  return [KIGALI_CENTER.longitude, KIGALI_CENTER.latitude];
}

export function defaultMapZoom(): number {
  return 15;
}
