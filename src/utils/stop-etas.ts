import type { StopEta } from '../types';
import { stopIdsMatch } from './stop-ids';

/** One row per sequence_order — GDB route_stop_sequence can duplicate rows. */
export function dedupeStopEtas(stops: StopEta[]): StopEta[] {
  const byOrder = new Map<number, StopEta>();
  for (const stop of [...stops].sort((a, b) => a.sequence_order - b.sequence_order)) {
    const order = stop.sequence_order;
    if (!order) continue;
    const prev = byOrder.get(order);
    if (!prev) {
      byOrder.set(order, stop);
      continue;
    }
    if (prev.status === 'passed' && stop.status !== 'passed') {
      byOrder.set(order, stop);
      continue;
    }
    if (stop.status === 'passed' && prev.status !== 'passed') continue;
    const prevScore =
      Number(prev.remaining_duration_seconds > 0) + Number(!!prev.leg_distance_meters);
    const nextScore =
      Number(stop.remaining_duration_seconds > 0) + Number(!!stop.leg_distance_meters);
    if (nextScore > prevScore) byOrder.set(order, stop);
  }
  return [...byOrder.values()].sort((a, b) => a.sequence_order - b.sequence_order);
}

export function partitionStopEtas(stops: StopEta[]) {
  const deduped = dedupeStopEtas(stops);
  const hasStatus = deduped.some((s) => s.status);
  if (!hasStatus) {
    const upcoming = deduped.filter((s) => s.remaining_distance_meters > 5);
    return { passed: [] as StopEta[], upcoming: upcoming.length ? upcoming : deduped };
  }
  return {
    passed: deduped.filter((s) => s.status === 'passed'),
    upcoming: deduped.filter((s) => s.status !== 'passed'),
  };
}

/** True when `stop` is the route origin (order 1 or same id as origin). */
export function isOriginStop(
  stop: StopEta,
  origin?: { id: string; sequence_order: number }
): boolean {
  if (!origin) return stop.sequence_order === 1;
  return stop.sequence_order === origin.sequence_order || stopIdsMatch(stop.stop_id, origin.id);
}
