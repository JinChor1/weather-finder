import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import debounce from 'lodash/debounce'
import { Loader2, Search, X } from 'lucide-react'
import { useLocationSuggestionsQuery, MIN_SEARCH_QUERY_LENGTH } from '../hooks/useLocationSuggestionsQuery'
import type { LocationSuggestion } from '../api/openWeatherClient'

/** How long to wait after the user stops typing before refreshing suggestions. */
const SUGGESTIONS_DEBOUNCE_MS = 350

const SUGGESTIONS_PANEL_ID = 'search-location-suggestions'

function suggestionLabel(suggestion: LocationSuggestion): string {
  const state = suggestion.state ? `${suggestion.state}, ` : ''
  return `${suggestion.name}, ${state}${suggestion.country}`
}

interface SearchBarProps {
  /**
   * Called when the Search button is clicked, with the currently typed
   * query (trimmed). The caller (not this component) owns the actual
   * `useCurrentWeatherQuery` call and its resulting state — an empty
   * trimmed query naturally results in a no-op lookup there, since that
   * hook stays disabled on an empty query, so no separate guard is needed
   * here.
   */
  onSearch: (query: string) => void
  /**
   * Called when the Clear button is clicked. This component resets its own
   * input/suggestions state on Clear; `onClear` lets the caller reset
   * whatever *submitted* search/result state it owns in parallel (mirrors
   * `onSearch`'s division of responsibility).
   */
  onClear: () => void
}

/**
 * Search bar for the "Today's Weather" feature. A single free-text
 * City/Country/State input is controlled and drives a debounced
 * location-suggestions dropdown. Search reports the current input up via
 * `onSearch` — it does not run the weather lookup itself, keeping this
 * component focused on input/typing/suggestions.
 */
