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

/** Below this many characters there's not enough to usefully suggest against. */
const MIN_CITY_QUERY_LENGTH = 2

/**
 * Fetches location suggestions for the search bar's dropdown from whatever
 * the user has typed so far. Disabled until the city text reaches
 * `MIN_CITY_QUERY_LENGTH`, so a future task can feed this hook live input
 * state directly without extra guarding.
 *
 * TODO(future task): this intentionally does not debounce — it fires a
 * request on every qualifying keystroke. Debouncing the `city`/`country`
 * values before they reach this hook is an input-layer concern for whoever
 * wires this into `SearchBar`.
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
