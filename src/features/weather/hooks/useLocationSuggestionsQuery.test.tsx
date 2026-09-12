import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useLocationSuggestionsQuery } from './useLocationSuggestionsQuery'

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

const rawGeocodingResults = [{ name: 'Singapore', lat: 1.357107, lon: 103.819499, country: 'SG' }]

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useLocationSuggestionsQuery', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_OPENWEATHER_API_KEY', 'test-api-key')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('stays disabled below the minimum query length', () => {
    const { result } = renderHook(() => useLocationSuggestionsQuery({ city: 'S', country: '' }), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches and returns a validated suggestion array once the query is long enough', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, rawGeocodingResults))

    const { result } = renderHook(() => useLocationSuggestionsQuery({ city: 'Singa', country: '' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([
      { name: 'Singapore', country: 'SG', lat: 1.357107, lon: 103.819499, state: undefined },
    ])
  })

  it('resolves to an empty array without treating it as an error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, []))

    const { result } = renderHook(() => useLocationSuggestionsQuery({ city: 'Zzzzz', country: '' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
