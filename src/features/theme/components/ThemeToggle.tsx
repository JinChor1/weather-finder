import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'

/**
 * Manual light/dark theme switcher. Displays the icon for the theme a click
 * would switch *to* (moon while light, sun while dark), matching the
 * accessible name so the icon and the announced action always agree.
 */
export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-purple-950/15 bg-white/70 text-purple-900 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
    >
      {isDark ? (
        <Sun aria-hidden="true" className="h-5 w-5" />
      ) : (
        <Moon aria-hidden="true" className="h-5 w-5" />
      )}
    </button>
  )
}
