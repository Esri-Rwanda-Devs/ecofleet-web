import { useEffect, useState } from 'react';
import { TripTrackingState } from '../types';
import { GpsIcon } from './Icons';

/**
 * Shared status language for the ops dashboard — one source of truth for the
 * status badge, delay chip and GPS freshness chip used by the fleet list and
 * the trip detail panel. Status is never encoded by colour alone: every chip
 * pairs its colour with a label (and the badge adds a dot).
 */

export type TripStatusKind = 'onroute' | 'deadhead' | 'gpslost';

export function tripStatusKind(trip: TripTrackingState): TripStatusKind {
  if (!trip.gps_connected) return 'gpslost';
  if (trip.in_service === false) return 'deadhead';
  return 'onroute';
}

const STATUS_LABEL: Record<TripStatusKind, string> = {
  onroute: 'On route',
  deadhead: 'Heading to start',
  gpslost: 'GPS lost',
};

const STATUS_CLASS: Record<TripStatusKind, string> = {
  onroute: 'bg-st-onroute-bg text-success',
  deadhead: 'bg-st-deadhead-bg text-ink-soft',
  gpslost: 'bg-st-gpslost-bg text-warning',
};

const STATUS_DOT: Record<TripStatusKind, string> = {
  onroute: 'bg-st-onroute',
  deadhead: 'bg-st-deadhead',
  gpslost: 'bg-st-gpslost',
};

export function StatusBadge({ kind }: { kind: TripStatusKind }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 whitespace-normal rounded-full py-0.5 pl-2 pr-2.5 text-[0.8125rem] font-semibold leading-tight ${STATUS_CLASS[kind]}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[kind]}`}
        aria-hidden="true"
      />
      {STATUS_LABEL[kind]}
    </span>
  );
}

/* ── Delay ──────────────────────────────────────────────────────────── */

/** Beyond this, a "delay" is almost certainly stale data, not a live fact. */
const STALE_DELAY_SECONDS = 6 * 3600;

export type DelayTone = 'late' | 'early' | 'ontime' | 'pending' | 'stale';

export interface DelayView {
  tone: DelayTone;
  label: string;
  /** Full detail for a title tooltip (set for clamped/stale values). */
  title?: string;
}

const DELAY_CLASS: Record<DelayTone, string> = {
  late: 'bg-danger-bg text-danger',
  early: 'bg-st-early-bg text-st-early',
  ontime: 'bg-success-bg text-success',
  pending: 'bg-warning-bg text-warning',
  stale: 'cursor-help bg-warning-bg text-warning',
};

function formatDelayMinutes(seconds: number): string {
  const mins = Math.round(Math.abs(seconds) / 60);
  if (mins < 60) return `${mins}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Delay chip content for a whole trip (fleet list + detail panel). */
export function tripDelayView(trip: TripTrackingState): DelayView {
  if (trip.in_service === false) {
    return { tone: 'pending', label: 'not started' };
  }
  const seconds = trip.delay_seconds ?? 0;
  return delayViewFromSeconds(seconds);
}

/** Delay chip content from a raw signed offset vs the plan. */
export function delayViewFromSeconds(seconds: number): DelayView {
  const mins = Math.round(Math.abs(seconds) / 60);
  if (mins < 1) return { tone: 'ontime', label: '±0' };
  if (Math.abs(seconds) >= STALE_DELAY_SECONDS) {
    return {
      tone: 'stale',
      label: 'check data',
      title: `${seconds > 0 ? '+' : '−'}${formatDelayMinutes(seconds)} vs plan — likely a stale schedule, not a live delay`,
    };
  }
  return seconds > 0
    ? { tone: 'late', label: `+${formatDelayMinutes(seconds)} late` }
    : { tone: 'early', label: `−${formatDelayMinutes(seconds)} early` };
}

export function DelayChip({ view }: { view: DelayView }) {
  return (
    <span
      className={`num inline-flex max-w-full shrink-0 items-center gap-1 whitespace-normal rounded-full px-2 py-0.5 text-[0.8125rem] font-semibold leading-tight ${DELAY_CLASS[view.tone]}`}
      title={view.title}
    >
      {view.label}
    </span>
  );
}

/** Compact per-stop delay chip; renders nothing within ±1 min of plan. */
export function StopDelayChip({ seconds }: { seconds?: number }) {
  if (seconds == null) return null;
  const view = delayViewFromSeconds(seconds);
  if (view.tone === 'ontime') return null;
  return <DelayChip view={view} />;
}

/* ── GPS freshness ──────────────────────────────────────────────────── */

function formatAge(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

const FRESHNESS_CLASS: Record<'ok' | 'warn' | 'lost', string> = {
  ok: 'bg-success-bg text-success',
  warn: 'bg-warning-bg text-warning',
  lost: 'bg-st-gpslost-bg text-warning',
};

/**
 * "GPS · 2s ago" — how fresh the last ping is, instead of a binary
 * Live/Offline flag. Ticks on its own so the age stays honest even when the
 * feed goes quiet.
 */
export function FreshnessChip({
  connected,
  lastUpdated,
}: {
  connected: boolean;
  lastUpdated: string;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const updated = new Date(lastUpdated).getTime();
  const age = Number.isNaN(updated) ? null : Date.now() - updated;
  const ageLabel = age == null ? null : `${formatAge(age)} ago`;

  const tone = !connected ? 'lost' : age != null && age > 30_000 ? 'warn' : 'ok';
  const label = !connected ? 'GPS lost' : 'GPS';

  return (
    <span
      className={`num inline-flex max-w-full shrink-0 items-center gap-1 whitespace-normal rounded-full px-2 py-0.5 text-[0.75rem] font-semibold leading-tight ${FRESHNESS_CLASS[tone]}`}
    >
      <GpsIcon size={11} className="shrink-0" />
      <span className="min-w-0 break-words">
        {label}
        {ageLabel && <span className="font-semibold opacity-85"> · {ageLabel}</span>}
      </span>
    </span>
  );
}
