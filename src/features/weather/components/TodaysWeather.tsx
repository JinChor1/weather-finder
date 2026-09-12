import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { WeatherResult } from './WeatherResult'
import { NotFoundBanner } from './NotFoundBanner'
import { useCurrentWeatherQuery } from '../hooks/useCurrentWeatherQuery'

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

  return (
    <>
      <SearchBar onSearch={setSearchQuery} onClear={() => setSearchQuery(null)} />
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
    </>
  )
}