export function SearchBar({ onSearch, onClear }: SearchBarProps) {
  const [queryInput, setQueryInput] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const fieldsContainerRef = useRef<HTMLDivElement>(null)

  const debouncedCommit = useMemo(
    () => debounce((next: string) => setDebouncedQuery(next), SUGGESTIONS_DEBOUNCE_MS),
    [],
  )

  // Cancel any pending debounced update if the component unmounts before it
  // fires, so it never tries to set state on an unmounted component.
  useEffect(() => () => debouncedCommit.cancel(), [debouncedCommit])

  const suggestionsQuery = useLocationSuggestionsQuery(debouncedQuery)

  const trimmedQuery = queryInput.trim()
  const meetsMinLength = trimmedQuery.length >= MIN_SEARCH_QUERY_LENGTH
  const isPendingDebounce = meetsMinLength && trimmedQuery !== debouncedQuery.trim()
  const isLoading = isPendingDebounce || suggestionsQuery.isFetching
  const suggestions = suggestionsQuery.data ?? []
  const isPanelOpen = isDropdownOpen && meetsMinLength

  let panelRole: 'listbox' | 'status' | 'alert' = 'status'
  if (!isLoading && suggestionsQuery.isError) {
    panelRole = 'alert'
  } else if (!isLoading && suggestionsQuery.isSuccess && suggestions.length > 0) {
    panelRole = 'listbox'
  }

  function commitDebounced(query: string) {
    setActiveIndex(-1)
    debouncedCommit(query)
  }

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value
    setQueryInput(value)
    setIsDropdownOpen(true)
    commitDebounced(value)
  }

  function handleSearchClick() {
    onSearch(queryInput.trim())
  }

  function handleClearClick() {
    setQueryInput('')
    debouncedCommit.cancel()
    setDebouncedQuery('')
    setIsDropdownOpen(false)
    setActiveIndex(-1)
    onClear()
  }

  function handleSelectSuggestion(suggestion: LocationSuggestion) {
    const label = suggestionLabel(suggestion)
    setQueryInput(label)
    debouncedCommit.cancel()
    setDebouncedQuery(label)
    setIsDropdownOpen(false)
    setActiveIndex(-1)
  }

  function handleQueryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsDropdownOpen(false)
      setActiveIndex(-1)
      return
    }

    if (!isPanelOpen || panelRole !== 'listbox') return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      const selected = suggestions[activeIndex]
      if (selected) handleSelectSuggestion(selected)
    }
  }

  // Close the dropdown on an outside click. A `mousedown` listener (rather
  // than relying on `onBlur`) fires before a suggestion's own `onClick`, so
  // clicking a suggestion still registers as a selection instead of being
  // suppressed by a close-on-blur race.
  useEffect(() => {
    if (!isDropdownOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (fieldsContainerRef.current && !fieldsContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isDropdownOpen])

  return (
    <div
      role="search"
      aria-label="Search weather by city, country, or state"
      // `relative z-20` is load-bearing, not decorative: `.glass-panel`'s
      // `backdrop-blur-md` gives this element its own CSS stacking context
      // (any `backdrop-filter`/`filter`/`transform`/etc. other than the
      // initial value does), as does WeatherResult's own `.glass-panel`
      // card. Without an explicit `position` + `z-index` here, this stacking
      // context has no z-index of its own and is ordered against
      // WeatherResult's purely by DOM order — so the suggestions dropdown's
      // `z-50` (below) only ever wins against siblings *inside* this same
      // context, and WeatherResult (rendered after this component) paints
      // over the whole thing regardless of the dropdown's own z-index.
      // Do not remove this as "redundant" without re-checking that.
      className="glass-panel relative z-20 mx-auto flex w-full max-w-2xl flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:rounded-full sm:gap-3 sm:py-2 sm:pl-6 sm:pr-2"
    >
      <div ref={fieldsContainerRef} className="relative flex flex-1 flex-wrap items-center gap-4 sm:flex-nowrap">
        <div className="flex min-w-32 flex-1 flex-col">
          <label htmlFor="search-query" className="field-label">
            City/Country/State
          </label>
          <input
            id="search-query"
            name="query"
            type="text"
            placeholder="e.g. Johor Bahru, Johor, MY"
            autoComplete="off"
            value={queryInput}
            onChange={handleQueryChange}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={handleQueryKeyDown}
            role="combobox"
            aria-expanded={isPanelOpen}
            aria-controls={SUGGESTIONS_PANEL_ID}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${SUGGESTIONS_PANEL_ID}-option-${activeIndex}` : undefined}
            className="w-full bg-transparent text-sm font-medium text-content placeholder:text-content/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
          />
        </div>

        {isPanelOpen && (
          <div
            id={SUGGESTIONS_PANEL_ID}
            role={panelRole}
            aria-label={panelRole === 'listbox' ? 'Location suggestions' : undefined}
            aria-busy={isLoading}
            className="solid-panel absolute inset-x-0 top-full z-50 mt-2 max-h-64 overflow-y-auto p-2 text-sm text-content"
          >
            {isLoading && (
              <div className="flex items-center gap-2 p-2 text-muted">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Searching locations…
              </div>
            )}

            {!isLoading && suggestionsQuery.isError && (
              <p className="p-2 text-danger-content">
                Couldn't load location suggestions. Please try again in a moment.
              </p>
            )}

            {!isLoading && suggestionsQuery.isSuccess && suggestions.length === 0 && (
              <p className="p-2 text-muted">No matching locations found.</p>
            )}

            {!isLoading &&
              suggestionsQuery.isSuccess &&
              suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.lat},${suggestion.lon}`}
                  id={`${SUGGESTIONS_PANEL_ID}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`cursor-pointer rounded-xl p-2 transition hover:bg-secondary ${
                    index === activeIndex ? 'bg-secondary' : ''
                  }`}
                >
                  {suggestionLabel(suggestion)}
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <button type="button" aria-label="Clear" onClick={handleClearClick} className="icon-button">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Search"
          onClick={handleSearchClick}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          <Search aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
