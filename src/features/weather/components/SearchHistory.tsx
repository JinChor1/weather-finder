import { useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import type { SearchHistoryEntry } from '../store/useSearchHistoryStore'

/** How many rows are visible initially, and how many more "Show more" reveals each click. */
const HISTORY_PAGE_SIZE = 5

interface SearchHistoryProps {
  entries: SearchHistoryEntry[]
  onSearchAgain: (query: string) => void
  onDelete: (id: string) => void
}

/**
 * Formats an ISO timestamp as "MM-DD-YYYY hh:mmam/pm", matching the
 * mockup's history-row timestamp style (`WeatherResult`'s equivalent
 * formatter uses the same UTC-getter approach for a deterministic display
 * regardless of the viewer's/test runner's local timezone, but keeps
 * `AM`/`PM` uppercase with a space — this one follows the history mockup's
 * own lowercase, no-space style instead, e.g. "01-09-2022 09:41am").
 */
function formatSearchedAt(searchedAt: string): string {
  const date = new Date(searchedAt)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  const hours24 = date.getUTCHours()
  const period = hours24 >= 12 ? 'pm' : 'am'
  const hours12 = String(hours24 % 12 || 12).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')

  return `${month}-${day}-${year} ${hours12}:${minutes}${period}`
}

/**
 * "Search History" panel below the weather result. Shows up to
 * `HISTORY_PAGE_SIZE` rows initially, with a "Show more" button revealing
 * `HISTORY_PAGE_SIZE` more at a time (up to however many entries exist,
 * capped at `MAX_SEARCH_HISTORY_SIZE` by the store). How many rows are
 * currently shown is local, UI-only display state — not persisted, and
 * unrelated to the history data itself.
 */
export function SearchHistory({ entries, onSearchAgain, onDelete }: SearchHistoryProps) {
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE)

  // Clamp rather than store the true "shown count" so a shrinking history
  // (after a delete) never leaves this above the array length — if it did,
  // `visibleEntries` would just render fewer rows anyway, but the "Show
  // more" button's own visibility check needs an accurate comparison.
  const shownCount = Math.min(visibleCount, entries.length)
  const visibleEntries = entries.slice(0, shownCount)
  const hasMore = shownCount < entries.length

  return (
    <section aria-label="Search history" className="glass-panel mx-auto mt-6 w-full max-w-2xl p-6 text-content">
      <h2 className="eyebrow-label mb-4">Search History</h2>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm font-medium text-muted/70">No Record</p>
      ) : (
        <>
          <ul className="divide-y divide-content/10">
            {visibleEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{entry.label}</p>
                  <p className="text-sm text-muted/80">{formatSearchedAt(entry.searchedAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Search again for ${entry.label}`}
                    onClick={() => onSearchAgain(entry.query)}
                    className="icon-button h-9 w-9"
                  >
                    <Search aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${entry.label} from history`}
                    onClick={() => onDelete(entry.id)}
                    className="icon-button h-9 w-9"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + HISTORY_PAGE_SIZE)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-primary transition hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Show more
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
