import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { z } from 'zod'

/**
 * Maximum number of history rows retained. No number is specified in the
 * requirements docs — 20 is a reasonable default (roughly a week's worth of
 * casual daily lookups) that keeps the persisted `localStorage` payload
 * small. Documented as a stated assumption in the README's "Assumptions"
 * section.
 */
export const MAX_SEARCH_HISTORY_SIZE = 20

const searchHistoryEntrySchema = z.object({
  /** Stable id, independent of the entry's content, for row keys/deletes. */
  id: z.string(),
  /** Display label matching the mockup, e.g. "Johor, MY" (`city, country`). */
  label: z.string(),
  /** Raw query string to re-run via `useCurrentWeatherQuery` on "search again". */
  query: z.string(),
  /** ISO 8601 timestamp of when this location was (most recently) searched. */
  searchedAt: z.string(),
})

export type SearchHistoryEntry = z.infer<typeof searchHistoryEntrySchema>

/**
 * Shape of the slice of state persisted to `localStorage` (see `partialize`/
 * `merge` below). `localStorage` is a trust boundary per this repo's Zod
 * rule — it can be hand-edited, or left over from a previous shape of this
 * store — so it's validated on every rehydration rather than trusted as-is
 * (unlike `useThemeStore`'s single enum field, `SearchHistoryEntry` is rich
 * enough that a malformed/legacy blob could otherwise flow straight into the
 * UI untyped-at-runtime, e.g. rendering "NaN-NaN-NaN NaNam" for a garbage
 * `searchedAt`).
 */
const persistedSearchHistoryStateSchema = z.object({
  entries: z.array(searchHistoryEntrySchema),
})

interface SearchHistoryState {
  /** Most-recent-first. Capped at `MAX_SEARCH_HISTORY_SIZE`. */
  entries: SearchHistoryEntry[]
  /**
   * Adds a new history entry, or — if an entry with the same raw `query`
   * (case-insensitive, trimmed) already exists — moves it to the top and
   * refreshes its `label`/`searchedAt` instead of creating a duplicate row.
   */
  addEntry: (entry: { label: string; query: string }) => void
  /** Removes a single entry by id. */
  removeEntry: (id: string) => void
}

/**
 * Two entries are "the same location" when they share the same raw `query`
 * text — not the display `label`. `label` is built purely from the *weather
 * API response* (`city`, `country`; see `TodaysWeather.tsx`), which drops
 * any state/region, so two genuinely different places can render an
 * identical label (OpenWeatherMap's geocoding doesn't guarantee city-name
 * uniqueness within a country — e.g. two distinct "Springfield, US" results
 * in different states). Matching on `label` would silently merge those into
 * one row, overwriting the earlier one's `query` and making it unreachable
 * via "search again". The raw `query` — the exact text that produced this
 * result — is the most stable disambiguator available at this call site (no
 * lat/lon is plumbed through `weatherResultSchema` today); it also means a
 * genuine re-search (the same text submitted again, including via "search
 * again") still moves the existing row to the top instead of duplicating it.
 */
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
          const existing = state.entries.find((entry) => sameLocation(entry.query, query))
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
    {
      name: 'weather-finder-search-history',
      partialize: (state) => ({ entries: state.entries }),
      // Falls back to an empty history (the store's own initial state)
      // rather than letting a malformed/legacy `localStorage` value flow
      // into the UI on a shape mismatch.
      merge: (persistedState, currentState) => {
        const result = persistedSearchHistoryStateSchema.safeParse(persistedState)
        return result.success ? { ...currentState, entries: result.data.entries } : currentState
      },
    },
  ),
)
