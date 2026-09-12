import { act } from '@testing-library/react'
import { useThemeStore } from './useThemeStore'

const STORAGE_KEY = 'weather-finder-theme'

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    act(() => {
      useThemeStore.setState({ theme: 'light' })
    })
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('toggles between light and dark', () => {
    act(() => {
      useThemeStore.getState().toggleTheme()
    })
    expect(useThemeStore.getState().theme).toBe('dark')

    act(() => {
      useThemeStore.getState().toggleTheme()
    })
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('persists the chosen theme to localStorage', () => {
    act(() => {
      useThemeStore.getState().toggleTheme()
    })

    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored as string).state.theme).toBe('dark')
  })

  it('keeps the <html> `dark` class in sync with the theme', () => {
    act(() => {
      useThemeStore.setState({ theme: 'dark' })
    })
    expect(document.documentElement).toHaveClass('dark')

    act(() => {
      useThemeStore.setState({ theme: 'light' })
    })
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('falls back to the OS color-scheme preference when nothing is persisted', async () => {
    localStorage.clear()
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }))
    vi.resetModules()

    const { useThemeStore: freshStore } = await import('./useThemeStore')
    expect(freshStore.getState().theme).toBe('dark')

    vi.unstubAllGlobals()
    vi.resetModules()
  })
})
