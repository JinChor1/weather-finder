import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchCurrentWeather, OpenWeatherApiError, shouldRetryOpenWeatherQuery } from '../api/openWeatherClient'
import type { WeatherResultData } from '../schema'

/** The city/country pair a search is being run for. */
export interface CurrentWeatherSearchParams {
  city: string
  country: string
}

/**
 * Looks up current weather for a city + country pair.
 *
 * Pass `null` (or omit a truthy `city`) to keep the query disabled — nothing
 * fetches until a future task sets real search params from a Search click.
 * The query key is normalized (trimmed, lowercased) so re-searching the same
 * city/country in a different case still hits the cache, which is what
 * makes "search again" from a history row cheap.
 */
export function useCurrentWeatherQuery(
  searchParams: CurrentWeatherSearchParams | null,
): UseQueryResult<WeatherResultData, OpenWeatherApiError> {
  const city = searchParams?.city.trim() ?? ''
  const country = searchParams?.country.trim() ?? ''

  return useQuery<WeatherResultData, OpenWeatherApiError>({
    queryKey: ['current-weather', city.toLowerCase(), country.toLowerCase()],
    queryFn: () => fetchCurrentWeather(city, country),
    enabled: city.length > 0,
    retry: shouldRetryOpenWeatherQuery,
  })
}
