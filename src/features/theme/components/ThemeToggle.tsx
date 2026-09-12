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
      className="icon-button"
    >
      {isDark ? (
        <Sun aria-hidden="true" className="h-5 w-5" />
      ) : (
        <Moon aria-hidden="true" className="h-5 w-5" />
      )}
    </button>
  )
}
