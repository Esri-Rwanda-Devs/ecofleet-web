import { useEffect, useRef, useState } from 'react';
import { BellIcon, CheckIcon, ClockIcon, RouteIcon } from './Icons';

/**
 * One event from the backend's `alerts` socket room. Labels are resolved at
 * receive time (from the live fleet + route lists) so they survive the trip
 * disappearing from the tracking feed moments later.
 */
export interface AlertEvent {
  id: number;
  channel: string;
  at: Date;
  plate?: string;
  routeName?: string;
  extraMinutes?: number;
  reason?: string;
}

const CHANNEL_META: Record<
  string,
  { title: string; icon: 'route' | 'check' | 'clock'; iconClass: string }
> = {
  'trip:started': {
    title: 'Trip started',
    icon: 'route',
    iconClass: 'bg-st-onroute-bg text-success',
  },
  'trip:completed': {
    title: 'Trip completed',
    icon: 'check',
    iconClass: 'bg-success-bg text-success',
  },
  'notifications:delay': {
    title: 'Delay reported',
    icon: 'clock',
    iconClass: 'bg-warning-bg text-warning',
  },
};

function AlertIcon({ kind }: { kind: 'route' | 'check' | 'clock' }) {
  if (kind === 'route') return <RouteIcon size={14} />;
  if (kind === 'check') return <CheckIcon size={14} />;
  return <ClockIcon size={14} />;
}

function relativeTime(at: Date): string {
  const s = Math.max(0, Math.round((Date.now() - at.getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

function alertDetail(a: AlertEvent): string {
  const who = [a.plate, a.routeName].filter(Boolean).join(' · ');
  if (a.channel === 'notifications:delay') {
    const head = a.extraMinutes != null ? `+${a.extraMinutes} min` : 'Delay';
    const reason = a.reason ? ` — ${a.reason}` : '';
    return who ? `${who} · ${head}${reason}` : `${head}${reason}`;
  }
  return who || 'Trip event';
}

/** Bell + dropdown feed of live alerts (delay reports, trip lifecycle). */
export function AlertsFeed({ alerts }: { alerts: AlertEvent[] }) {
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const unread = Math.max(0, alerts.length - seenCount);

  // Tick while open so "2m ago" stays honest.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((v) => {
      if (!v) setSeenCount(alerts.length);
      return !v;
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        className="pressable relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-muted-bg hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications — ${unread} unread` : 'Notifications'}
      >
        <BellIcon size={17} />
        {unread > 0 && (
          <span
            className="num absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[12px] font-bold leading-none text-white"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+10px)] w-80 overflow-hidden sheet animate-sheet-in rounded-sheet"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="border-b border-line px-4 py-3 text-[0.9375rem] font-bold text-ink">
            Notifications
          </div>
          {alerts.length === 0 ? (
            <p className="px-4 py-6 text-center text-small text-muted">
              No alerts yet — delay reports and trip events appear here live.
            </p>
          ) : (
            <ul className="scrollbar-thin max-h-96 list-none overflow-y-auto py-1" aria-live="polite">
              {[...alerts].reverse().map((a) => {
                const meta = CHANNEL_META[a.channel] ?? {
                  title: a.channel,
                  icon: 'clock' as const,
                  iconClass: 'bg-muted-bg text-muted',
                };
                return (
                  <li key={a.id} className="flex items-start gap-2.5 px-4 py-2.5">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.iconClass}`}
                      aria-hidden="true"
                    >
                      <AlertIcon kind={meta.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9375rem] font-bold leading-snug text-ink">
                        {meta.title}
                      </span>
                      <span className="block truncate text-[0.875rem] text-muted">
                        {alertDetail(a)}
                      </span>
                    </span>
                    <span className="num shrink-0 pt-0.5 text-[0.8125rem] text-muted">
                      {relativeTime(a.at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
