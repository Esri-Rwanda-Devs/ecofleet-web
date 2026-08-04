/** ArcGIS portal & web map (Kigali BTS operations map) */
export const ARCGIS_PORTAL_URL = 'https://esrirw.rw/portal';
export const ARCGIS_WEBMAP_ID = '9afd9a6957304bbb8875e9ffe89e30d4';

/**
 * Bus lanes + stops feature service (Esri Rwanda).
 * Layer 0 = Bus_Stops_Kigali (points)
 * Layer 1 = Bus_Line_Kigali  (polylines) — filter with definitionExpression active = 1
 */
export const BUS_STOPS_LAYER_URL =
  'https://esrirw.rw/server/rest/services/Bus_Lanes_BTS/FeatureServer/0';
export const BUS_ROUTES_LAYER_URL =
  'https://esrirw.rw/server/rest/services/Bus_Lanes_BTS/FeatureServer/1';
/** Only draw routes marked active in the geodatabase. */
export const BUS_ROUTES_DEFINITION_EXPRESSION = 'active = 1';

/**
 * Cartographic bus-line layer (Bus_Line_Kigali_export) drawn beneath the
 * operational layers as background context — the blue lines on the map.
 *
 * This is layer 1 of Bus_Lanes_BTS, the same service the operational routes
 * layer reads. The previous `Bus_Line_Kigali_for_Map_visual` service no longer
 * exists on the portal (404, even with a valid token), which left the map with
 * no background lines at all.
 */
export const BUS_LINE_VISUAL_LAYER_URL =
  'https://esrirw.rw/server/rest/services/Hosted/Bus_Lanes_BTS/FeatureServer/1';

/** Satellite imagery with labels — visible over Rwanda */
export const SATELLITE_BASEMAP_ID = 'hybrid';

export const KIGALI_CENTER = { longitude: 30.088, latitude: -1.946 } as const;
