/**
 * Maps an OpenWeatherMap-style condition label to one of the two
 * illustration assets we currently have. Only "Clear" has a dedicated
 * glyph (the cloud-over-sun combo); everything else falls back to the
 * plain rain cloud.
 *
 * More conditions (thunderstorm, snow, etc.) may get their own art later —
 * add them to `ICON_SRC_BY_CONDITION` when that happens, no other changes
 * needed.
 */
const ICON_SRC_BY_CONDITION: Record<string, string> = {
  clear: '/sun.png',
}

const DEFAULT_ICON_SRC = '/cloud.png'

interface WeatherIconProps {
  /** OpenWeatherMap-style condition label, e.g. "Clouds", "Clear". */
  condition: string
  className?: string
}

export function WeatherIcon({ condition, className }: WeatherIconProps) {
  const src = ICON_SRC_BY_CONDITION[condition.toLowerCase()] ?? DEFAULT_ICON_SRC

  return <img src={src} alt={`${condition} weather`} className={className} />
}
