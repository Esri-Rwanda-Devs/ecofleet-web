import { useEffect, useMemo, useRef, useState } from "react";
import { BusStop, StopEta, TripTrackingState } from "../types";
import { BusIcon, CheckIcon, ChevronDownIcon, CloseIcon } from "./Icons";
import { FreshnessChip, delayViewFromSeconds } from "./StatusChips";
import { formatRouteName, formatStopName } from "../utils/display-names";
import { dedupeStopEtas } from "../utils/tracking-corrections";

interface TripDetailPanelProps {
  trip: TripTrackingState;
  /** Full ordered stop list of the trip's route, when loaded — enables the
   *  "stops passed" section and stable stop numbering. */
  routeStops?: BusStop[];
  /** Click a stop number (or passed stop) → highlight + zoom that stop on the map. */
  onStopNumberClick?: (stop: {
    id: string;
    name: string;
    longitude: number;
    latitude: number;
  }) => void;
  onClose: () => void;
}

function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}

function formatStopDelay(seconds: number | undefined | null): {
  label: string;
  tone: string;
} {
  if (seconds == null) return { label: "—", tone: "text-ink" };
  const mins = Math.round(seconds / 60);
  const tone =
    mins > 0
      ? "text-danger"
      : mins < 0
        ? "text-st-early"
        : "text-success";
  // Minutes vs expected arrival: +1, +2, −1, ±0
  if (mins === 0) return { label: "±0", tone };
  return { label: mins > 0 ? `+${mins}` : `${mins}`, tone };
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Arriving";
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Live estimated arrival wall-clock (ms), countdown-adjusted between GPS polls. */
function liveArrivalMs(
  s: StopEta,
  nowMs: number,
  lastUpdatedIso?: string,
): number {
  const rem = Math.max(0, s.remaining_duration_seconds ?? 0);
  const updated = lastUpdatedIso ? new Date(lastUpdatedIso).getTime() : NaN;
  if (!Number.isNaN(updated)) {
    const ageSec = Math.max(0, (nowMs - updated) / 1000);
    // Subtract elapsed since last GPS so Arrival holds when on time;
    // when the next GPS reports a longer remaining, Arrival slips → delay +.
    return nowMs + Math.max(0, rem - ageSec) * 1000;
  }
  if (s.estimated_arrival_at) {
    const t = new Date(s.estimated_arrival_at).getTime();
    if (!Number.isNaN(t)) return Math.max(t, nowMs);
  }
  return nowMs + rem * 1000;
}

function formatArrivalMs(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clockIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Live destination ETA: travel remaining to dest + any positive stop delay
 * (e.g. +1 min late at KIE B adds 1 min to Dest. ETA).
 */
function liveDestMetrics(
  trip: TripTrackingState,
  upcoming: StopEta[],
  nextStop: StopEta | null,
): { etaSeconds: number; delaySeconds: number; distanceMeters: number } {
  const dest = upcoming.length ? upcoming[upcoming.length - 1] : null;
  const travel =
    dest?.remaining_duration_seconds ?? trip.remaining_duration_seconds ?? 0;
  const distance =
    dest?.remaining_distance_meters ?? trip.remaining_distance_meters ?? 0;

  // Prefer destination delay; else next-stop delay (current lateness carries forward).
  const candidates = [
    dest?.delay_seconds,
    nextStop?.delay_seconds,
    trip.delay_seconds,
  ].filter((v): v is number => typeof v === "number");
  const delaySeconds = candidates.length
    ? candidates.reduce(
        (best, v) => (Math.abs(v) > Math.abs(best) ? v : best),
        0,
      )
    : 0;

  return {
    // Pure live travel — caller adds positive stop delay on top.
    etaSeconds: Math.max(0, travel),
    delaySeconds,
    distanceMeters: distance,
  };
}

function partitionStopEtas(stops: StopEta[]) {
  const hasStatus = stops.some((s) => s.status);
  if (!hasStatus) {
    const upcoming = stops.filter((s) => s.remaining_distance_meters > 5);
    return { passed: [], upcoming: upcoming.length ? upcoming : stops };
  }
  return {
    passed: stops.filter((s) => s.status === "passed"),
    upcoming: stops.filter((s) => s.status !== "passed"),
  };
}

function resolveNextStop(
  trip: TripTrackingState,
  upcoming: StopEta[],
): StopEta | null {
  if (!upcoming.length) return null;
  if (trip.next_stop_sequence != null) {
    const bySeq = upcoming.find(
      (s) => s.sequence_order === trip.next_stop_sequence,
    );
    if (bySeq) return bySeq;
  }
  if (trip.next_stop_name) {
    const target = formatStopName(trip.next_stop_name).toLowerCase();
    const byName = upcoming.find(
      (s) => formatStopName(s.stop_name).toLowerCase() === target,
    );
    if (byName) return byName;
  }
  return upcoming.find((s) => s.remaining_distance_meters > 5) ?? upcoming[0];
}

/** Uppercase micro-label used across the metric strip. */
const METRIC_LABEL =
  "mb-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted";

export function TripDetailPanel({
  trip,
  routeStops,
  onStopNumberClick,
  onClose,
}: TripDetailPanelProps) {
  const [showPassed, setShowPassed] = useState(false);
  /** Wall-clock tick so Dest. ETA / Arrival clocks stay live every second. */
  const [nowTick, setNowTick] = useState(() => Date.now());
  /**
   * Expected arrival (ms) per stop — frozen on first sight, or from schedule.
   * Delay = live Arrival − this expected time → +1, +2 as Arrival slips.
   */
  const expectedArrivalRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // New trip → reset expected baselines so delay starts at ±0.
  useEffect(() => {
    expectedArrivalRef.current = new Map();
  }, [trip.trip_id]);

  const coordsById = useMemo(() => {
    const map = new Map<string, BusStop>();
    routeStops?.forEach((s) => map.set(s.id, s));
    return map;
  }, [routeStops]);

  /** Live arrival vs expected → delay seconds (+ late / − early) and frozen expected ms. */
  const delayVsExpected = (
    s: StopEta,
    liveMs: number,
  ): { delaySec: number; expectedMs: number } => {
    const sched = s.scheduled_arrival_at
      ? new Date(s.scheduled_arrival_at).getTime()
      : NaN;
    if (!Number.isNaN(sched)) {
      expectedArrivalRef.current.set(s.stop_id, sched);
      return {
        delaySec: Math.round((liveMs - sched) / 1000),
        expectedMs: sched,
      };
    }
    // Freeze first live Arrival as expected (e.g. 18:22). Later 18:23 → +1.
    if (!expectedArrivalRef.current.has(s.stop_id)) {
      expectedArrivalRef.current.set(s.stop_id, liveMs);
    }
    const expected = expectedArrivalRef.current.get(s.stop_id)!;
    return {
      delaySec: Math.round((liveMs - expected) / 1000),
      expectedMs: expected,
    };
  };

  const focusStop = (id: string, name: string) => {
    if (!onStopNumberClick) return;
    const hit = coordsById.get(id);
    if (
      !hit ||
      !Number.isFinite(hit.longitude) ||
      !Number.isFinite(hit.latitude)
    )
      return;
    onStopNumberClick({
      id: hit.id,
      name: hit.name || name,
      longitude: hit.longitude,
      latitude: hit.latitude,
    });
  };

  // Stops already behind the bus — prefer live `status: passed` from tracking.
  const { passed: passedFromEta, upcoming: upcomingStops } = useMemo(() => {
    const cleaned = dedupeStopEtas(trip.stop_etas);
    return partitionStopEtas(cleaned);
  }, [trip.stop_etas]);

  const passedStops = useMemo(() => {
    if (passedFromEta.length) {
      return passedFromEta
        .map((s) => coordsById.get(s.stop_id))
        .filter((s): s is BusStop => Boolean(s));
    }
    if (!routeStops?.length || !upcomingStops.length) return [];
    const upcomingIds = new Set(upcomingStops.map((s) => s.stop_id));
    const ordered = [...routeStops].sort(
      (a, b) => a.sequence_order - b.sequence_order,
    );
    const firstUpcoming = ordered.find((s) => upcomingIds.has(s.id));
    if (!firstUpcoming) return [];
    return ordered.filter(
      (s) =>
        s.sequence_order < firstUpcoming.sequence_order &&
        !upcomingIds.has(s.id),
    );
  }, [passedFromEta, routeStops, upcomingStops, coordsById]);

  // 1-based stop numbers that match the numbered labels on the map. Prefer
  // the route's own stop order; fall back to position in the live list.
  const stopNumber = useMemo(() => {
    const byId = new Map<string, number>();
    if (routeStops?.length) {
      [...routeStops]
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .forEach((s, i) => byId.set(s.id, i + 1));
    }
    return (s: StopEta, i: number) =>
      byId.get(s.stop_id) ?? passedStops.length + i + 1;
  }, [routeStops, passedStops.length]);

  const route = formatRouteName(trip.route_name);
  const stops = upcomingStops;
  const nextStop = resolveNextStop(trip, upcomingStops);
  const passedCount = Math.max(passedStops.length, passedFromEta.length);
  const totalStops =
    routeStops && routeStops.length > 0
      ? routeStops.length
      : Math.max(1, passedCount + upcomingStops.length);
  const stale = !trip.gps_connected;
  const speedDisplay = trip.gps_connected ? trip.speed_kmh.toFixed(0) : "—";

  void nowTick; // re-render clocks each second

  const nextLiveMs = nextStop
    ? liveArrivalMs(nextStop, nowTick, trip.last_updated)
    : null;
  const nextDelaySec =
    nextStop && nextLiveMs != null
      ? delayVsExpected(nextStop, nextLiveMs).delaySec
      : 0;

  const destLive = liveDestMetrics(trip, upcomingStops, nextStop);
  const destStop = upcomingStops.length
    ? upcomingStops[upcomingStops.length - 1]
    : null;
  const destDelaySec = destStop
    ? delayVsExpected(
        destStop,
        liveArrivalMs(destStop, nowTick, trip.last_updated),
      ).delaySec
    : destLive.delaySeconds;
  const journeyDelaySec =
    Math.abs(destDelaySec) >= Math.abs(nextDelaySec)
      ? destDelaySec
      : nextDelaySec;
  // Live Dest. ETA = travel remaining + current lateness (grows as delay grows).
  const destEtaSeconds = destLive.etaSeconds + Math.max(0, journeyDelaySec);
  const delayView =
    Math.abs(journeyDelaySec) >= 60
      ? delayViewFromSeconds(journeyDelaySec)
      : null;
  const delayTone =
    delayView?.tone === "late" || delayView?.tone === "critical"
      ? "text-danger"
      : delayView?.tone === "early"
        ? "text-st-early"
        : delayView?.tone === "stale"
          ? "text-warning"
          : "text-success";
  const metricValue = `num break-words text-[1.125rem] font-semibold leading-tight tracking-tight ${
    stale ? "text-muted" : "text-ink"
  }`;

  return (
    <aside
      className="absolute z-20 flex min-h-0 flex-col sheet animate-drawer-in
        max-md:inset-0 max-md:z-[25] max-md:rounded-none
        md:inset-y-0 md:right-0 md:w-[400px] md:rounded-none md:border-b-0 md:border-r-0 md:border-t-0"
      aria-label={`Trip details — ${trip.vehicle_plate}`}
    >
      <div className="sheet-handle md:hidden" aria-hidden="true" />
      <header className="shrink-0 border-b border-line/40 px-5 pb-4 pt-3 md:pt-5">
        <div className="flex items-center gap-2.5">
          <span className="num text-[1.5rem] font-bold tracking-tight text-primary">
            {trip.vehicle_plate}
          </span>
          <FreshnessChip
            connected={trip.gps_connected}
            lastUpdated={trip.last_updated}
          />
          <button
            className="pressable ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-bg text-muted hover:bg-line/80 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={onClose}
            aria-label="Close trip details"
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-[0.9375rem] font-semibold tracking-wide text-ink">
          {route.name}
          {route.code && (
            <span className="num ml-1.5 rounded-md bg-primary-soft px-1.5 py-px text-[0.75rem] font-bold tracking-wide text-primary">
              {route.code}
            </span>
          )}
        </p>
      </header>

      <div className="mx-4 mt-4 grid shrink-0 grid-cols-3 gap-2">
        <div className="mint-card min-w-0 overflow-visible">
          <label className={METRIC_LABEL}>Speed</label>
          <b className={metricValue}>
            {speedDisplay}{" "}
            <small className="text-[0.75rem] font-medium text-muted">
              km/h
            </small>
          </b>
        </div>
        <div className="mint-card min-w-0 overflow-visible">
          <label className={METRIC_LABEL}>Dest. ETA</label>
          <b className={metricValue}>{formatCountdown(destEtaSeconds)}</b>
          <span className="num mt-0.5 block break-words text-[0.75rem] text-muted">
            {clockIn(destEtaSeconds)} ·{" "}
            {formatDistance(destLive.distanceMeters)}
          </span>
          {delayView && delayView.tone !== "ontime" && (
            <span
              className={`num mt-1 block text-[0.75rem] font-bold ${delayTone}`}
            >
              {delayView.label}
            </span>
          )}
        </div>
        <div className="mint-card min-w-0 overflow-visible">
          <label className={METRIC_LABEL}>Next stop</label>
          <b className={metricValue}>
            {nextStop
              ? formatCountdown(nextStop.remaining_duration_seconds)
              : "—"}
          </b>
          <span
            className="mt-0.5 block break-words text-[0.75rem] leading-snug text-muted"
            title={
              nextStop
                ? formatStopName(nextStop.stop_name)
                : trip.next_stop_name
                  ? formatStopName(trip.next_stop_name)
                  : undefined
            }
          >
            {nextStop
              ? formatStopName(nextStop.stop_name)
              : trip.next_stop_name
                ? formatStopName(trip.next_stop_name)
                : "Arriving"}
          </span>
        </div>
      </div>

      <div className="shrink-0 px-5 pb-1.5 pt-5 text-[0.75rem] font-semibold uppercase tracking-[0.07em] text-muted">
        Route · {totalStops} stops
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5">
        {stops.length === 0 ? (
          <p className="mt-3 text-body text-muted">
            No upcoming stops — the bus is arriving at its destination.
          </p>
        ) : (
          <ol className="relative mt-2 list-none before:absolute before:bottom-4 before:left-[11px] before:top-3 before:w-px before:bg-line/70 before:content-['']">
            {passedCount > 0 && (
              <li className="relative pb-5 pl-10">
                <span
                  className="absolute left-0 top-0.5 z-[1] flex h-6 w-6 items-center justify-center rounded-full border border-line bg-muted-bg text-success"
                  aria-hidden="true"
                >
                  <CheckIcon size={11} />
                </span>
                <button
                  className="pressable flex items-center gap-1.5 py-0.5 text-[0.875rem] font-semibold text-muted hover:text-ink focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  onClick={() => setShowPassed((v) => !v)}
                  aria-expanded={showPassed}
                >
                  {passedCount} {passedCount === 1 ? "stop" : "stops"} passed
                  <ChevronDownIcon
                    size={13}
                    className={`transition-transform duration-200 ease-smooth ${showPassed ? "rotate-180" : ""}`}
                  />
                </button>
                {showPassed && (
                  <ul className="mt-2 list-none space-y-1">
                    {(passedStops.length
                      ? passedStops.map((s) => ({
                          id: s.id,
                          name: s.name,
                          coords: s,
                        }))
                      : passedFromEta.map((s) => ({
                          id: s.stop_id,
                          name: s.stop_name,
                          coords: coordsById.get(s.stop_id),
                        }))
                    ).map((s, pi) => (
                      <li key={s.id} className="text-[0.875rem] text-muted">
                        {onStopNumberClick && s.coords ? (
                          <button
                            type="button"
                            className="pressable inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-muted-bg hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            onClick={() =>
                              onStopNumberClick({
                                id: s.coords!.id,
                                name: s.coords!.name,
                                longitude: s.coords!.longitude,
                                latitude: s.coords!.latitude,
                              })
                            }
                            aria-label={`Show stop ${pi + 1} on map: ${formatStopName(s.name)}`}
                          >
                            <span className="num inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-line-light text-[0.6875rem] font-bold text-ink-soft">
                              {pi + 1}
                            </span>
                            {formatStopName(s.name)}
                          </button>
                        ) : (
                          formatStopName(s.name)
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}

            <li className="relative pb-5 pl-10">
              <span
                className="absolute left-0 top-0 z-[1] flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-card"
                aria-hidden="true"
              >
                <BusIcon size={12} />
              </span>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-white">
                <span className="num text-[0.875rem] font-bold tracking-wide">
                  {trip.vehicle_plate}
                </span>
                <span className="num text-[0.8125rem] font-medium text-white/70">
                  {speedDisplay} km/h
                </span>
              </div>
            </li>

            {stops.map((s, i) => {
              const isNext = i === 0;
              const isLast = i === stops.length - 1;
              const prevName = isNext
                ? "Bus"
                : formatStopName(stops[i - 1]?.stop_name) || "Previous stop";
              const hereName = formatStopName(s.stop_name);

              const legMeters =
                s.leg_distance_meters ??
                (isNext ? s.remaining_distance_meters : undefined);
              const legSeconds =
                s.leg_duration_seconds ??
                (isNext
                  ? s.remaining_duration_seconds
                  : legMeters != null && s.segment_speed_kmh
                    ? Math.round(
                        (legMeters / 1000 / s.segment_speed_kmh) * 3600,
                      )
                    : null);
              // Arrival = live estimate. Scheduled = initial/expected before delay.
              const arrivalMs = liveArrivalMs(s, nowTick, trip.last_updated);
              const { delaySec, expectedMs } = delayVsExpected(s, arrivalMs);
              const delay = formatStopDelay(delaySec);

              const nodeTone = isNext
                ? "rounded-full border-primary bg-primary text-white shadow-ring-next"
                : isLast
                  ? "rounded-lg border-accent bg-accent text-white"
                  : "rounded-full border-accent/90 bg-accent text-white";

              const stopBtn = onStopNumberClick ? (
                <button
                  type="button"
                  className={`num absolute left-0 top-2.5 z-[1] flex h-6 w-6 items-center justify-center border text-[0.75rem] font-bold
                    pressable transition-transform duration-200 ease-smooth hover:scale-105
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${nodeTone}`}
                  onClick={() => focusStop(s.stop_id, s.stop_name)}
                  aria-label={`Show stop ${stopNumber(s, i)} on map: ${hereName}`}
                  title="Show on map"
                >
                  {stopNumber(s, i)}
                </button>
              ) : (
                <span
                  className={`num absolute left-0 top-2.5 z-[1] flex h-6 w-6 items-center justify-center border text-[0.75rem] font-bold ${nodeTone}`}
                  aria-hidden="true"
                >
                  {stopNumber(s, i)}
                </span>
              );

              return (
                <li key={s.stop_id} className="relative pb-3.5 pl-10 last:pb-0">
                  {stopBtn}
                  <div
                    className={`relative rounded-2xl px-3.5 py-3 transition-colors duration-200 ${
                      isNext
                        ? "border border-primary/20 bg-primary-soft/40"
                        : "border border-line/40 bg-muted-bg/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`block break-words text-[1rem] leading-snug ${
                          isNext
                            ? "font-bold text-primary"
                            : "font-semibold text-ink"
                        }`}
                      >
                        {hereName}
                      </span>
                      {legMeters != null && (
                        <span className="mt-0.5 block break-words text-[0.8125rem] leading-snug text-muted">
                          from {prevName}
                          <span className="num font-semibold text-ink-soft">
                            {" · "}
                            {formatDistance(legMeters)}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line/40 pt-2.5 sm:grid-cols-4">
                      <div className="min-w-0">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-muted">
                          ETA
                        </p>
                        <p
                          className={`num mt-0.5 text-[0.875rem] font-semibold ${
                            isNext ? "text-primary" : "text-ink"
                          }`}
                        >
                          {legSeconds != null
                            ? formatCountdown(legSeconds)
                            : "—"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.6875rem] font-semibold uppercase  text-muted">
                          Scheduled
                        </p>
                        <p className="num mt-0.5 text-[0.875rem] font-semibold text-ink">
                          {formatArrivalMs(expectedMs)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-muted">
                          Arrival
                        </p>
                        <p className="num mt-0.5 text-[0.875rem] font-semibold text-ink">
                          {formatArrivalMs(arrivalMs)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-muted">
                          Delay
                        </p>
                        <p
                          className={`num mt-0.5 text-[0.875rem] font-semibold ${delay.tone}`}
                        >
                          {delay.label}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
