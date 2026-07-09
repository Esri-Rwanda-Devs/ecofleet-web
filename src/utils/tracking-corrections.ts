import type { BusStop, StopEta, TripTrackingState } from '../types';

/** Radius within which the bus counts as having visited a stop. */
export const STOP_VISIT_RADIUS_M = 40;
/** Assumed approach speed for the client-side estimate when the bus is idle. */
const APPROACH_SPEED_KMH = 25;

/** Straight-line distance in metres between two coordinates. */
export function haversineMeters(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Record the stops this bus has genuinely been near (mutates `visited`). */
export function updateVisitedStops(
  trip: TripTrackingState,
  stops: BusStop[],
  visited: Set<string>
): void {
  for (const stop of stops) {
    if (
      !visited.has(stop.id) &&
      haversineMeters(trip.latitude, trip.longitude, stop.latitude, stop.longitude) <=
        STOP_VISIT_RADIUS_M
    ) {
      visited.add(stop.id);
    }
  }
}

/**
 * The backend snaps the bus onto the route polyline, so the origin (at ~0 m
 * along the path) reads as "passed" the moment a trip starts — wherever the
 * bus actually is. Mirror of the mobile fix: until the bus has genuinely been
 * near the origin, re-insert it as the next stop with a live client-side
 * estimate, and correct the current/next stop labels.
 */
export function correctTrackingForOrigin(
  trip: TripTrackingState,
  stops: BusStop[] | undefined,
  visited: Set<string>
): TripTrackingState {
  if (!stops || stops.length === 0) return trip;

  const origin = [...stops].sort((a, b) => a.sequence_order - b.sequence_order)[0];
  if (visited.has(origin.id)) return trip;
  if (trip.stop_etas.some((s) => s.stop_id === origin.id)) return trip;

  const distM = haversineMeters(
    trip.latitude,
    trip.longitude,
    origin.latitude,
    origin.longitude
  );
  const speedKmh = trip.speed_kmh >= 4 ? trip.speed_kmh : APPROACH_SPEED_KMH;
  const seconds = Math.round((distM / 1000 / speedKmh) * 3600);

  const originEta: StopEta = {
    stop_id: origin.id,
    stop_name: origin.name,
    sequence_order: origin.sequence_order,
    eta: '',
    remaining_distance_meters: Math.round(distM),
    remaining_duration_seconds: seconds,
  };

  return {
    ...trip,
    // Renders the "En route" placeholder while still heading to the origin.
    current_stop_name: undefined,
    next_stop_name: origin.name,
    stop_etas: [originEta, ...trip.stop_etas],
  };
}
