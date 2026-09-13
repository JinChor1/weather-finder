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

  it('renders the scattered-clouds icon layers for a scattered-clouds description, decorative to assistive tech', () => {
    const { container } = render(<WeatherResult weather={sampleWeather} />)

    const iconSources = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(iconSources).toEqual(['/cloud-shadow.svg', '/cloud.svg'])
    for (const img of container.querySelectorAll('img')) {
      expect(img).toHaveAttribute('alt', '')
    }
  })

  it('renders the clear-sky icon layers for a clear-sky description, decorative to assistive tech', () => {
    const { container } = render(
      <WeatherResult weather={{ ...sampleWeather, condition: 'Clear', description: 'clear sky' }} />,
    )

    const iconSources = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(iconSources).toEqual(['/sun-shadow.svg', '/sun.svg', '/cloud-shadow.svg', '/cloud.svg'])
  })
})
