/**
 * BTS wordmark — the logo's white knockout details (the "T" slash, bus
 * windows) need a recolor per theme to stay legible, so light/dark ship as
 * separate exports and swap via CSS (no theme JS needed here).
 */
export function Logo({ className = 'h-8' }: { className?: string }) {
  return (
    <>
      <img src="/logo-light.png" alt="BTS Operations" className={`w-auto shrink-0 dark:hidden ${className}`} />
      <img src="/logo-dark.png" alt="BTS Operations" className={`hidden w-auto shrink-0 dark:block ${className}`} />
    </>
  );
}
