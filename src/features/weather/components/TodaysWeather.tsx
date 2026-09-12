import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { WeatherResult } from './WeatherResult'
import { NotFoundBanner } from './NotFoundBanner'
import { SearchHistory } from './SearchHistory'
import { useCurrentWeatherQuery } from '../hooks/useCurrentWeatherQuery'
import { useSearchHistoryStore } from '../store/useSearchHistoryStore'

/**
 * Composes `SearchBar` with the "Today's Weather" result area. Owns the
 * *submitted* search query — set only when Search is clicked, not on every
 * keystroke — and the resulting `useCurrentWeatherQuery` call, then renders
 * whichever state follows from it (idle, loading, error, success).
 *
 * `null` and "submitted with an empty query" both render the same idle
 * state, since `useCurrentWeatherQuery` stays disabled either way — no
 * extra bookkeeping needed to tell the two apart.
 */
export function TodaysWeather() {
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const weatherQuery = useCurrentWeatherQuery(searchQuery)

  const historyEntries = useSearchHistoryStore((state) => state.entries)
  const addHistoryEntry = useSearchHistoryStore((state) => state.addEntry)
  const removeHistoryEntry = useSearchHistoryStore((state) => state.removeEntry)

  // Tracks whether the *currently in-flight/most-recent* query was reached
  // via an actual user-initiated search (Search click or "search again"),
  // as opposed to a passive background refetch of the same query (TanStack
  // Query's default `refetchOnWindowFocus`/`refetchOnReconnect`, not
  // overridden in `src/main.tsx`). `submitSearch` below sets this to `true`
  // at the moment of the user's click; the effect clears it back to `false`
  // once it has recorded that submission's successful result, so a later
  // background refetch producing a new `weatherQuery.data` object for the
  // same query does not re-fire history recording — which previously could
  // silently resurrect an entry the user had just deleted.
  const hasPendingHistorySubmission = useRef(false)

  function submitSearch(query: string) {
    hasPendingHistorySubmission.current = true
    setSearchQuery(query)
  }

  // Synchronizing history (a `localStorage`-backed store, an external system
  // boundary) with the outcome of a query is a legitimate `useEffect` use
  // per this repo's "prefer event handlers, but effects are fine for real
  // synchronization" convention — a plain event-handler callback can't see
  // *query* success (as opposed to "the click happened"). The
  // `hasPendingHistorySubmission` guard above is what actually ties this to
  // user intent; `weatherQuery.data` is still keyed in so this re-checks
  // when a pending submission's result actually arrives, not on every
  // unrelated re-render.
  useEffect(() => {
    if (weatherQuery.status !== 'success' || !searchQuery) return
    if (!hasPendingHistorySubmission.current) return
    hasPendingHistorySubmission.current = false

    const { city, country } = weatherQuery.data
    addHistoryEntry({ label: `${city}, ${country}`, query: searchQuery })
  }, [weatherQuery.status, weatherQuery.data, searchQuery, addHistoryEntry])

  return (
    <>
      {/*
        "Search again" only re-runs the lookup via `submitSearch` — it does
        not also push the history row's text back into `SearchBar`'s input.
        `SearchBar` owns its input as internal, uncontrolled state with no
        `value` prop today, and the mockup doesn't show the input needing to
        reflect a history row's text, so lifting it to controlled state here
        would be a bigger change than this feature needs.
      */}
      <SearchBar onSearch={submitSearch} onClear={() => setSearchQuery(null)} />
      <div className="mt-6">
        {/*
          Branch off `status` rather than `isFetching` so a background
          refetch (e.g. `refetchOnWindowFocus` firing after alt-tabbing back)
          never tears down an already-rendered result — `status` stays
          `'success'`/`'error'` throughout a background refetch, only
          `isFetching` flips. `isFetching` is still checked alongside
          `status === 'pending'` to tell "actually loading" apart from
          "idle, nothing submitted yet" (both are `'pending'`).
        */}
        {weatherQuery.status === 'pending' && weatherQuery.isFetching && (
          <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="glass-panel mx-auto flex w-full max-w-2xl items-center justify-center gap-2 p-8 text-sm font-medium text-muted"
          >
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            Loading today's weather…
          </div>
        )}

        {weatherQuery.status === 'error' && <NotFoundBanner reason={weatherQuery.error.reason} />}

        {weatherQuery.status === 'success' && <WeatherResult weather={weatherQuery.data} />}

        {weatherQuery.status === 'pending' && !weatherQuery.isFetching && (
          <div className="glass-panel mx-auto w-full max-w-2xl p-8 text-center text-sm font-medium text-muted">
            Search a city, country, or state to see today's weather.
          </div>
        )}
      </div>

      {/*
        Loading is announced via the `role="status"` panel above and errors
        via `NotFoundBanner`'s `role="alert"`, but a successful result had no
        equivalent announcement. This element is always rendered (never
        conditionally mounted/unmounted) since screen readers are unreliable
        about announcing a live region that appears and disappears within the
        same update — only its text content changes.
      */}
      <p aria-live="polite" className="sr-only">
        {weatherQuery.status === 'success'
          ? `Weather loaded for ${weatherQuery.data.city}, ${weatherQuery.data.country}`
          : ''}
      </p>

      <SearchHistory entries={historyEntries} onSearchAgain={submitSearch} onDelete={removeHistoryEntry} />
    </>
  )
}
