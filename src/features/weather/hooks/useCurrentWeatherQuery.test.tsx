import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
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
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('stays disabled and never fetches when searchParams is null', () => {
    const { result } = renderHook(() => useCurrentWeatherQuery(null), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches and returns mapped weather data for a valid city/country', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, rawCurrentWeather))

    const { result } = renderHook(() => useCurrentWeatherQuery({ city: 'Johor', country: 'MY' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

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

    const { result } = renderHook(() => useCurrentWeatherQuery({ city: 'Nowhereville', country: 'ZZ' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toMatchObject({ status: 404, reason: 'not-found' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
