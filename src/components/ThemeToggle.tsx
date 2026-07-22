import { useTheme } from '../hooks/useTheme';
import { MoonIcon, SunIcon } from './Icons';

/** Sun/moon icon button — toggles the `dark` class via useTheme, persisted in localStorage. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`pressable relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-muted-bg hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      <SunIcon
        size={16}
        className={`absolute transition-all duration-300 ease-smooth ${isDark ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}
      />
      <MoonIcon
        size={16}
        className={`absolute transition-all duration-300 ease-smooth ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`}
      />
    </button>
  );
}
