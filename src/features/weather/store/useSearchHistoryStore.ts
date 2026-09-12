import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Maximum number of history rows retained. No number is specified in the
 * requirements docs — 20 is a reasonable default (roughly a week's worth of
 * casual daily lookups) that keeps the persisted `localStorage` payload
 * small. Documented as a stated assumption in the README's "Assumptions"
 * section.
 */
export const MAX_SEARCH_HISTORY_SIZE = 20

export interface SearchHistoryEntry {
  /** Stable id, independent of the entry's content, for row keys/deletes. */
  id: string
  /** Display label matching the mockup, e.g. "Johor, MY" (`city, country`). */
  label: string
  /** Raw query string to re-run via `useCurrentWeatherQuery` on "search again". */
  query: string
  /** ISO 8601 timestamp of when this location was (most recently) searched. */
  searchedAt: string
}

interface SearchHistoryState {
  /** Most-recent-first. Capped at `MAX_SEARCH_HISTORY_SIZE`. */
  entries: SearchHistoryEntry[]
  /**
   * Adds a new history entry, or — if an entry with the same `label`
   * (case-insensitive) already exists — moves it to the top and refreshes
   * its `query`/`searchedAt` instead of creating a duplicate row.
   */
  addEntry: (entry: { label: string; query: string }) => void
  /** Removes a single entry by id. */
  removeEntry: (id: string) => void
}

function sameLocation(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Search history for the "Today's Weather" feature, persisted to
 * `localStorage` (via `persist`) so it survives a page refresh — the same
 * pattern `useThemeStore` already uses for theme preference. Feature-scoped
 * to `weather`, not folded into any other store.
 */
export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: ({ label, query }) =>
        set((state) => {
          const searchedAt = new Date().toISOString()
          const existing = state.entries.find((entry) => sameLocation(entry.label, label))
          const withoutExisting = existing
            ? state.entries.filter((entry) => entry.id !== existing.id)
            : state.entries

          const entry: SearchHistoryEntry = {
            id: existing?.id ?? crypto.randomUUID(),
            label,
            query,
            searchedAt,
          }

          return { entries: [entry, ...withoutExisting].slice(0, MAX_SEARCH_HISTORY_SIZE) }
        }),
      removeEntry: (id) => set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),
    }),
    { name: 'weather-finder-search-history' },
  ),
)
