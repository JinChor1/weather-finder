import { weatherResultSchema, type WeatherResultData } from '../schema'
import {
  currentWeatherResponseSchema,
  geocodingResponseSchema,
  openWeatherErrorResponseSchema,
  type LocationSuggestion,
} from './openWeatherSchemas'

export type { LocationSuggestion } from './openWeatherSchemas'

const CURRENT_WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather'
const GEOCODING_URL = 'https://api.openweathermap.org/geo/1.0/direct'

/** Distinguishes *why* a request failed, so callers can decide what to show. */
export type OpenWeatherErrorReason =
  | 'not-found'
  | 'unauthorized'
  | 'rate-limited'
  | 'network'
  | 'invalid-response'
  | 'unknown'

/**
 * Typed error thrown by every function in this module. `status` is the HTTP
 * status code (`0` for a network failure that never got a response), and
 * `reason` is the coarse-grained bucket a caller/hook should branch on —
 * in particular, `reason === 'not-found'` is the "show NotFoundBanner"
 * signal a future task wires up, distinct from every other failure mode.
 */
export class OpenWeatherApiError extends Error {
  readonly status: number
  readonly reason: OpenWeatherErrorReason

  constructor(message: string, status: number, reason: OpenWeatherErrorReason) {
    super(message)
    this.name = 'OpenWeatherApiError'
    this.status = status
    this.reason = reason
  }
}

function getApiKey(): string {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
  if (!apiKey) {
    throw new OpenWeatherApiError(
      'Missing VITE_OPENWEATHER_API_KEY — copy .env.example to .env and set a real key.',
      0,
      'unauthorized',
    )
  }
  return apiKey
}

/**
 * Doesn't retry a request that's guaranteed to fail again the same way — a
 * 4xx (not found, bad key, rate limited) won't change on retry, so retrying
 * just burns calls against a free-tier API key. Anything else (network blip,
 * 5xx) gets a couple of retries via the default backoff. Shared by both
 * `useCurrentWeatherQuery` and `useLocationSuggestionsQuery`'s `retry` option.
 */
export function shouldRetryOpenWeatherQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof OpenWeatherApiError && error.status >= 400 && error.status < 500) {
    return false
  }
  return failureCount < 2
}

function reasonForStatus(status: number): OpenWeatherErrorReason {
  if (status === 404) return 'not-found'
  if (status === 401) return 'unauthorized'
  if (status === 429) return 'rate-limited'
  return 'unknown'
}

async function fetchJson(url: string): Promise<{ response: Response; body: unknown }> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new OpenWeatherApiError('Network error while contacting OpenWeatherMap.', 0, 'network')
  }

  // OpenWeatherMap's error bodies are still JSON, so parse regardless of
  // `response.ok` — but never assume the parse succeeds (e.g. a 5xx from an
  // upstream proxy might not be JSON at all).
  const body: unknown = await response.json().catch(() => null)
  return { response, body }
}

function mapToWeatherResultData(data: ReturnType<typeof currentWeatherResponseSchema.parse>): WeatherResultData {
  return weatherResultSchema.parse({
    city: data.name,
    country: data.sys.country,
    condition: data.weather[0].main,
    description: data.weather[0].description,
    temperature: data.main.temp,
    temperatureHigh: data.main.temp_max,
    temperatureLow: data.main.temp_min,
    humidity: data.main.humidity,
    observedAt: new Date(data.dt * 1000).toISOString(),
  })
}

/**
 * Looks up current weather for a free-text location query (e.g. `"Johor"`,
 * `"Johor, MY"`, `"Johor Bahru, Johor, MY"`) via the Current Weather Data
 * endpoint, and maps the response into the app's own `WeatherResultData`
 * shape (see `../schema.ts`).
 *
 * Throws `OpenWeatherApiError` on any failure: a 404 (location not found)
 * maps to `reason: 'not-found'`; anything else (bad key, rate limit, network
 * failure, or a response that doesn't match the expected shape) maps to a
 * different `reason` so callers can tell the two apart.
 */
export async function fetchCurrentWeather(query: string): Promise<WeatherResultData> {
  const apiKey = getApiKey()
  const trimmedQuery = query.trim()
  const url = `${CURRENT_WEATHER_URL}?q=${encodeURIComponent(trimmedQuery)}&units=metric&appid=${apiKey}`

  const { response, body } = await fetchJson(url)

  if (!response.ok) {
    const parsedError = openWeatherErrorResponseSchema.safeParse(body)
    const message = parsedError.success ? parsedError.data.message : `Request failed with status ${response.status}.`
    throw new OpenWeatherApiError(message, response.status, reasonForStatus(response.status))
  }

  const parsed = currentWeatherResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new OpenWeatherApiError(
      'Unexpected response shape from OpenWeatherMap current weather API.',
      response.status,
      'invalid-response',
    )
  }

  return mapToWeatherResultData(parsed.data)
}

/**
 * Looks up location suggestions for the search bar's dropdown via the
 * Geocoding API's direct endpoint, given whatever the user has typed so far
 * into the single search input.
 *
 * Assumption: OpenWeatherMap's geocoding API only exposes a single free-text
 * `q` param that resolves a place name (optionally `"city,countryCode"` or
 * `"city,state,countryCode"`) to coordinates — there's no separate
 * country-name lookup. Passing the raw typed text straight through as `q` is
 * therefore the correct way to use this API, not a workaround.
 *
 * An empty match array is a valid "no suggestions yet" result, not an
 * error — only network/HTTP/shape failures throw `OpenWeatherApiError`.
 */
export async function fetchLocationSuggestions(query: string): Promise<LocationSuggestion[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  const apiKey = getApiKey()
  const url = `${GEOCODING_URL}?q=${encodeURIComponent(trimmedQuery)}&limit=5&appid=${apiKey}`

  const { response, body } = await fetchJson(url)

  if (!response.ok) {
    throw new OpenWeatherApiError(
      `Location suggestion request failed with status ${response.status}.`,
      response.status,
      reasonForStatus(response.status),
    )
  }

  const parsed = geocodingResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new OpenWeatherApiError(
      'Unexpected response shape from OpenWeatherMap geocoding API.',
      response.status,
      'invalid-response',
    )
  }

  return parsed.data.map(({ name, country, state, lat, lon }) => ({ name, country, state, lat, lon }))
}
