import { z } from 'zod'

/**
 * Zod schemas for the *raw* shapes OpenWeatherMap actually sends back.
 *
 * These are deliberately separate from `../schema.ts` (`weatherResultSchema`),
 * which describes the shape the UI renders — that's the contract on the
 * "our side" of the mapping. These schemas exist to validate the "their
 * side": the trust-boundary check on whatever the API responds with, before
 * `openWeatherClient.ts` maps it into our own shape.
 *
 * Only the fields this app actually reads are declared — OpenWeatherMap's
 * responses have plenty more (coord, wind, clouds, sys.sunrise, ...) that
 * aren't needed here. Zod ignores extra keys by default, so this still
 * validates real responses without over-specifying them.
 */

/**
 * Success body from the Current Weather Data endpoint:
 * `GET /data/2.5/weather?q={city},{countryCode}&units=metric&appid={key}`
 */
export const currentWeatherResponseSchema = z.object({
  name: z.string(),
  sys: z.object({
    country: z.string(),
  }),
  /** OpenWeatherMap always returns at least one condition entry. */
  weather: z
    .array(
      z.object({
        main: z.string(),
        description: z.string(),
      }),
    )
    .min(1),
  main: z.object({
    /** °C, thanks to `units=metric` on the request. */
    temp: z.number(),
    temp_min: z.number(),
    temp_max: z.number(),
    humidity: z.number().min(0).max(100),
  }),
  /** Unix timestamp, seconds. */
  dt: z.number(),
})

export type CurrentWeatherResponse = z.infer<typeof currentWeatherResponseSchema>

/**
 * Error body OpenWeatherMap returns for non-2xx responses, e.g.
 * `{ "cod": "404", "message": "city not found" }`. Note `cod` is a string
 * here even though the success body's top-level `cod` (unused above) is a
 * number — the two response shapes are unrelated, so callers must branch on
 * `response.ok`/`response.status` before ever trying to parse a body, never
 * try the success schema first and fall back to this one.
 */
export const openWeatherErrorResponseSchema = z.object({
  cod: z.union([z.string(), z.number()]),
  message: z.string(),
})

export type OpenWeatherErrorResponse = z.infer<typeof openWeatherErrorResponseSchema>

/**
 * A single match from the Geocoding API's direct endpoint:
 * `GET /geo/1.0/direct?q={query}&limit=5&appid={key}`
 */
export const geocodingResultSchema = z.object({
  name: z.string(),
  local_names: z.record(z.string(), z.string()).optional(),
  lat: z.number(),
  lon: z.number(),
  country: z.string(),
  state: z.string().optional(),
})

/** A `[]` response (no matches) is valid, not an error. */
export const geocodingResponseSchema = z.array(geocodingResultSchema)

export type GeocodingResult = z.infer<typeof geocodingResultSchema>

/**
 * Simplified, validated shape `openWeatherClient.ts` maps a `GeocodingResult`
 * into for the search bar's suggestion dropdown — drops `local_names`, which
 * nothing in this app renders.
 */
export const locationSuggestionSchema = z.object({
  name: z.string(),
  country: z.string(),
  state: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
})

export type LocationSuggestion = z.infer<typeof locationSuggestionSchema>
