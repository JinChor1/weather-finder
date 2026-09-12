import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { TodaysWeather } from './TodaysWeather'
import type { LocationSuggestion, OpenWeatherApiError } from '../api/openWeatherClient'
import type { CurrentWeatherSearchParams } from '../hooks/useCurrentWeatherQuery'
import type { LocationSuggestionsQueryParams } from '../hooks/useLocationSuggestionsQuery'
import type { WeatherResultData } from '../schema'

type WeatherResult = UseQueryResult<WeatherResultData, OpenWeatherApiError>
type SuggestionsResult = UseQueryResult<LocationSuggestion[], OpenWeatherApiError>

const mockUseCurrentWeatherQuery = vi.fn<(params: CurrentWeatherSearchParams | null) => WeatherResult>()
const mockUseLocationSuggestionsQuery = vi.fn<(params: LocationSuggestionsQueryParams) => SuggestionsResult>()

vi.mock('../hooks/useCurrentWeatherQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useCurrentWeatherQuery')>()
  return {
    ...actual,
    useCurrentWeatherQuery: (params: CurrentWeatherSearchParams | null) => mockUseCurrentWeatherQuery(params),
  }
})

// SearchBar's own suggestions dropdown is not what this file tests — mocked
// here purely so typing into City/Country during the "runs a search" test
// below can't trigger a real debounced fetch against `fetchLocationSuggestions`.
vi.mock('../hooks/useLocationSuggestionsQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useLocationSuggestionsQuery')>()
  return {
    ...actual,
    useLocationSuggestionsQuery: (params: LocationSuggestionsQueryParams) => mockUseLocationSuggestionsQuery(params),
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
  })

  it('shows an idle prompt before any search has been submitted', () => {
    renderTodaysWeather()

    expect(screen.getByText(/search a city and country to see today's weather/i)).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a loading indicator while the weather lookup is in flight', () => {
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isFetching: true }))
    renderTodaysWeather()

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/loading today's weather/i)
    expect(status).toHaveAttribute('aria-busy', 'true')
  })

  it('renders the not-found banner for a not-found error', () => {
    const error = { reason: 'not-found' } as OpenWeatherApiError
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isError: true, error }))
    renderTodaysWeather()

    expect(screen.getByRole('alert')).toHaveTextContent(/not found/i)
  })

  it('renders reason-specific copy for a non-"not-found" error, instead of the misleading "Not found" text', () => {
    const error = { reason: 'network' } as OpenWeatherApiError
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isError: true, error }))
    renderTodaysWeather()

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/network error/i)
    expect(alert).not.toHaveTextContent(/^not found$/i)
  })

  it('renders the weather result on success', () => {
    mockUseCurrentWeatherQuery.mockReturnValue(makeResult({ isSuccess: true, data: weather }))
    renderTodaysWeather()

    expect(screen.getByRole('region', { name: /today's weather/i })).toBeInTheDocument()
    expect(screen.getByText('Johor, MY')).toBeInTheDocument()
  })

  it('runs a search when Search is clicked with the typed city/country', async () => {
    const user = userEvent.setup()
    renderTodaysWeather()

    await user.type(screen.getByLabelText('City'), 'Johor')
    await user.type(screen.getByLabelText('Country'), 'MY')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(mockUseCurrentWeatherQuery).toHaveBeenLastCalledWith({ city: 'Johor', country: 'MY' })
  })
})
