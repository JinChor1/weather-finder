import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Cross-cutting UI state for the manual light/dark switcher (see the
 * "Theming" section of CLAUDE.md). Persisted to `localStorage` so the choice
 * survives a page refresh; falls back to the OS preference only the first
 * time there's no stored value.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: getSystemTheme(),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'weather-finder-theme' },
  ),
)

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

// `persist` hydrates synchronously from localStorage (a synchronous storage),
// so the store's state already reflects any saved preference by the time
// this module finishes evaluating - applying the class here, before React
// ever renders, avoids a flash of the wrong theme on refresh. The
// subscription then keeps <html>'s `dark` class correct on every toggle.
applyThemeClass(useThemeStore.getState().theme)
useThemeStore.subscribe((state) => applyThemeClass(state.theme))
