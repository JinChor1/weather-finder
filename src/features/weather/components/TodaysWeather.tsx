import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { WeatherResult } from './WeatherResult'
import { NotFoundBanner } from './NotFoundBanner'
import { useCurrentWeatherQuery, type CurrentWeatherSearchParams } from '../hooks/useCurrentWeatherQuery'

/**
 * Composes `SearchBar` with the "Today's Weather" result area. Owns the
 * *submitted* search params — set only when Search is clicked, not on
 * every keystroke — and the resulting `useCurrentWeatherQuery` call, then
 * renders whichever state follows from it (idle, loading, error, success).
 *
 * `null` and "submitted with an empty city" both render the same idle
 * state, since `useCurrentWeatherQuery` stays disabled either way — no
 * extra bookkeeping needed to tell the two apart.
 */
export function TodaysWeather() {
  const [searchParams, setSearchParams] = useState<CurrentWeatherSearchParams | null>(null)
  const weatherQuery = useCurrentWeatherQuery(searchParams)

  return (
    <>
      <SearchBar onSearch={setSearchParams} />
      <div className="mt-6">
        {weatherQuery.isFetching && (
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

        {!weatherQuery.isFetching && weatherQuery.isError && <NotFoundBanner reason={weatherQuery.error.reason} />}

        {!weatherQuery.isFetching && weatherQuery.isSuccess && <WeatherResult weather={weatherQuery.data} />}

        {!weatherQuery.isFetching && !weatherQuery.isError && !weatherQuery.isSuccess && (
          <div className="glass-panel mx-auto w-full max-w-2xl p-8 text-center text-sm font-medium text-muted">
            Search a city and country to see today's weather.
          </div>
        )}
      </div>
    </>
  )
}
