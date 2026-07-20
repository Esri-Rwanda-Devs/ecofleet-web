import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, BusIcon, FleetIcon, GpsIcon, MapPinIcon, RouteIcon } from '../components/Icons';

/**
 * BTS Operations landing — UI UX Pro Max
 * Pattern: Real-Time / Operations + Hero-Centric
 * Style: Soft UI Evolution · Outfit + Work Sans
 * Brand: green / black / white · spacious density · elevated motion
 */

function useLandingReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  className = '',
  delay,
}: {
  children: ReactNode;
  className?: string;
  delay?: 1 | 2 | 3;
}) {
  const ref = useLandingReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`landing-reveal ${delay ? `landing-reveal-delay-${delay}` : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function ArrowIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function HeroAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Soft aurora washes — Soft UI Evolution depth */}
      <div className="absolute -left-[20%] -top-[30%] h-[70%] w-[70%] rounded-full bg-[radial-gradient(circle,rgba(22,163,74,0.22)_0%,transparent_68%)] motion-safe:animate-aurora-drift" />
      <div
        className="absolute -right-[15%] top-[5%] h-[55%] w-[55%] rounded-full bg-[radial-gradient(circle,rgba(10,10,10,0.08)_0%,transparent_65%)] motion-safe:animate-aurora-drift"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="absolute bottom-[-20%] left-[30%] h-[50%] w-[50%] rounded-full bg-[radial-gradient(circle,rgba(22,163,74,0.12)_0%,transparent_70%)] motion-safe:animate-aurora-drift"
        style={{ animationDelay: '-11s' }}
      />

      {/* City grid fade */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #E5E5E5 1px, transparent 1px), linear-gradient(to bottom, #E5E5E5 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse 70% 60% at 70% 45%, black 10%, transparent 72%)',
        }}
      />

      {/* Soft white vignette so brand text stays readable */}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.72)_42%,rgba(255,255,255,0.15)_68%,transparent_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M80 620 C 220 580, 280 420, 420 380 S 620 340, 720 260 S 920 140, 1120 100"
          stroke="#16A34A"
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          className="motion-safe:animate-route-draw"
          opacity="0.9"
        />
        <path
          d="M160 700 C 300 640, 380 560, 520 500 S 740 420, 860 360"
          stroke="#0A0A0A"
          strokeWidth="2.75"
          strokeLinecap="round"
          opacity="0.35"
          pathLength={1}
          strokeDasharray={1}
          className="motion-safe:animate-route-draw"
          style={{ animationDelay: '0.4s' }}
        />
        <path
          d="M40 480 C 180 500, 300 460, 440 440 S 680 400, 820 320"
          stroke="#16A34A"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
          pathLength={1}
          strokeDasharray={1}
          className="motion-safe:animate-route-draw"
          style={{ animationDelay: '0.7s' }}
        />

        {[
          [420, 380, '#16A34A'],
          [720, 260, '#16A34A'],
          [1120, 100, '#0A0A0A'],
          [520, 500, '#16A34A'],
        ].map(([x, y, color], i) => (
          <g key={i}>
            <circle
              cx={x as number}
              cy={y as number}
              r="18"
              fill={color as string}
              opacity="0.15"
              className="motion-safe:animate-ping-soft"
              style={{ animationDelay: `${i * 0.55}s` }}
            />
            <circle
              cx={x as number}
              cy={y as number}
              r="9"
              fill="#FFFFFF"
              stroke={color as string}
              strokeWidth="2.5"
            />
            <circle cx={x as number} cy={y as number} r="3" fill={color as string} />
          </g>
        ))}

        {/* Bus marker gliding the primary route */}
        <g className="landing-bus">
          <rect x="-18" y="-12" width="36" height="24" rx="6" fill="#16A34A" />
          <rect x="-10" y="-6" width="9" height="7" rx="1.5" fill="#FFFFFF" opacity="0.92" />
          <rect x="2" y="-6" width="9" height="7" rx="1.5" fill="#FFFFFF" opacity="0.92" />
        </g>
      </svg>
    </div>
  );
}

/** Stylized command-center preview — product proof below the fold */
function ConsolePreview() {
  return (
    <div
      className="relative overflow-hidden rounded-[1.25rem] border border-line/60 bg-[#F8FAFC] shadow-pop"
      aria-hidden="true"
    >
      <div className="flex h-11 items-center gap-2 border-b border-line/50 bg-white/90 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 font-display text-[0.75rem] font-semibold tracking-wide text-muted">
          BTS Operations · Live command
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[0.6875rem] font-bold text-success">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
          LIVE
        </span>
      </div>

      <div className="grid min-h-[280px] grid-cols-1 md:min-h-[360px] md:grid-cols-[220px_1fr_200px]">
        {/* Fleet column */}
        <div className="hidden flex-col gap-2 border-r border-line/50 bg-white p-3 md:flex">
          <p className="px-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">
            Live fleet
          </p>
          {[
            { plate: 'RAD 482 A', route: 'Nyabugogo → Remera', eta: '4 min', active: true },
            { plate: 'RAD 119 B', route: 'Kacyiru loop', eta: '9 min', active: false },
            { plate: 'RAD 905 C', route: 'Kimironko', eta: '12 min', active: false },
          ].map((row) => (
            <div
              key={row.plate}
              className={`rounded-xl px-3 py-2.5 ${
                row.active
                  ? 'border border-primary/25 bg-primary-soft/70'
                  : 'border border-transparent bg-muted-bg/70'
              }`}
            >
              <p className="font-data text-[0.8125rem] font-bold text-ink">{row.plate}</p>
              <p className="mt-0.5 truncate text-[0.6875rem] text-muted">{row.route}</p>
              <p className="mt-1 font-data text-[0.75rem] font-semibold text-primary">{row.eta}</p>
            </div>
          ))}
        </div>

        {/* Map stage */}
        <div className="relative min-h-[220px] overflow-hidden bg-[linear-gradient(160deg,#F0FDF4_0%,#FFFFFF_55%,#F5F5F5_100%)] md:min-h-0">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(to right, #D4D4D4 1px, transparent 1px), linear-gradient(to bottom, #D4D4D4 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 360" fill="none">
            <path
              d="M40 280 C 140 250, 200 180, 300 160 S 460 120, 580 70"
              stroke="#16A34A"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M60 320 C 180 300, 240 240, 340 210"
              stroke="#0A0A0A"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.45"
            />
            <circle cx="300" cy="160" r="8" fill="#fff" stroke="#16A34A" strokeWidth="2" />
            <circle cx="460" cy="120" r="8" fill="#fff" stroke="#0A0A0A" strokeWidth="2" />
            <circle cx="580" cy="70" r="8" fill="#fff" stroke="#16A34A" strokeWidth="2" />
            <rect x="288" y="148" width="28" height="18" rx="4" fill="#16A34A" />
          </svg>
          <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1.5 text-[0.6875rem] font-semibold text-ink-soft shadow-card backdrop-blur-sm">
            ArcGIS · Kigali
          </div>
        </div>

        {/* Trip column */}
        <div className="hidden flex-col gap-3 border-l border-line/50 bg-white p-3 md:flex">
          <p className="font-data text-[1rem] font-bold text-primary">RAD 482 A</p>
          <p className="text-[0.75rem] font-semibold text-ink">Nyabugogo → Remera</p>
          <div className="mt-1 space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold text-white ${
                    n === 1 ? 'bg-primary' : 'bg-accent'
                  }`}
                >
                  {n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="h-2 w-full rounded bg-muted-bg" />
                  <div className="mt-1 h-1.5 w-2/3 rounded bg-line-light" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CAPABILITIES = [
  {
    icon: FleetIcon,
    title: 'Live fleet board',
    body: 'Every active bus — plate, route, speed, journey, next stop, delay, and GPS freshness — in one docked panel.',
    tone: 'green' as const,
  },
  {
    icon: MapPinIcon,
    title: 'ArcGIS map command',
    body: 'Follow vehicles on the Kigali basemap, paint the selected route, and zoom straight to any stop number.',
    tone: 'black' as const,
  },
  {
    icon: BellIcon,
    title: 'Realtime alerts',
    body: 'Trip starts, completions, and delay reports stream live. When the socket drops, POLL keeps you covered.',
    tone: 'green' as const,
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Open the command center',
    body: 'One screen — full-bleed map with fleet and trip panels docked for speed.',
  },
  {
    n: '02',
    title: 'Select a vehicle or stop',
    body: 'Fleet on the left, stop timeline on the right, arrivals when you tap a station.',
  },
  {
    n: '03',
    title: 'Act on live signal',
    body: 'LIVE badge, delay chips, and notifications keep dispatch aligned second by second.',
  },
];

const METRICS = [
  { label: 'Signal', value: 'Realtime', hint: 'Socket.IO + POLL fallback', color: 'text-success' },
  { label: 'Map', value: 'ArcGIS', hint: 'Routes, stops, vehicles', color: 'text-primary' },
  { label: 'Status', value: 'Labeled', hint: 'Never color alone', color: 'text-ink' },
  { label: 'Surface', value: 'One screen', hint: 'Map-first command', color: 'text-ink' },
];

export function LandingPage() {
  return (
    <div className="landing min-h-screen overflow-x-hidden bg-white font-landing text-ink antialiased">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line/40 bg-white/80 backdrop-blur-glass">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#top" className="pressable flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-card">
              <BusIcon size={17} />
            </span>
            <div className="leading-tight">
              <p className="font-display text-[0.975rem] font-bold tracking-tight text-ink">
                BTS Operations
              </p>
              <p className="text-[0.6875rem] font-medium text-muted">Kigali · Real-Time Command</p>
            </div>
          </a>
          <nav className="hidden items-center gap-9 text-[0.875rem] font-semibold text-ink-soft md:flex">
            <a href="#capabilities" className="cursor-pointer hover:text-primary">
              Capabilities
            </a>
            <a href="#preview" className="cursor-pointer hover:text-primary">
              Preview
            </a>
            <a href="#how" className="cursor-pointer hover:text-primary">
              How it works
            </a>
          </nav>
          <Link
            to="/dashboard"
            className="pressable inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-[0.875rem] font-bold text-white shadow-card hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Enter command center
            <ArrowIcon size={15} className="opacity-90" />
          </Link>
        </div>
      </header>

      {/* Hero — brand first, one line, CTA, full-bleed map atmosphere */}
      <section id="top" className="relative isolate min-h-[min(94vh,920px)] overflow-hidden">
        <HeroAtmosphere />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col justify-center px-5 pb-24 pt-20 sm:px-8 sm:pb-32 sm:pt-28">
          <p className="motion-safe:animate-landing-fade font-display text-[0.8125rem] font-bold uppercase tracking-[0.16em] text-primary">
            Kigali · Real-Time Command
          </p>

          <h1 className="motion-safe:animate-landing-fade-delay mt-5 max-w-[14ch] font-display text-[clamp(3rem,8vw,5.5rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink">
            BTS Operations
          </h1>

          <p className="motion-safe:animate-landing-fade-delay-2 mt-6 max-w-lg text-[1.125rem] font-medium leading-relaxed text-ink-soft sm:text-[1.25rem]">
            The live command center for bus dispatch — fleet, routes, delays, and ArcGIS locations
            on one screen.
          </p>

          <div className="motion-safe:animate-landing-fade-delay-3 mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="pressable inline-flex min-h-[3.25rem] items-center gap-2.5 rounded-2xl bg-primary px-7 text-[1.0625rem] font-bold text-white shadow-panel hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Open live dashboard
              <ArrowIcon size={17} />
            </Link>
            <a
              href="#capabilities"
              className="pressable inline-flex min-h-[3.25rem] items-center rounded-2xl border border-line/70 bg-white/80 px-6 text-[1.0625rem] font-semibold text-ink backdrop-blur-sm hover:border-primary/30 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Explore capabilities
            </a>
          </div>
        </div>
      </section>

      {/* Key metrics / trust indicators — after hero (ops landing pattern) */}
      <section className="relative z-10 border-y border-line/50 bg-muted-bg/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-line/40 sm:grid-cols-4">
          {METRICS.map((m, i) => (
            <Reveal key={m.label} delay={(Math.min(i + 1, 3) as 1 | 2 | 3)} className="bg-white px-5 py-8 sm:px-7 sm:py-10">
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-muted">{m.label}</p>
              <p className={`mt-2 font-display text-[1.5rem] font-bold tracking-tight ${m.color}`}>
                {m.value}
              </p>
              <p className="mt-1 text-[0.8125rem] font-medium text-ink-soft">{m.hint}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="scroll-mt-24 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <p className="font-display text-[0.75rem] font-bold uppercase tracking-[0.14em] text-primary">
              Capabilities
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-[clamp(1.875rem,3.8vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-ink">
              Everything a dispatcher needs — nothing extra.
            </h2>
            <p className="mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
              Full-bleed map. Docked fleet and trip panels. The same tools you run in the command
              center today.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {CAPABILITIES.map((c, i) => {
              const Icon = c.icon;
              const tone =
                c.tone === 'black'
                  ? 'bg-ink text-white'
                  : 'bg-primary-soft text-primary';
              return (
                <Reveal key={c.title} delay={(Math.min(i + 1, 3) as 1 | 2 | 3)}>
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}
                  >
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-6 font-display text-[1.3125rem] font-bold tracking-tight text-ink">
                    {c.title}
                  </h3>
                  <p className="mt-3 text-[1rem] leading-relaxed text-ink-soft">{c.body}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section id="preview" className="scroll-mt-24 bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_100%)] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <p className="font-display text-[0.75rem] font-bold uppercase tracking-[0.14em] text-success">
              Inside the console
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-[clamp(1.875rem,3.8vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-ink">
              Built for glanceable ops at city scale.
            </h2>
            <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
              Status language that pairs color with labels. Stop numbers that zoom the map. Alerts
              that arrive the moment drivers move.
            </p>
          </Reveal>

          <Reveal className="mt-14" delay={1}>
            <ConsolePreview />
          </Reveal>

          <Reveal className="mt-10 flex flex-wrap gap-2" delay={2}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3.5 py-1.5 text-[0.8125rem] font-bold text-success">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
              LIVE
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3.5 py-1.5 text-[0.8125rem] font-bold text-success">
              On route
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-3.5 py-1.5 text-[0.8125rem] font-bold text-ink">
              Delayed
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-1.5 text-[0.8125rem] font-bold text-primary">
              <GpsIcon size={12} /> GPS · fresh
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted-bg px-3.5 py-1.5 text-[0.8125rem] font-bold text-muted">
              POLL
            </span>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-24 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <p className="font-display text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink">
              How it works
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-[clamp(1.875rem,3.8vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-ink">
              From overview to action in three moves.
            </h2>
          </Reveal>

          <ol className="relative mt-16 grid gap-14 md:grid-cols-3 md:gap-10">
            <div
              className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-primary/40 via-ink/20 to-primary/40 md:block"
              aria-hidden="true"
            />
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={(Math.min(i + 1, 3) as 1 | 2 | 3)}>
                <li className="relative min-w-0">
                  <span className="font-display text-[3rem] font-extrabold leading-none tracking-tight text-primary/[0.14]">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-display text-[1.25rem] font-bold text-ink">{s.title}</h3>
                  <p className="mt-3 text-[1rem] leading-relaxed text-ink-soft">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-5 py-24 sm:px-8 sm:py-28">
        <div className="absolute inset-0 bg-primary" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 50% 80% at 10% 50%, rgba(34,197,94,0.45) 0%, transparent 55%), radial-gradient(ellipse 40% 60% at 90% 20%, rgba(10,10,10,0.35) 0%, transparent 50%), radial-gradient(ellipse 35% 50% at 70% 100%, rgba(22,163,74,0.3) 0%, transparent 45%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] font-bold tracking-tight text-white">
              Ready for the live map?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[1.125rem] leading-relaxed text-white/85">
              Jump into BTS Operations and monitor Kigali&apos;s fleet as it moves — second by
              second.
            </p>
            <Link
              to="/dashboard"
              className="pressable mt-10 inline-flex min-h-[3.25rem] items-center gap-2.5 rounded-2xl bg-white px-8 text-[1.0625rem] font-bold text-primary shadow-pop hover:bg-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Enter command center
              <ArrowIcon size={17} />
            </Link>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.8125rem] font-semibold text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <GpsIcon size={13} /> Socket.IO realtime
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RouteIcon size={13} /> ArcGIS map
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FleetIcon size={13} /> Fleet + stop timeline
              </span>
            </p>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line/60 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-[0.8125rem] text-muted sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <BusIcon size={14} />
            </span>
            <span className="font-semibold text-ink-soft">BTS Operations · Kigali</span>
          </div>
          <Link
            to="/dashboard"
            className="pressable inline-flex items-center gap-1.5 font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Go to dashboard
            <ArrowIcon size={14} />
          </Link>
        </div>
      </footer>
    </div>
  );
}
