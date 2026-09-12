import { useLayoutEffect, useRef, useState } from 'react'
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
 * Where focus should land after a DOM removal this component triggers
 * (deleting a row, or "Show more" unmounting itself once every entry is
 * shown) — computed at the moment of the triggering click, then applied
 * once the resulting re-render has actually happened.
 */
type PendingFocusTarget = { type: 'row'; id: string } | { type: 'list' } | { type: 'empty' }

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

  const listRef = useRef<HTMLUListElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const pendingFocusRef = useRef<PendingFocusTarget | null>(null)

  // Deleting a row (or "Show more" revealing the final page) removes a
  // focused element from the DOM with no help from the browser — focus
  // would otherwise silently drop to `<body>`. The click handlers below
  // record *where* focus should go next before triggering the removal;
  // this effect applies it once the removal has actually rendered. DOM
  // focus is an external system, so synchronizing it here (rather than in
  // an event handler) matches this repo's `useEffect` convention —
  // `useLayoutEffect` specifically so the move happens before the browser
  // paints the post-removal frame.
  useLayoutEffect(() => {
    const pending = pendingFocusRef.current
    if (!pending) return
    pendingFocusRef.current = null

    if (pending.type === 'row') {
      const button = deleteButtonRefs.current.get(pending.id)
      if (button) {
        button.focus()
        return
      }
    }

    if (pending.type === 'list') {
      listRef.current?.focus()
      return
    }

    headingRef.current?.focus()
  }, [entries, visibleCount])

  function registerDeleteButtonRef(id: string, node: HTMLButtonElement | null) {
    if (node) {
      deleteButtonRefs.current.set(id, node)
    } else {
      deleteButtonRefs.current.delete(id)
    }
  }

  function handleDelete(id: string) {
    const index = entries.findIndex((entry) => entry.id === id)
    const nextEntry = index >= 0 && index + 1 < shownCount ? entries[index + 1] : undefined
    const previousEntry = !nextEntry && index > 0 ? entries[index - 1] : undefined
    const target = nextEntry ?? previousEntry

    pendingFocusRef.current = target ? { type: 'row', id: target.id } : { type: 'empty' }
    onDelete(id)
  }

  function handleShowMore() {
    const nextShownCount = Math.min(visibleCount + HISTORY_PAGE_SIZE, entries.length)
    // Once this click reveals every remaining entry, the button itself is
    // about to unmount (see `hasMore` above) — move focus to the list
    // container instead of letting it drop to `<body>`. Otherwise the
    // button stays mounted and keeps its own focus naturally.
    if (nextShownCount >= entries.length) {
      pendingFocusRef.current = { type: 'list' }
    }
    setVisibleCount((count) => count + HISTORY_PAGE_SIZE)
  }

  return (
    <section aria-label="Search history" className="glass-panel mx-auto mt-6 w-full max-w-2xl p-6 text-content">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="eyebrow-label mb-4 rounded-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
      >
        Search History
      </h2>

      {/*
        Announces row deletions and the list-becomes-empty transition to
        screen-reader users, mirroring `TodaysWeather.tsx`'s `role="status"`/
        `aria-live="polite"` pattern for its own loading/success states. A
        short summary sentence (rather than the row/empty-state markup
        itself living inside the live region) announces cleanly on every
        change without the whole remaining list being re-read on each delete.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {entries.length === 0
          ? 'Search history is empty.'
          : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} in search history.`}
      </p>

      {entries.length === 0 ? (
        // This is the *only* content of the empty state (the "No Record"
        // message requirement #5 calls for), sitting on `.glass-panel` — a
        // ~30%-opaque surface over the full-bleed photographic background.
        // `text-muted/70` (this component's original recipe, matching
        // `.field-label`) stacks a third layer of transparency on top of
        // that, landing well under 4.5:1 against a light sky region behind
        // the panel. `text-content` at full opacity is the same color this
        // repo already renders directly on `.glass-panel` elsewhere (e.g.
        // `WeatherResult`'s location name) with no opacity modifier, so it's
        // reusing an already-vetted-at-full-strength token rather than a
        // one-off color.
        <p className="py-6 text-center text-sm font-semibold text-content">No Record</p>
      ) : (
        <>
          <ul ref={listRef} tabIndex={-1} className="divide-y divide-content/10 focus:outline-none">
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
                    ref={(node) => registerDeleteButtonRef(entry.id, node)}
                    aria-label={`Delete ${entry.label} from history`}
                    onClick={() => handleDelete(entry.id)}
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
                onClick={handleShowMore}
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
