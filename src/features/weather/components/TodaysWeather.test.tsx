import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { TodaysWeather } from './TodaysWeather'
import { useSearchHistoryStore } from '../store/useSearchHistoryStore'
import type { LocationSuggestion, OpenWeatherApiError } from '../api/openWeatherClient'
import type { WeatherResultData } from '../schema'

type WeatherResult = UseQueryResult<WeatherResultData, OpenWeatherApiError>
type SuggestionsResult = UseQueryResult<LocationSuggestion[], OpenWeatherApiError>

const mockUseCurrentWeatherQuery = vi.fn<(query: string | null) => WeatherResult>()
const mockUseLocationSuggestionsQuery = vi.fn<(query: string) => SuggestionsResult>()

vi.mock('../hooks/useCurrentWeatherQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useCurrentWeatherQuery')>()
  return {
    ...actual,
    useCurrentWeatherQuery: (query: string | null) => mockUseCurrentWeatherQuery(query),
  }
})

// SearchBar's own suggestions dropdown is not what this file tests — mocked
// here purely so typing into the search input during the "runs a search"
// test below can't trigger a real debounced fetch against
// `fetchLocationSuggestions`.
vi.mock('../hooks/useLocationSuggestionsQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useLocationSuggestionsQuery')>()
  return {
    ...actual,
    useLocationSuggestionsQuery: (query: string) => mockUseLocationSuggestionsQuery(query),
  }
})

function makeResult(overrides: Partial<WeatherResult>): WeatherResult {
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
  } as WeatherResult
}

const weather: WeatherResultData = {
  city: 'Johor',
  country: 'MY',
  condition: 'Clouds',
  description: 'scattered clouds',
  temperature: 26,
  temperatureHigh: 29,
  temperatureLow: 26,
  humidity: 58,
  observedAt: '2022-01-09T09:41:00Z',
}

function renderTodaysWeather() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<TodaysWeather />, { wrapper: Wrapper })
}

