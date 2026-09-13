import { z } from 'zod'

/**
 * Shape of a single "Today's Weather" result — the fields shown in the
 * mockup's result card (location, condition heading, description,
 * temperature range, humidity, observed-at time).
 *
 * This is the shared contract between the static result UI built here and
 * the future OpenWeatherMap fetch, which will parse the API response into
 * this same shape before it reaches any component.
 */
export const weatherResultSchema = z.object({
  city: z.string().min(1),
  country: z.string().min(1),
  /** OpenWeatherMap's short condition label, e.g. "Clouds", "Clear". */
  condition: z.string().min(1),
  /** OpenWeatherMap's longer condition description, e.g. "scattered clouds". */
  description: z.string().min(1),
  /** Current temperature, in °C. */
  temperature: z.number(),
  /** Today's forecast high, in °C. */
  temperatureHigh: z.number(),
  /** Today's forecast low, in °C. */
  temperatureLow: z.number(),
  /** Relative humidity, as a whole-number percentage (0-100). */
  humidity: z.number().min(0).max(100),
  /** ISO 8601 timestamp for when this reading was observed. */
  observedAt: z.string(),
})

export type WeatherResultData = z.infer<typeof weatherResultSchema>
