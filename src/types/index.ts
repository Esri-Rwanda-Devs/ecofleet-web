export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'dispatcher' | 'driver';
}

export interface Route {
  id: string;
  name: string;
  description?: string;
  origin_name: string;
  destination_name: string;
  origin_longitude: number;
  origin_latitude: number;
  destination_longitude: number;
  destination_latitude: number;
  total_distance_meters?: number;
    total_duration_seconds?: number;
    route_polyline?: string | { type: string; coordinates: number[][] } | { latitude: number; longitude: number }[];
  arcgis_object_id?: number;
}

export interface BusStop {
  id: string;
  name: string;
  sequence_order: number;
  longitude: number;
  latitude: number;
  distance_from_previous_meters?: number;
  duration_from_previous_seconds?: number;
  scheduled_arrival_offset_seconds: number;
}

export interface StopEta {
  stop_id: string;
  stop_name: string;
  sequence_order: number;
  eta: string;
  /** How late (+) / early (−) the bus will be at this stop vs the plan. */
  delay_seconds?: number;
  remaining_distance_meters: number;
  remaining_duration_seconds: number;
  leg_distance_meters?: number;
  leg_duration_seconds?: number;
  leg_eta?: string;
  segment_speed_kmh?: number;
}

/** One bus heading to a station, from GET /tracking/station/{stop_id}/arrivals. */
export interface StationArrival {
  trip_id: string;
  plate_number: string;
  route_name: string;
  eta_seconds: number;
  delay_minutes: number;
  current_stop_sequence: number;
  /** approaching | at_station | departed */
  status: string;
}

export interface TripTrackingState {
  trip_id: string;
  driver_id: string;
  driver_name: string;
  vehicle_plate: string;
  route_name: string;
  status: string;
  longitude: number;
  latitude: number;
  speed_kmh: number;
  heading: number;
  current_stop_index: number;
  /** False while the bus is deadheading (hasn't reached the origin stop). */
  in_service?: boolean;
  current_stop_name?: string;
  next_stop_name?: string;
  remaining_distance_meters: number;
  remaining_duration_seconds: number;
  eta: string;
  completion_percentage: number;
  delay_seconds: number;
  is_delayed: boolean;
  is_early: boolean;
  delay_status?: string;
  early_status?: string;
  gps_connected: boolean;
  stop_etas: StopEta[];
  last_updated: string;
}

export interface BuslaneConfig {
  busStopsUrl: string;
  busRoutesUrl: string;
  hasToken: boolean;
  lineNameField: string;
  stopRouteField: string;
  lineFields: string[];
  stopFields: string[];
}

export interface ArcGisConfig {
  portalUrl: string;
  webmapId: string;
  routeUrl: string;
  buslane?: BuslaneConfig | null;
  center: { longitude: number; latitude: number };
  osm?: boolean;
  basemap?: string;
  arcgisToken?: string | null;
}

export interface RouteCalculation {
  summary: {
    total_distance_meters: number;
    total_duration_seconds: number;
    estimated_arrival: string;
  };
  directions: { text: string; length: number; time: number }[];
  polyline: number[][][];
  segment_analytics: {
    from: string;
    to: string;
    distance_meters: number;
    duration_seconds: number;
    eta: string;
  }[];
}
