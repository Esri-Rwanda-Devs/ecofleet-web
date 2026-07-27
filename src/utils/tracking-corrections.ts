import type { BusStop, StopEta, TripTrackingState } from '../types';

/** Radius within which the bus counts as having visited a stop. */
export const STOP_VISIT_RADIUS_M = 40;
/** Assumed approach speed for the client-side estimate when the bus is idle. */
const APPROACH_SPEED_KMH = 25;

/** Bare UUID compare — API may return `{GUID}` or plain UUID. */
export function bareId(id: string | null | undefined): string {
  return (id ?? '').replace(/[{}]/g, '').toLowerCase();
}

export function sameStopId(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = bareId(a);
  const y = bareId(b);
  return Boolean(x) && x === y;
}

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

/** Drop duplicate sequence slots and consecutive same physical stop (origin/dest doubles). */
export function dedupeRouteStops(stops: BusStop[]): BusStop[] {
  const byOrder = new Set<number>();
  const out: BusStop[] = [];
  for (const s of [...stops].sort((a, b) => a.sequence_order - b.sequence_order)) {
    if (byOrder.has(s.sequence_order)) continue;
    byOrder.add(s.sequence_order);
    const prev = out[out.length - 1];
    if (prev && sameStopId(prev.id, s.id)) continue;
    // Same named stop within ~25 m of the previous entry (GDB sometimes lists origin twice).
    if (
      prev &&
      prev.name.trim().toLowerCase() === s.name.trim().toLowerCase() &&
      haversineMeters(prev.latitude, prev.longitude, s.latitude, s.longitude) < 25
    ) {
      continue;
    }
    out.push(s);
  }
  return out;
}

/** One entry per stop in the live timeline — keeps the richer / nearer ETA. */
export function dedupeStopEtas(etas: StopEta[]): StopEta[] {
  const byId = new Map<string, StopEta>();
  const order: string[] = [];
  for (const eta of [...etas].sort((a, b) => a.sequence_order - b.sequence_order)) {
    const key = bareId(eta.stop_id) || `${eta.sequence_order}:${eta.stop_name}`;
    const prev = byId.get(key);
    if (!prev) {
      byId.set(key, eta);
      order.push(key);
      continue;
    }
    // Prefer upcoming over passed; otherwise prefer the nearer ETA.
    const prevPassed = prev.status === 'passed';
    const nextPassed = eta.status === 'passed';
    if (prevPassed && !nextPassed) {
      byId.set(key, eta);
      continue;
    }
    if (!prevPassed && nextPassed) continue;
    if (eta.remaining_distance_meters < prev.remaining_distance_meters) {
      byId.set(key, eta);
    }
  }
  return order.map((k) => byId.get(k)!).sort((a, b) => a.sequence_order - b.sequence_order);
}

/** Record the stops this bus has genuinely been near (mutates `visited`). */
export function updateVisitedStops(
  trip: TripTrackingState,
  stops: BusStop[],
  visited: Set<string>
): void {
  for (const stop of stops) {
    const already = [...visited].some((id) => sameStopId(id, stop.id));
    if (
      !already &&
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
 *
 * Never duplicates the origin: match by bare UUID (braced vs plain) or by
 * name + sequence when IDs differ across APIs.
 */
export function correctTrackingForOrigin(
  trip: TripTrackingState,
  stops: BusStop[] | undefined,
  visited: Set<string>
): TripTrackingState {
  if (!stops || stops.length === 0) return trip;

  const ordered = dedupeRouteStops(stops);
  const origin = ordered[0];
  if (!origin) return trip;

  const visitedOrigin = [...visited].some((id) => sameStopId(id, origin.id));
  if (visitedOrigin) return { ...trip, stop_etas: dedupeStopEtas(trip.stop_etas) };

  // Backend already past the origin — trust its next_stop, don't re-inject Kimironko.
  if (
    (trip.next_stop_sequence != null && trip.next_stop_sequence > origin.sequence_order) ||
    (trip.current_stop_index != null && trip.current_stop_index >= origin.sequence_order)
  ) {
    return { ...trip, stop_etas: dedupeStopEtas(trip.stop_etas) };
  }

  const etas = dedupeStopEtas(trip.stop_etas);
  const originEta = etas.find(
    (s) =>
      sameStopId(s.stop_id, origin.id) ||
      (s.stop_name.trim().toLowerCase() === origin.name.trim().toLowerCase() &&
        Math.abs(s.sequence_order - origin.sequence_order) <= 1)
  );
  if (originEta) {
    if (originEta.status === 'passed') {
      return { ...trip, stop_etas: etas };
    }
    return {
      ...trip,
      stop_etas: etas,
      next_stop_name: trip.next_stop_name || origin.name,
    };
  }

  const distM = haversineMeters(
    trip.latitude,
    trip.longitude,
    origin.latitude,
    origin.longitude
  );
  // Already near/past origin geometrically — mark visited and keep backend next stop.
  if (distM <= STOP_VISIT_RADIUS_M) {
    visited.add(origin.id);
    return { ...trip, stop_etas: etas };
  }

  const speedKmh = trip.speed_kmh >= 4 ? trip.speed_kmh : APPROACH_SPEED_KMH;
  const seconds = Math.round((distM / 1000 / speedKmh) * 3600);

  const injected: StopEta = {
    stop_id: origin.id,
    stop_name: origin.name,
    sequence_order: origin.sequence_order,
    status: 'upcoming',
    eta: '',
    remaining_distance_meters: Math.round(distM),
    remaining_duration_seconds: seconds,
  };

  return {
    ...trip,
    current_stop_name: undefined,
    next_stop_name: origin.name,
    stop_etas: dedupeStopEtas([
      injected,
      ...etas.map((s) => ({
        ...s,
        eta: '',
        remaining_distance_meters: s.remaining_distance_meters + Math.round(distM),
        remaining_duration_seconds: s.remaining_duration_seconds + seconds,
      })),
    ]),
  };
}
