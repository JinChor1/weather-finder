import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchCurrentWeather, OpenWeatherApiError, shouldRetryOpenWeatherQuery } from '../api/openWeatherClient'
import type { WeatherResultData } from '../schema'

/**
 * Looks up current weather for a free-text location query (e.g. `"Johor"`,
 * `"Johor, MY"`, `"Johor Bahru, Johor, MY"`).
 *
 * Pass `null` (or an empty/whitespace-only query) to keep the query
 * disabled — nothing fetches until Search is clicked with real input. The
 * query key is normalized (trimmed, lowercased) so re-searching the same
 * text in a different case still hits the cache, which is what makes
 * "search again" from a history row cheap.
 */
export function useCurrentWeatherQuery(query: string | null): UseQueryResult<WeatherResultData, OpenWeatherApiError> {
  const trimmedQuery = query?.trim() ?? ''

  return useQuery<WeatherResultData, OpenWeatherApiError>({
    queryKey: ['current-weather', trimmedQuery.toLowerCase()],
    queryFn: () => fetchCurrentWeather(trimmedQuery),
    enabled: trimmedQuery.length > 0,
    retry: shouldRetryOpenWeatherQuery,
  })
}
