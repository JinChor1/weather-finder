/**
 * Buckets OpenWeatherMap's longer `description` strings (e.g. "scattered
 * clouds", "shower rain") into one of the layered icon compositions
 * `WeatherIcon` knows how to render. Matching happens at the `description`
 * granularity rather than the shorter `condition` label, since several
 * distinct descriptions (e.g. "few clouds" vs "scattered clouds" vs "broken
 * clouds") all share `condition: "Clouds"` but need different art.
 *
 * See README.md's "Weather icon mapping" section for the full table and the
 * rationale for the "other" fallback — this module is the single source of
 * truth for that mapping, keep both in sync if either changes.
 */
export type WeatherIconBucket =
  | 'clear'
  | 'few-clouds'
  | 'scattered-clouds'
  | 'broken-clouds'
  | 'shower-or-thunderstorm'
  | 'rain'
  | 'other'

const CLEAR_DESCRIPTIONS = new Set(['clear sky'])

const FEW_CLOUDS_DESCRIPTIONS = new Set(['few clouds'])

const SCATTERED_CLOUDS_DESCRIPTIONS = new Set(['scattered clouds'])

// "overcast clouds" is folded in here rather than left in the "other"
// fallback: visually it's the same full-cloud-cover case as "broken
// clouds" (just one step heavier), and no dedicated art exists for either.
const BROKEN_CLOUDS_DESCRIPTIONS = new Set(['broken clouds', 'overcast clouds'])

// Thunderstorm group (OpenWeatherMap's 2xx codes) in full, plus the
// "shower rain" subset of the rain group (5xx) — grouped together per the
// client's spec; both get the greyscale cloud treatment.
const SHOWER_OR_THUNDERSTORM_DESCRIPTIONS = new Set([
  'thunderstorm with light rain',
  'thunderstorm with rain',
  'thunderstorm with heavy rain',
  'light thunderstorm',
  'thunderstorm',
  'heavy thunderstorm',
  'ragged thunderstorm',
  'thunderstorm with light drizzle',
  'thunderstorm with drizzle',
  'thunderstorm with heavy drizzle',
  'light intensity shower rain',
  'shower rain',
  'heavy intensity shower rain',
  'ragged shower rain',
])

// The remaining, non-shower descriptions of the rain group (5xx) — plain
// rain, gets the sunny-rain treatment instead of the greyscale one.
const RAIN_DESCRIPTIONS = new Set([
  'light rain',
  'moderate rain',
  'heavy intensity rain',
  'very heavy rain',
  'extreme rain',
  'freezing rain',
])

export function getWeatherIconBucket(description: string): WeatherIconBucket {
  const normalized = description.trim().toLowerCase()

  if (CLEAR_DESCRIPTIONS.has(normalized)) return 'clear'
  if (FEW_CLOUDS_DESCRIPTIONS.has(normalized)) return 'few-clouds'
  if (SCATTERED_CLOUDS_DESCRIPTIONS.has(normalized)) return 'scattered-clouds'
  if (BROKEN_CLOUDS_DESCRIPTIONS.has(normalized)) return 'broken-clouds'
  if (SHOWER_OR_THUNDERSTORM_DESCRIPTIONS.has(normalized)) return 'shower-or-thunderstorm'
  if (RAIN_DESCRIPTIONS.has(normalized)) return 'rain'

  // Drizzle (3xx), snow (6xx), atmosphere (7xx — mist/smoke/haze/fog/dust/
  // sand/ash/squalls/tornado), and anything else OpenWeatherMap returns
  // that isn't one of the above: no dedicated art exists yet, so this
  // reuses the generic cloud+sun composition.
  return 'other'
}
