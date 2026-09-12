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
      className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-3xl border border-danger-border bg-danger-surface p-4 text-danger-content shadow-lg backdrop-blur-md"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger-icon" />
      <div>
        <p className="font-semibold">Not found</p>
        <p className="text-sm text-danger-muted">
          We couldn't find weather for that city and country. Check the spelling and try again.
        </p>
      </div>
    </div>
  )
}