describe('TodaysWeather', () => {
  beforeEach(() => {
    mockUseCurrentWeatherQuery.mockReset()
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({}))
    mockUseLocationSuggestionsQuery.mockReset()
    mockUseLocationSuggestionsQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
      isPending: true,
      isSuccess: false,
      isError: false,
      error: null,
      status: 'pending',
      fetchStatus: 'idle',
    } as SuggestionsResult)

    // `TodaysWeather` reads/writes the real `useSearchHistoryStore` (a
    // `localStorage`-backed Zustand store, per this repo's convention for
    // resetting `useThemeStore` in its own tests rather than mocking it) —
    // reset both so history from one test never leaks into the next.
    localStorage.clear()
    act(() => {
      useSearchHistoryStore.setState({ entries: [] })
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('shows an idle prompt before any search has been submitted', () => {
    renderTodaysWeather()

    expect(screen.getByText(/search a city, country, or state to see today's weather/i)).toBeInTheDocument()
    // `SearchHistory` also has its own `role="status"` live region (for
    // history-list mutations, unrelated to the weather lookup, and with no
    // accessible name to filter `getByRole('status', { name })` on) — assert
    // on the loading indicator's own text instead of the bare `status` role.
    expect(screen.queryByText(/loading today's weather/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a loading indicator while the weather lookup is in flight', () => {
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isFetching: true }))
    renderTodaysWeather()

    // The visible text now sits in an inner content wrapper (the cross-fade
    // target — see `useContentTransition`), not the `role="status"` box
    // itself — walk up to that ancestor to assert its `aria-busy` attribute.
    // (Can't use `getByRole('status')` directly: `SearchHistory` renders its
    // own unnamed `status` live region too, which would make this ambiguous.)
    const statusBox = screen.getByText(/loading today's weather/i).closest('[role="status"]')
    expect(statusBox).toHaveAttribute('aria-busy', 'true')
  })

  it('renders the not-found banner for a not-found error', () => {
    const error = { reason: 'not-found' } as OpenWeatherApiError
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isError: true, error, status: 'error' }))
    renderTodaysWeather()

    expect(screen.getByRole('alert')).toHaveTextContent(/not found/i)
  })

  it('renders reason-specific copy for a non-"not-found" error, instead of the misleading "Not found" text', () => {
    const error = { reason: 'network' } as OpenWeatherApiError
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isError: true, error, status: 'error' }))
    renderTodaysWeather()

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/network error/i)
    expect(alert).not.toHaveTextContent(/^not found$/i)
  })

  it('renders the weather result on success', () => {
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isSuccess: true, data: weather, status: 'success' }))
    renderTodaysWeather()

    expect(screen.getByRole('region', { name: /today's weather/i })).toBeInTheDocument()
    expect(screen.getByText('Johor, MY')).toBeInTheDocument()
  })

  it('announces a successful search to assistive tech via a persistent live region', () => {
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isSuccess: true, data: weather, status: 'success' }))
    const { container } = renderTodaysWeather()

    const liveRegion = container.querySelector('[aria-live="polite"].sr-only')
    expect(liveRegion).toHaveTextContent('Weather loaded for Johor, MY')
  })

  it('keeps the success live region present but empty before any result has loaded', () => {
    const { container } = renderTodaysWeather()

    const liveRegion = container.querySelector('[aria-live="polite"].sr-only')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveTextContent('')
  })

  it('keeps the weather result visible during a background refetch', () => {
    mockUseCurrentWeatherQuery.mockReturnValue(
      makeResult({ isSuccess: true, data: weather, status: 'success', isFetching: true }),
    )
    renderTodaysWeather()

    expect(screen.getByRole('region', { name: /today's weather/i })).toBeInTheDocument()
    expect(screen.queryByText(/loading today's weather/i)).not.toBeInTheDocument()
  })

  it('runs a search when Search is clicked with the typed query', async () => {
    const user = userEvent.setup()
    renderTodaysWeather()

    await user.type(screen.getByLabelText('City/Country/State'), 'Johor, MY')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(mockUseCurrentWeatherQuery).toHaveBeenLastCalledWith('Johor, MY')
  })

  it('resets the submitted search back to idle when Clear is clicked', async () => {
    const user = userEvent.setup()
    renderTodaysWeather()

    await user.type(screen.getByLabelText('City/Country/State'), 'Johor, MY')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(mockUseCurrentWeatherQuery).toHaveBeenLastCalledWith('Johor, MY')

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(mockUseCurrentWeatherQuery).toHaveBeenLastCalledWith(null)
  })

  it('does not resurrect a deleted history entry when the underlying query data reference changes without a new user search', async () => {
    const user = userEvent.setup()
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isSuccess: true, data: { ...weather }, status: 'success' }))
    const { rerender } = renderTodaysWeather()

    await user.type(screen.getByLabelText('City/Country/State'), 'Johor, MY')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(useSearchHistoryStore.getState().entries).toHaveLength(1)
    const entryId = useSearchHistoryStore.getState().entries[0].id

    act(() => {
      useSearchHistoryStore.getState().removeEntry(entryId)
    })
    expect(useSearchHistoryStore.getState().entries).toHaveLength(0)

    // Simulate a passive background refetch (e.g. TanStack Query's
    // `refetchOnWindowFocus`) resolving with a brand-new `data` object for
    // the *same* still-submitted query — not a new user-initiated search.
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isSuccess: true, data: { ...weather }, status: 'success' }))
    rerender(<TodaysWeather />)

    expect(useSearchHistoryStore.getState().entries).toHaveLength(0)
  })

  it('adds a history entry after a successful search, through the real component tree', async () => {
    const user = userEvent.setup()
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isSuccess: true, data: weather, status: 'success' }))
    renderTodaysWeather()

    expect(screen.getByText('No Record')).toBeInTheDocument()

    await user.type(screen.getByLabelText('City/Country/State'), 'Johor, MY')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(screen.queryByText('No Record')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search again for Johor, MY' })).toBeInTheDocument()
    expect(useSearchHistoryStore.getState().entries).toEqual([
      expect.objectContaining({ label: 'Johor, MY', query: 'Johor, MY' }),
    ])
  })

  it('re-runs the lookup when "search again" is clicked on a history row', async () => {
    act(() => {
      useSearchHistoryStore.setState({
        entries: [{ id: 'history-1', label: 'Paris, FR', query: 'Paris, Ile-de-France, FR', searchedAt: '2022-01-09T09:41:00Z' }],
      })
    })
    const user = userEvent.setup()
    renderTodaysWeather()

    await user.click(screen.getByRole('button', { name: 'Search again for Paris, FR' }))

    expect(mockUseCurrentWeatherQuery).toHaveBeenLastCalledWith('Paris, Ile-de-France, FR')
  })

  it('removes a history entry when its delete button is clicked, and it stays gone', async () => {
    act(() => {
      useSearchHistoryStore.setState({
        entries: [{ id: 'history-1', label: 'Paris, FR', query: 'Paris, FR', searchedAt: '2022-01-09T09:41:00Z' }],
      })
    })
    const user = userEvent.setup()
    renderTodaysWeather()

    await user.click(screen.getByRole('button', { name: 'Delete Paris, FR from history' }))

    expect(screen.queryByText('Paris, FR')).not.toBeInTheDocument()
    expect(screen.getByText('No Record')).toBeInTheDocument()
    expect(useSearchHistoryStore.getState().entries).toHaveLength(0)
  })
})
