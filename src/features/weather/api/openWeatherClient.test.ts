import {
  fetchCurrentWeather,
  fetchLocationSuggestions,
  OpenWeatherApiError,
} from './openWeatherClient'

/** Minimal duck-typed stand-in for the parts of `Response` this module reads. */
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
  dt: 1641721260, // 2022-01-09T09:41:00Z
}

const rawGeocodingResults = [
  { name: 'Singapore', lat: 1.357107, lon: 103.819499, country: 'SG' },
  { name: 'Singapore', lat: 1.29027, lon: 103.851959, country: 'SG', state: 'Central' },
]

describe('openWeatherClient', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_OPENWEATHER_API_KEY', 'test-api-key')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  describe('fetchCurrentWeather', () => {
    // `fetchCurrentWeather` pads its response with a deliberate
    // `LABOR_ILLUSION_DELAY_MS` wait (see the constant's doc comment) — fake
    // timers let these tests fast-forward through that wait instead of
    // actually taking 700ms of wall-clock time each.
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    /** Awaits `fetchCurrentWeather` while advancing past its labor-illusion delay. */
    async function resolveFetchCurrentWeather(query: string) {
      const resultPromise = fetchCurrentWeather(query)
      // Suppress the "unhandled rejection" warning that would otherwise fire
      // while timers are advancing below, before the caller attaches its own
      // `.catch`/`await` on the returned promise — the real rejection is
      // still observed by whoever awaits the return value.
      resultPromise.catch(() => {})
      // `runAllTimersAsync` (rather than advancing by the exact delay) also
      // flushes whatever timer-driven microtask ordering sits between the
      // fake `LABOR_ILLUSION_DELAY_MS` timer firing and the surrounding
      // promise chain settling.
      await vi.runAllTimersAsync()
      return resultPromise
    }

    it('maps a successful response into WeatherResultData', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, rawCurrentWeather))

      const result = await resolveFetchCurrentWeather('Johor, MY')

      expect(result).toEqual({
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

    it('requests the metric-units endpoint for the given query', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, rawCurrentWeather))

      await resolveFetchCurrentWeather('Johor, MY')

      const [requestedUrl] = vi.mocked(fetch).mock.calls[0]
      expect(String(requestedUrl)).toContain('q=Johor%2C%20MY')
      expect(String(requestedUrl)).toContain('units=metric')
      expect(String(requestedUrl)).toContain('appid=test-api-key')
    })

    it('throws a distinguishable not-found error on a 404', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(404, { cod: '404', message: 'city not found' }))

      const error = await resolveFetchCurrentWeather('Nowhereville, ZZ').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(OpenWeatherApiError)
      expect(error).toMatchObject({ status: 404, reason: 'not-found', message: 'city not found' })
    })

    it('throws a distinguishable error reason for a 401 (bad API key)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(401, { cod: 401, message: 'Invalid API key' }))

      const error = await resolveFetchCurrentWeather('Johor, MY').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(OpenWeatherApiError)
      expect(error).toMatchObject({ status: 401, reason: 'unauthorized' })
    })

    it('throws a network-reason error when fetch itself rejects', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))

      const error = await resolveFetchCurrentWeather('Johor, MY').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(OpenWeatherApiError)
      expect(error).toMatchObject({ status: 0, reason: 'network' })
    })

    it('throws an invalid-response error when the 200 body does not match the expected shape', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { unexpected: 'shape' }))

      const error = await resolveFetchCurrentWeather('Johor, MY').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(OpenWeatherApiError)
      expect(error).toMatchObject({ reason: 'invalid-response' })
    })
  })

  describe('fetchLocationSuggestions', () => {
    it('returns a validated, simplified array of matches', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, rawGeocodingResults))

      const result = await fetchLocationSuggestions('Singa')

      expect(result).toEqual([
        { name: 'Singapore', country: 'SG', lat: 1.357107, lon: 103.819499, state: undefined },
        { name: 'Singapore', country: 'SG', lat: 1.29027, lon: 103.851959, state: 'Central' },
      ])
    })

    it('passes the raw query straight through as the q param', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, []))

      await fetchLocationSuggestions('Singa, SG')

      const [requestedUrl] = vi.mocked(fetch).mock.calls[0]
      expect(String(requestedUrl)).toContain('q=Singa%2C%20SG')
    })

    it('treats an empty match array as a valid (non-error) result', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, []))

      const result = await fetchLocationSuggestions('Zzzzz')

      expect(result).toEqual([])
    })

    it('returns [] without calling fetch when the query is blank', async () => {
      const result = await fetchLocationSuggestions('   ')

      expect(result).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('throws an invalid-response error when the body is not an array of matches', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { not: 'an array' }))

      const error = await fetchLocationSuggestions('Singa').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(OpenWeatherApiError)
      expect(error).toMatchObject({ reason: 'invalid-response' })
    })
  })
})
