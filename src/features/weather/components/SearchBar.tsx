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
      className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-4 rounded-3xl bg-white/30 p-4 shadow-lg ring-1 ring-white/40 backdrop-blur-md sm:flex-nowrap sm:rounded-full sm:gap-3 sm:py-2 sm:pl-6 sm:pr-2 dark:bg-black/30 dark:ring-white/10"
    >
      <div className="flex flex-1 flex-wrap items-center gap-4 sm:flex-nowrap">
        <div className="flex min-w-32 flex-1 flex-col">
          <label
            htmlFor="search-city"
            className="text-[11px] font-medium tracking-wide text-purple-950/70 dark:text-purple-100/70"
          >
            City
          </label>
          <input
            id="search-city"
            name="city"
            type="text"
            placeholder="e.g. Johor"
            autoComplete="off"
            className="w-full bg-transparent text-sm font-medium text-purple-950 placeholder:text-purple-950/40 focus:outline-none dark:text-white dark:placeholder:text-white/40"
          />
        </div>

        <div
          aria-hidden="true"
          className="hidden h-8 w-px shrink-0 bg-purple-950/15 sm:block dark:bg-white/15"
        />

        <div className="flex min-w-32 flex-1 flex-col">
          <label
            htmlFor="search-country"
            className="text-[11px] font-medium tracking-wide text-purple-950/70 dark:text-purple-100/70"
          >
            Country
          </label>
          <input
            id="search-country"
            name="country"
            type="text"
            placeholder="e.g. MY"
            autoComplete="off"
            className="w-full bg-transparent text-sm font-medium text-purple-950 placeholder:text-purple-950/40 focus:outline-none dark:text-white dark:placeholder:text-white/40"
          />
        </div>
      </div>

      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <button
          type="button"
          aria-label="Clear"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-purple-950/15 bg-white/70 text-purple-900 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Search"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-700 text-white shadow-md transition hover:bg-purple-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-900"
        >
          <Search aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
