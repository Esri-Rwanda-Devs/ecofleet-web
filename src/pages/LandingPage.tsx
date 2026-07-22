import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, FleetIcon, GpsIcon, MapPinIcon, RouteIcon } from '../components/Icons';
import { ThemeToggle } from '../components/ThemeToggle';
import { Logo } from '../components/Logo';

/**
 * BTS Operations landing — UI UX Pro Max
 * Pattern: Real-Time / Operations + Hero-Centric
 * Style: Soft UI Evolution · Fira Sans + Fira Code
 * Brand: blue / orange / white · spacious density · elevated motion
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
      {/* Soft aurora washes — Soft UI Evolution depth, brand green + ink */}
      <div className="absolute -left-[20%] -top-[30%] h-[70%] w-[70%] rounded-full bg-[radial-gradient(circle,rgba(22,163,74,0.22)_0%,transparent_68%)] motion-safe:animate-aurora-drift dark:bg-[radial-gradient(circle,rgba(34,197,94,0.24)_0%,transparent_68%)]" />
      <div
        className="absolute -right-[15%] top-[5%] h-[55%] w-[55%] rounded-full bg-[radial-gradient(circle,rgba(10,10,10,0.08)_0%,transparent_65%)] motion-safe:animate-aurora-drift dark:bg-[radial-gradient(circle,rgba(255,255,255,0.06)_0%,transparent_65%)]"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="absolute bottom-[-20%] left-[30%] h-[50%] w-[50%] rounded-full bg-[radial-gradient(circle,rgba(22,163,74,0.14)_0%,transparent_70%)] motion-safe:animate-aurora-drift dark:bg-[radial-gradient(circle,rgba(34,197,94,0.16)_0%,transparent_70%)]"
        style={{ animationDelay: '-11s' }}
      />

      {/* City grid fade */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #E5E5E5 1px, transparent 1px), linear-gradient(to bottom, #E5E5E5 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse 70% 60% at 70% 45%, black 10%, transparent 72%)',
        }}
      />

      {/* Soft vignette — lighter on the right for the bus photo, matches canvas per theme */}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.85)_38%,rgba(255,255,255,0.35)_58%,transparent_100%)] dark:bg-[linear-gradient(105deg,rgba(10,10,12,0.96)_0%,rgba(10,10,12,0.86)_38%,rgba(10,10,12,0.35)_58%,transparent_100%)] lg:bg-[linear-gradient(100deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.88)_42%,rgba(255,255,255,0.25)_62%,transparent_100%)] dark:lg:bg-[linear-gradient(100deg,rgba(10,10,12,0.97)_0%,rgba(10,10,12,0.89)_42%,rgba(10,10,12,0.25)_62%,transparent_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />

      {/* Route lines — desktop only, confined to the bus-image column so they
          never cross the headline/body text */}
      <svg
        className="absolute inset-y-0 right-0 hidden w-[52%] lg:block"
        viewBox="0 0 740 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M40 700 C 160 660, 220 500, 340 440 S 520 380, 620 280 S 700 180, 720 90"
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          className="stroke-primary motion-safe:animate-route-draw"
          opacity="0.9"
        />
        <path
          d="M100 770 C 220 710, 300 610, 420 550 S 600 470, 680 390"
          strokeWidth="2.75"
          strokeLinecap="round"
          opacity="0.35"
          pathLength={1}
          strokeDasharray={1}
          className="stroke-ink motion-safe:animate-route-draw"
          style={{ animationDelay: '0.4s' }}
        />
        <path
          d="M20 560 C 140 580, 240 520, 360 490 S 520 440, 600 360"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
          pathLength={1}
          strokeDasharray={1}
          className="stroke-primary motion-safe:animate-route-draw"
          style={{ animationDelay: '0.7s' }}
        />

        {[
          [340, 440, 'primary'],
          [620, 280, 'primary'],
          [720, 90, 'ink'],
          [420, 550, 'primary'],
        ].map(([x, y, tone], i) => (
          <g key={i} className={tone === 'primary' ? 'fill-primary stroke-primary' : 'fill-ink stroke-ink'}>
            <circle
              cx={x as number}
              cy={y as number}
              r="18"
              opacity="0.12"
              className="motion-safe:animate-ping-soft"
              style={{ animationDelay: `${i * 0.55}s` }}
            />
            <circle cx={x as number} cy={y as number} r="9" className="fill-surface" strokeWidth="2.5" />
            <circle cx={x as number} cy={y as number} r="3" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function HeroBusImage() {
  return (
    <div className="relative mx-auto w-full max-w-[min(100%,560px)] lg:max-w-none lg:justify-self-end">
      {/* Radial glow — the "floor glow" the cut-out bus rests on */}
      <div
        className="pointer-events-none absolute -inset-10 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,rgba(22,163,74,0.22)_0%,transparent_70%)] blur-sm dark:bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.28)_0%,transparent_70%)]"
        aria-hidden="true"
      />
      {/* Ground contact ellipse — grounds the floating cut-out */}
      <div
        className="pointer-events-none absolute bottom-[9%] left-1/2 h-6 w-[62%] -translate-x-1/2 rounded-[100%] bg-ink/15 blur-md dark:bg-black/40"
        aria-hidden="true"
      />
      <div className="motion-safe:animate-landing-fade-delay-3 relative">
        <img
          src="/bts-bus-hero.png"
          alt="BTS Operations bus in Kigali — green fleet vehicle"
          className="relative z-[1] h-auto w-full max-h-[min(56vh,460px)] object-contain object-center drop-shadow-[0_28px_40px_rgba(10,10,10,0.22)] lg:max-h-[min(74vh,600px)]"
          width={800}
          height={600}
          fetchPriority="high"
          decoding="async"
        />
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.8125rem] font-semibold text-muted lg:justify-end">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary" aria-hidden="true" />
          Kigali fleet · live on the map
        </p>
      </div>
    </div>
  );
}

/** Stylized command-center preview — product proof below the fold */
function ConsolePreview() {
  return (
    <div
      className="relative overflow-hidden rounded-[1.25rem] border border-line/60 bg-muted-bg shadow-pop dark:ring-1 dark:ring-white/[0.04]"
      aria-hidden="true"
    >
      <div className="flex h-11 items-center gap-2 border-b border-line/50 bg-surface/90 px-4">
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
        <div className="hidden flex-col gap-2 border-r border-line/50 bg-surface p-3 md:flex">
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
        <div className="relative min-h-[220px] overflow-hidden bg-[linear-gradient(160deg,#F0FDF4_0%,#FFFFFF_55%,#F5F5F5_100%)] dark:bg-[linear-gradient(160deg,#0f1f16_0%,#0a0a0c_55%,#0a0a0c_100%)] md:min-h-0">
          <div
            className="absolute inset-0 opacity-40 dark:opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, #D4D4D4 1px, transparent 1px), linear-gradient(to bottom, #D4D4D4 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 360" fill="none">
            <path
              d="M40 280 C 140 250, 200 180, 300 160 S 460 120, 580 70"
              strokeWidth="3"
              strokeLinecap="round"
              className="stroke-primary"
            />
            <path
              d="M60 320 C 180 300, 240 240, 340 210"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.45"
              className="stroke-ink"
            />
            <circle cx="300" cy="160" r="8" strokeWidth="2" className="fill-surface stroke-primary" />
            <circle cx="460" cy="120" r="8" strokeWidth="2" className="fill-surface stroke-primary-dark" />
            <circle cx="580" cy="70" r="8" strokeWidth="2" className="fill-surface stroke-primary" />
            <rect x="288" y="148" width="28" height="18" rx="4" className="fill-primary" />
          </svg>
          <div className="absolute bottom-3 left-3 rounded-lg bg-surface/90 px-2.5 py-1.5 text-[0.6875rem] font-semibold text-ink-soft shadow-card backdrop-blur-sm">
            ArcGIS · Kigali
          </div>
        </div>

        {/* Trip column */}
        <div className="hidden flex-col gap-3 border-l border-line/50 bg-surface p-3 md:flex">
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
    <div className="landing min-h-screen overflow-x-hidden bg-canvas font-landing text-ink antialiased">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line/40 bg-canvas/80 backdrop-blur-glass">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#top" className="pressable flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Logo className="h-9" />
            <p className="text-[0.6875rem] font-medium text-muted">Kigali · Real-Time Command</p>
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
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              to="/dashboard"
              className="pressable inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-[0.875rem] font-bold text-white shadow-card hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="hidden sm:inline">Enter command center</span>
              <span className="sm:hidden">Enter</span>
              <ArrowIcon size={15} className="opacity-90" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — headline + BTS fleet photo */}
      <section id="top" className="relative isolate min-h-[min(94vh,920px)] overflow-hidden">
        <HeroAtmosphere />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1fr_minmax(280px,46%)] lg:gap-12 lg:pb-32 lg:pt-28">
          <div className="min-w-0">
            <p className="motion-safe:animate-landing-fade font-display text-[0.8125rem] font-bold uppercase tracking-[0.16em] text-primary">
              Kigali · Real-Time Command
            </p>

            <h1 className="motion-safe:animate-landing-fade-delay mt-5 max-w-[14ch] font-display text-[clamp(2.5rem,7vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink lg:text-[clamp(3rem,4.5vw,5.5rem)]">
              BTS Operations
            </h1>

            <p className="motion-safe:animate-landing-fade-delay-2 mt-6 max-w-lg text-[1.0625rem] font-medium leading-relaxed text-ink-soft sm:text-[1.125rem] lg:text-[1.25rem]">
              The live command center for bus dispatch — fleet, routes, delays, and ArcGIS locations
              on one screen.
            </p>

            <div className="motion-safe:animate-landing-fade-delay-3 mt-8 flex flex-wrap items-center gap-3 sm:mt-10">
              <Link
                to="/dashboard"
                className="pressable inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-7 text-[1rem] font-bold text-white shadow-panel hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto sm:text-[1.0625rem]"
              >
                Open live dashboard
                <ArrowIcon size={17} />
              </Link>
              <a
                href="#capabilities"
                className="pressable inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-2xl border border-line/70 bg-surface/80 px-6 text-[1rem] font-semibold text-ink backdrop-blur-sm hover:border-primary/30 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto sm:text-[1.0625rem]"
              >
                Explore capabilities
              </a>
            </div>
          </div>

          <HeroBusImage />
        </div>
      </section>

      {/* Key metrics / trust indicators — after hero (ops landing pattern) */}
      <section className="relative z-10 border-y border-line/50 bg-muted-bg/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-line/40 sm:grid-cols-4">
          {METRICS.map((m, i) => (
            <Reveal key={m.label} delay={(Math.min(i + 1, 3) as 1 | 2 | 3)} className="bg-surface px-5 py-8 sm:px-7 sm:py-10">
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
      <section id="capabilities" className="scroll-mt-24 bg-canvas py-24 sm:py-32">
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
                  ? 'bg-accent text-white'
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
      <section id="preview" className="scroll-mt-24 bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_100%)] py-24 dark:bg-[linear-gradient(180deg,#0f1310_0%,#0a0a0c_100%)] sm:py-32">
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
      <section id="how" className="scroll-mt-24 bg-canvas py-24 sm:py-32">
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

      <footer className="border-t border-line/60 bg-canvas py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-[0.8125rem] text-muted sm:px-8">
          <div className="flex items-center gap-2.5">
            <Logo className="h-6" />
            <span className="font-semibold text-ink-soft">Kigali</span>
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
