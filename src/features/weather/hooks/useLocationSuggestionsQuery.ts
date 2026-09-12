import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  fetchLocationSuggestions,
  shouldRetryOpenWeatherQuery,
  type LocationSuggestion,
  type OpenWeatherApiError,
} from '../api/openWeatherClient'

/** Whatever's currently typed into the search bar's city/country inputs. */
export interface LocationSuggestionsQueryParams {
  city: string
  country: string
}

/**
 * Below this many characters there's not enough to usefully suggest
 * against. Exported so `SearchBar` can gate the dropdown's visibility on
 * the same threshold instead of duplicating the magic number.
 */
export const MIN_CITY_QUERY_LENGTH = 2

/**
 * Fetches location suggestions for the search bar's dropdown from whatever
 * the user has typed so far. Disabled until the city text reaches
 * `MIN_CITY_QUERY_LENGTH`. Intentionally does not debounce — it fires a
 * request on every qualifying keystroke it's given; `SearchBar` debounces
 * the `city`/`country` values before feeding them into this hook.
 */
export function useLocationSuggestionsQuery({
  city,
  country,
}: LocationSuggestionsQueryParams): UseQueryResult<LocationSuggestion[], OpenWeatherApiError> {
  const trimmedCity = city.trim()
  const trimmedCountry = country.trim()

  return useQuery<LocationSuggestion[], OpenWeatherApiError>({
    queryKey: ['location-suggestions', trimmedCity.toLowerCase(), trimmedCountry.toLowerCase()],
    queryFn: () => fetchLocationSuggestions(trimmedCity, trimmedCountry),
    enabled: trimmedCity.length >= MIN_CITY_QUERY_LENGTH,
    retry: shouldRetryOpenWeatherQuery,
  })
}
