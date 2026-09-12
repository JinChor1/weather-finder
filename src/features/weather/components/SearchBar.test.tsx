import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SearchBar } from './SearchBar'
import type { LocationSuggestion, OpenWeatherApiError } from '../api/openWeatherClient'

type SuggestionsResult = UseQueryResult<LocationSuggestion[], OpenWeatherApiError>

const mockUseLocationSuggestionsQuery = vi.fn<(query: string) => SuggestionsResult>()

vi.mock('../hooks/useLocationSuggestionsQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useLocationSuggestionsQuery')>()
  return {
    ...actual,
    useLocationSuggestionsQuery: (query: string) => mockUseLocationSuggestionsQuery(query),
  }
})

const DEBOUNCE_MS = 350

function makeResult(overrides: Partial<SuggestionsResult>): SuggestionsResult {
  return {
    data: undefined,
    isFetching: false,
    isPending: true,
    isSuccess: false,
    isError: false,
    error: null,
    status: 'pending',
    fetchStatus: 'idle',
    ...overrides,
  } as SuggestionsResult
}

function renderSearchBar(onSearch: (query: string) => void = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<SearchBar onSearch={onSearch} />, { wrapper: Wrapper })
}

/** Types into the search input and flushes the debounce so the mocked hook's latest return value drives the UI. */
function typeQueryAndSettle(value: string) {
  fireEvent.change(screen.getByLabelText('City/Country/State'), { target: { value } })
  act(() => {
    vi.advanceTimersByTime(DEBOUNCE_MS)
  })
}

