import { AlertTriangle } from 'lucide-react'
import type { OpenWeatherErrorReason } from '../api/openWeatherClient'

interface NotFoundBannerProps {
  /**
   * Which failure this banner represents. Defaults to `'not-found'`, whose
   * copy is pixel-identical to this component's original hardcoded text —
   * every other reason gets copy that's accurate for that failure instead
   * of misleadingly claiming the city wasn't found.
   */
  reason?: OpenWeatherErrorReason
}

const COPY_BY_REASON: Record<OpenWeatherErrorReason, { title: string; message: string }> = {
  'not-found': {
    title: 'Not found',
    message: "We couldn't find weather for that city and country. Check the spelling and try again.",
  },
  network: {
    title: 'Network error',
    message: "We couldn't reach the weather service. Check your connection and try again.",
  },
  'rate-limited': {
    title: 'Too many requests',
    message: "We're being rate-limited by the weather service. Please wait a moment and try again.",
  },
  unauthorized: {
    title: 'Service unavailable',
    message: 'The weather service rejected our request. Please try again later.',
  },
  'invalid-response': {
    title: 'Something went wrong',
    message: 'We received an unexpected response from the weather service. Please try again.',
  },
  unknown: {
    title: 'Something went wrong',
    message: "We couldn't load the weather right now. Please try again in a moment.",
  },
}

/**
 * Error-state fallback shown when a search fails (invalid city/country, or
 * an API error). Adapts the wireframe's plain "Not found" banner to the
 * frosted-glass pill language already used by `SearchBar`/`ThemeToggle`,
 * but in red/rose tones so it reads unmistakably as an error rather than
 * another info panel.
 *
 * `role="alert"` ensures assistive tech announces whichever copy is shown.
 */
export function NotFoundBanner({ reason = 'not-found' }: NotFoundBannerProps) {
  const { title, message } = COPY_BY_REASON[reason]

  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-3xl border border-danger-border bg-danger-surface p-4 text-danger-content shadow-lg backdrop-blur-md"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger-icon" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-danger-muted">{message}</p>
      </div>
    </div>
  )
}
