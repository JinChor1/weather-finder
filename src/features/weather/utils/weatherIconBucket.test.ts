import { getWeatherIconBucket } from './weatherIconBucket'

describe('getWeatherIconBucket', () => {
  it('buckets "clear sky" as clear', () => {
    expect(getWeatherIconBucket('clear sky')).toBe('clear')
  })

  it('buckets "few clouds" as few-clouds', () => {
    expect(getWeatherIconBucket('few clouds')).toBe('few-clouds')
  })

  it('buckets "scattered clouds" as scattered-clouds', () => {
    expect(getWeatherIconBucket('scattered clouds')).toBe('scattered-clouds')
  })

  it('buckets "broken clouds" as broken-clouds', () => {
    expect(getWeatherIconBucket('broken clouds')).toBe('broken-clouds')
  })

  it('folds "overcast clouds" into broken-clouds', () => {
    expect(getWeatherIconBucket('overcast clouds')).toBe('broken-clouds')
  })

  it('buckets "shower rain" as shower-or-thunderstorm', () => {
    expect(getWeatherIconBucket('shower rain')).toBe('shower-or-thunderstorm')
  })

  it('buckets "thunderstorm" and its variants as shower-or-thunderstorm', () => {
    expect(getWeatherIconBucket('thunderstorm')).toBe('shower-or-thunderstorm')
    expect(getWeatherIconBucket('thunderstorm with light rain')).toBe('shower-or-thunderstorm')
  })

  it('buckets plain rain descriptions as rain', () => {
    expect(getWeatherIconBucket('light rain')).toBe('rain')
    expect(getWeatherIconBucket('moderate rain')).toBe('rain')
  })

  it('falls back to "other" for uncovered conditions (drizzle, snow, atmosphere)', () => {
    expect(getWeatherIconBucket('light intensity drizzle')).toBe('other')
    expect(getWeatherIconBucket('snow')).toBe('other')
    expect(getWeatherIconBucket('mist')).toBe('other')
    expect(getWeatherIconBucket('haze')).toBe('other')
  })

  it('falls back to "other" for a completely unrecognized description', () => {
    expect(getWeatherIconBucket('something openweathermap has never returned')).toBe('other')
  })

  it('is case-insensitive and trims whitespace', () => {
    expect(getWeatherIconBucket('  Clear Sky  ')).toBe('clear')
  })
})
