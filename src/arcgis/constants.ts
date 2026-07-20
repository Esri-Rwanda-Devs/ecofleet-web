/** ArcGIS portal & web map (Kigali BTS operations map) */
export const ARCGIS_PORTAL_URL = 'https://esrirw.rw/portal';
export const ARCGIS_WEBMAP_ID = '9afd9a6957304bbb8875e9ffe89e30d4';

/**
 * Bus lanes + stops feature service (Esri Rwanda).
 * Layer 0 = Bus_Stops_Kigali (points)
 * Layer 1 = Bus_Line_Kigali  (polylines)
 */
export const BUS_STOPS_LAYER_URL =
  'https://esrirw.rw/server/rest/services/Bus_Lanes_BTS/FeatureServer/0';
export const BUS_ROUTES_LAYER_URL =
  'https://esrirw.rw/server/rest/services/Bus_Lanes_BTS/FeatureServer/1';

/** Satellite imagery with labels — visible over Rwanda */
export const SATELLITE_BASEMAP_ID = 'hybrid';

export const KIGALI_CENTER = { longitude: 30.088, latitude: -1.946 } as const;
