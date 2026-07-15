import type { TripTrackingState } from '../types';

export interface JourneyTotals {
  distanceMeters: number;
  durationSeconds: number;
}

function deriveTotalFromRemaining(remaining: number, completionPct: number): number {
  const pct = Math.min(99.5, Math.max(0, completionPct));
  const fractionRemaining = 1 - pct / 100;
  if (fractionRemaining <= 0.005) return remaining;
  return remaining / fractionRemaining;
}

export function getJourneyTotals(t: TripTrackingState): JourneyTotals {
  const durationSeconds = Math.round(
    t.segment_totals?.total_duration_seconds ??
      t.total_duration_seconds ??
      deriveTotalFromRemaining(t.remaining_duration_seconds, t.completion_percentage)
  );
  const distanceMeters = Math.round(
    t.segment_totals?.total_distance_meters ??
      deriveTotalFromRemaining(t.remaining_distance_meters, t.completion_percentage)
  );
  return { distanceMeters, durationSeconds };
}

export function formatJourneyDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatJourneyDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
