import { Search, X } from 'lucide-react'

/**
 * Static search bar for the "Today's Weather" feature.
 *
 * Presentational only for now: uncontrolled inputs, no submit/clear
 * behavior wired up yet. State, validation and API integration land in a
 * later task.
 */
export function SearchBar() {
  return (
    <div
      role="search"
      aria-label="Search weather by city and country"
      className="glass-panel mx-auto flex w-full max-w-2xl flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:rounded-full sm:gap-3 sm:py-2 sm:pl-6 sm:pr-2"
    >
      <div className="flex flex-1 flex-wrap items-center gap-4 sm:flex-nowrap">
        <div className="flex min-w-32 flex-1 flex-col">
          <label htmlFor="search-city" className="field-label">
            City
          </label>
          <input
            id="search-city"
            name="city"
            type="text"
            placeholder="e.g. Johor"
            autoComplete="off"
            className="w-full bg-transparent text-sm font-medium text-content placeholder:text-content/40 focus:outline-none"
          />
        </div>

        <div aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-content/15 sm:block" />

        <div className="flex min-w-32 flex-1 flex-col">
          <label htmlFor="search-country" className="field-label">
            Country
          </label>
          <input
            id="search-country"
            name="country"
            type="text"
            placeholder="e.g. MY"
            autoComplete="off"
            className="w-full bg-transparent text-sm font-medium text-content placeholder:text-content/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <button type="button" aria-label="Clear" className="icon-button">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Search"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          <Search aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
