import { AlertTriangle } from 'lucide-react'

/**
 * Error-state fallback shown when a search returns no result (invalid
 * city/country, or an API error). Adapts the wireframe's plain "Not found"
 * banner to the frosted-glass pill language already used by `SearchBar`/
 * `ThemeToggle`, but in red/rose tones so it reads unmistakably as an
 * error rather than another info panel.
 *
 * Static today — `role="alert"` is set up in advance for when the future
 * search/error-state task conditionally renders this.
 */
export function NotFoundBanner() {
  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-3xl border border-rose-500/50 bg-rose-50/80 p-4 text-rose-900 shadow-lg backdrop-blur-md dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-100"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
      <div>
        <p className="font-semibold">Not found</p>
        <p className="text-sm text-rose-800/90 dark:text-rose-200/80">
          We couldn't find weather for that city and country. Check the spelling and try again.
        </p>
      </div>
    </div>
  )
}
