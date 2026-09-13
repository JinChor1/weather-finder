import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { useCurrentWeatherQuery } from './useCurrentWeatherQuery'

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

const rawCurrentWeather = {
  name: 'Johor',
  sys: { country: 'MY' },
  weather: [{ main: 'Clouds', description: 'scattered clouds' }],
  main: { temp: 26, temp_min: 26, temp_max: 29, humidity: 58 },
  dt: 1641721260,
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCurrentWeatherQuery', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_OPENWEATHER_API_KEY', 'test-api-key')
    vi.stubGlobal('fetch', vi.fn())
    // `fetchCurrentWeather` pads its response with a deliberate
    // `LABOR_ILLUSION_DELAY_MS` wait — fake timers let the tests below
    // fast-forward through it instead of actually waiting 700ms.
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('stays disabled and never fetches when searchParams is null', () => {
    const { result } = renderHook(() => useCurrentWeatherQuery(null), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches and returns mapped weather data for a valid query', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, rawCurrentWeather))

    const { result } = renderHook(() => useCurrentWeatherQuery('Johor, MY'), {
      wrapper: createWrapper(),
    })

    // `runAllTimersAsync` (rather than advancing by the exact delay) also
    // flushes whatever timer-driven microtask ordering sits between the fake
    // labor-illusion timer firing and the query's state settling.
    await act(() => vi.runAllTimersAsync())
    expect(result.current.isSuccess).toBe(true)

    expect(result.current.data).toEqual({
      city: 'Johor',
      country: 'MY',
      condition: 'Clouds',
      description: 'scattered clouds',
      temperature: 26,
      temperatureHigh: 29,
      temperatureLow: 26,
      humidity: 58,
      observedAt: '2022-01-09T09:41:00.000Z',
    })
  })

  it('surfaces a not-found OpenWeatherApiError without retrying', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(404, { cod: '404', message: 'city not found' }))

    const { result } = renderHook(() => useCurrentWeatherQuery('Nowhereville, ZZ'), {
      wrapper: createWrapper(),
    })

    await act(() => vi.runAllTimersAsync())
    expect(result.current.isError).toBe(true)

    expect(result.current.error).toMatchObject({ status: 404, reason: 'not-found' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
