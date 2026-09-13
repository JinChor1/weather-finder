import type { WeatherResultData } from '../schema'
import { WeatherIcon } from './WeatherIcon'
import { formatTimestamp } from '../utils/formatTimestamp'

interface WeatherResultProps {
  weather: WeatherResultData
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
      className="relative mx-auto w-full max-w-2xl pt-14 pb-2 text-content sm:pt-24"
    >
      <div className="glass-panel relative p-6">
        <div className="absolute -top-12 right-2 h-32 w-32 sm:-top-20 sm:right-6 sm:h-56 sm:w-56">
          <WeatherIcon description={description} className="h-full w-full drop-shadow-lg" />
        </div>

        <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 sm:block ">
          <div className="col-start-1">
            <p className="eyebrow-label">Today's Weather</p>
            <p className="text-6xl leading-none font-bold sm:text-7xl">{Math.round(temperature)}°</p>
            <p className="mt-2 text-sm font-medium text-muted/80">
              H: {Math.round(temperatureHigh)}° L: {Math.round(temperatureLow)}°
            </p>
          </div>

          <div className="col-start-2 flex flex-col items-end gap-1 pt-1 text-right text-sm text-muted/80 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-start sm:gap-x-6 sm:gap-y-1 mt-10 sm:mt-0 sm:text-left">
            <p className="font-semibold text-content">
              {city}, {country}
            </p>
            <p>{formatTimestamp(observedAt, 'upper-spaced')}</p>
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
