import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  fetchLocationSuggestions,
  shouldRetryOpenWeatherQuery,
  type LocationSuggestion,
  type OpenWeatherApiError,
} from '../api/openWeatherClient'

/**
 * Below this many characters there's not enough to usefully suggest
 * against. Exported so `SearchBar` can gate the dropdown's visibility on
 * the same threshold instead of duplicating the magic number.
 */
export const MIN_SEARCH_QUERY_LENGTH = 2

/**
 * Fetches location suggestions for the search bar's dropdown from whatever
 * free-text query the user has typed so far. Disabled until the trimmed
 * query reaches `MIN_SEARCH_QUERY_LENGTH`. Intentionally does not debounce —
 * it fires a request on every qualifying keystroke it's given; `SearchBar`
 * debounces the query before feeding it into this hook.
 */
export function useLocationSuggestionsQuery(query: string): UseQueryResult<LocationSuggestion[], OpenWeatherApiError> {
  const trimmedQuery = query.trim()

  return useQuery<LocationSuggestion[], OpenWeatherApiError>({
    queryKey: ['location-suggestions', trimmedQuery.toLowerCase()],
    queryFn: () => fetchLocationSuggestions(trimmedQuery),
    enabled: trimmedQuery.length >= MIN_SEARCH_QUERY_LENGTH,
    retry: shouldRetryOpenWeatherQuery,
  })
}
