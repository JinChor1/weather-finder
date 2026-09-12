import type { WeatherResultData } from '../schema'
import { WeatherIcon } from './WeatherIcon'

interface WeatherResultProps {
  weather: WeatherResultData
}

/**
 * Formats an ISO timestamp as "MM-DD-YYYY hh:mm AM/PM", matching the
 * mockup's timestamp style. Uses UTC getters so the displayed time is
 * deterministic regardless of the viewer's/test runner's local timezone.
 */
function formatObservedAt(observedAt: string): string {
  const date = new Date(observedAt)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  const hours24 = date.getUTCHours()
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = String(hours24 % 12 || 12).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')

  return `${month}-${day}-${year} ${hours12}:${minutes} ${period}`
}

/**
 * Static "Today's Weather" result display. Purely presentational — takes
 * the weather data as a prop and renders it per the Figma mockup: a
 * rounded, translucent glass card (same visual language as `SearchBar`/
 * `ThemeToggle`/`NotFoundBanner`) holding a large current temperature with
 * the high/low beneath it, a large condition icon that overflows above the
 * card's top edge, and a secondary line of location/time/humidity/condition.
 *
 * Two-column on small screens (temperature block left, meta info
 * right-aligned) collapsing into a stacked block with a wrapping meta row
 * from `sm:` up, matching the mobile vs. desktop mockups' hierarchy.
 */
export function WeatherResult({ weather }: WeatherResultProps) {
  const { city, country, condition, description, temperature, temperatureHigh, temperatureLow, humidity, observedAt } =
    weather

  return (
    <section
      aria-label="Today's weather"
      className="relative mx-auto w-full max-w-2xl px-4 pt-14 pb-2 text-purple-950 sm:pt-24 dark:text-white"
    >
      <div className="relative rounded-3xl bg-white/30 p-6 shadow-lg ring-1 ring-white/40 backdrop-blur-md dark:bg-black/30 dark:ring-white/10">
        <div className="absolute -top-12 right-2 h-32 w-32 sm:-top-20 sm:right-6 sm:h-56 sm:w-56">
          <WeatherIcon condition={condition} className="h-full w-full object-contain drop-shadow-lg" />
        </div>

        <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 pr-32 sm:block sm:pr-0">
          <div className="col-start-1">
            <p className="text-xs font-medium tracking-wide text-purple-950/60 uppercase dark:text-purple-200/70">
              Today's Weather
            </p>
            <p className="text-6xl leading-none font-bold sm:text-7xl">{Math.round(temperature)}°</p>
            <p className="mt-2 text-sm font-medium text-purple-950/80 dark:text-purple-100/80">
              H: {Math.round(temperatureHigh)}° L: {Math.round(temperatureLow)}°
            </p>
          </div>

          <div className="col-start-2 flex flex-col items-end gap-1 pt-1 text-right text-sm text-purple-950/80 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-start sm:gap-x-6 sm:gap-y-1 sm:pt-0 sm:text-left dark:text-purple-100/80">
            <p className="font-semibold text-purple-950 dark:text-white">
              {city}, {country}
            </p>
            <p>{formatObservedAt(observedAt)}</p>
            <p>Humidity: {humidity}%</p>
            <p>{condition}</p>
          </div>
        </div>

        {/*
          The Figma mockup has no visible slot for OpenWeatherMap's longer
          description (distinct from the short `condition` word rendered
          above) — keep it available to assistive tech without adding
          visual chrome the mockup doesn't have.
        */}
        <p className="sr-only">{description}</p>
      </div>
    </section>
  )
}