const singapore: LocationSuggestion = { name: 'Singapore', country: 'SG', state: undefined, lat: 1.35, lon: 103.82 }
const johorBahru: LocationSuggestion = { name: 'Johor Bahru', country: 'MY', state: 'Johor', lat: 1.46, lon: 103.76 }

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUseLocationSuggestionsQuery.mockReset()
    mockUseLocationSuggestionsQuery.mockReturnValue(makeResult({}))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not show a dropdown below the minimum query length', () => {
    renderSearchBar()

    fireEvent.change(screen.getByLabelText('City/Country/State'), { target: { value: 'J' } })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('debounces updates so the query only fires after the user stops typing', () => {
    renderSearchBar()

    fireEvent.change(screen.getByLabelText('City/Country/State'), { target: { value: 'Jo' } })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS - 50)
    })
    fireEvent.change(screen.getByLabelText('City/Country/State'), { target: { value: 'Johor' } })

    // Still within the debounce window since the last keystroke — the
    // committed value passed into the hook must not have updated yet.
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS - 50)
    })
    expect(mockUseLocationSuggestionsQuery).toHaveBeenLastCalledWith('')

    // Now past the full delay since the last keystroke.
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(mockUseLocationSuggestionsQuery).toHaveBeenLastCalledWith('Johor')
  })

  it('shows a loading indicator while suggestions are pending', () => {
    mockUseLocationSuggestionsQuery.mockReturnValue(makeResult({ isFetching: true }))
    renderSearchBar()

    typeQueryAndSettle('Sing')

    expect(screen.getByRole('status')).toHaveTextContent(/searching locations/i)
  })

  it('shows an "unobtrusive" loading state while the debounce itself is still pending', () => {
    renderSearchBar()

    // Only 2 characters typed and no timers advanced yet — the hook hasn't
    // been given the updated value, but the UI should still show it's
    // about to look something up rather than nothing at all.
    fireEvent.change(screen.getByLabelText('City/Country/State'), { target: { value: 'Si' } })

    expect(screen.getByRole('status')).toHaveTextContent(/searching locations/i)
  })

  it('renders a selectable list of suggestions on success', () => {
    mockUseLocationSuggestionsQuery.mockReturnValue(makeResult({ isSuccess: true, data: [singapore, johorBahru] }))
    renderSearchBar()

    typeQueryAndSettle('Jo')

    expect(screen.getByRole('option', { name: 'Singapore, SG' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Johor Bahru, Johor, MY' })).toBeInTheDocument()
  })

  it('keeps the hover-highlight class on every row regardless of keyboard-active state', () => {
    // Regression test for a bug where the CSS `:hover` utility was only
    // applied to rows that were *not* the keyboard-active row (mutually
    // exclusive ternary), so native mouse-hover feedback silently
    // disappeared for whichever row `activeIndex` currently pointed at.
    // jsdom can't simulate the `:hover` pseudo-class actually painting, but
    // it can assert the hover utility class itself is never conditionally
    // removed based on `activeIndex`.
    mockUseLocationSuggestionsQuery.mockReturnValue(makeResult({ isSuccess: true, data: [singapore, johorBahru] }))
    renderSearchBar()

    typeQueryAndSettle('Jo')
    const queryInput = screen.getByLabelText('City/Country/State')
    fireEvent.keyDown(queryInput, { key: 'ArrowDown' })

    const activeOption = screen.getByRole('option', { name: 'Singapore, SG' })
    const inactiveOption = screen.getByRole('option', { name: 'Johor Bahru, Johor, MY' })

    expect(activeOption).toHaveClass('hover:bg-secondary')
    expect(activeOption).toHaveClass('bg-secondary')
    expect(inactiveOption).toHaveClass('hover:bg-secondary')
  })

  it('fills the input with the exact suggestion label when a suggestion is selected, and closes the dropdown', () => {
    mockUseLocationSuggestionsQuery.mockReturnValue(makeResult({ isSuccess: true, data: [johorBahru] }))
    renderSearchBar()

    typeQueryAndSettle('Jo')
    fireEvent.click(screen.getByRole('option', { name: 'Johor Bahru, Johor, MY' }))

    expect(screen.getByLabelText('City/Country/State')).toHaveValue('Johor Bahru, Johor, MY')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports selecting a suggestion with the keyboard (arrow keys + Enter)', () => {
    mockUseLocationSuggestionsQuery.mockReturnValue(makeResult({ isSuccess: true, data: [singapore, johorBahru] }))
    renderSearchBar()

    typeQueryAndSettle('Jo')
    const queryInput = screen.getByLabelText('City/Country/State')
    fireEvent.keyDown(queryInput, { key: 'ArrowDown' })
    fireEvent.keyDown(queryInput, { key: 'ArrowDown' })
    fireEvent.keyDown(queryInput, { key: 'Enter' })

    expect(screen.getByLabelText('City/Country/State')).toHaveValue('Johor Bahru, Johor, MY')
  })

  it('shows a distinct "no results" message for a valid empty response', () => {
    mockUseLocationSuggestionsQuery.mockReturnValue(makeResult({ isSuccess: true, data: [] }))
    renderSearchBar()

    typeQueryAndSettle('Zzzzz')

    expect(screen.getByText(/no matching locations found/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a distinct error message when the suggestions request fails', () => {
    const error = new (class extends Error {})('Request failed') as OpenWeatherApiError
    mockUseLocationSuggestionsQuery.mockReturnValue(makeResult({ isError: true, error }))
    renderSearchBar()

    typeQueryAndSettle('Sing')

    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't load location suggestions/i)
    expect(screen.queryByText(/no matching locations found/i)).not.toBeInTheDocument()
  })

  it('closes the dropdown on Escape', () => {
    mockUseLocationSuggestionsQuery.mockReturnValue(makeResult({ isSuccess: true, data: [singapore] }))
    renderSearchBar()

    typeQueryAndSettle('Sing')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText('City/Country/State'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes the dropdown when clicking outside', () => {
    mockUseLocationSuggestionsQuery.mockReturnValue(makeResult({ isSuccess: true, data: [singapore] }))
    renderSearchBar()

    typeQueryAndSettle('Sing')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('calls onSearch with the trimmed query when Search is clicked', () => {
    const onSearch = vi.fn()
    renderSearchBar(onSearch)

    fireEvent.change(screen.getByLabelText('City/Country/State'), { target: { value: '  Johor, MY  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('Johor, MY')
  })

  it('reports an empty trimmed query as-is on Search, relying on useCurrentWeatherQuery to no-op rather than guarding here', () => {
    // No explicit "don't call onSearch" guard lives in SearchBar — an empty
    // trimmed query is reported as-is, and it's `useCurrentWeatherQuery`
    // (owned by the caller) that naturally stays disabled for it, since it
    // already treats an empty query as `enabled: false`.
    const onSearch = vi.fn()
    renderSearchBar(onSearch)

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenCalledWith('')
  })
})
