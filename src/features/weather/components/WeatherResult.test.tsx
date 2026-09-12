import { render, screen } from '@testing-library/react'
import { WeatherResult } from './WeatherResult'
import type { WeatherResultData } from '../schema'

const sampleWeather: WeatherResultData = {
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

describe('WeatherResult', () => {
  it('renders the current temperature, high/low, location and condition', () => {
    render(<WeatherResult weather={sampleWeather} />)

    expect(screen.getByText('26°')).toBeInTheDocument()
    expect(screen.getByText('H: 29° L: 26°')).toBeInTheDocument()
    expect(screen.getByText('Johor, MY')).toBeInTheDocument()
    expect(screen.getByText('Clouds')).toBeInTheDocument()
    expect(screen.getByText('Humidity: 58%')).toBeInTheDocument()
  })

  it('formats the observed-at timestamp in UTC regardless of local timezone', () => {
    render(<WeatherResult weather={sampleWeather} />)

    expect(screen.getByText('01-09-2022 09:41 AM')).toBeInTheDocument()
  })

  it('renders the fallback icon for a non-clear condition', () => {
    render(<WeatherResult weather={sampleWeather} />)

    const icon = screen.getByAltText('Clouds weather')
    expect(icon).toHaveAttribute('src', '/cloud.png')
  })

  it('renders the clear-sky icon for a clear condition', () => {
    render(<WeatherResult weather={{ ...sampleWeather, condition: 'Clear' }} />)

    const icon = screen.getByAltText('Clear weather')
    expect(icon).toHaveAttribute('src', '/sun.png')
  })
})
