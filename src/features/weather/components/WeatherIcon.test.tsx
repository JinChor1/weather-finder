import { render } from '@testing-library/react'
import { WeatherIcon } from './WeatherIcon'

/** Reads back the `src` of every rendered icon layer, in DOM order. */
function renderedSources(description: string) {
  const { container } = render(<WeatherIcon description={description} />)
  return [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
}

describe('WeatherIcon', () => {
  it('renders sun + cloud layers for clear sky', () => {
    expect(renderedSources('clear sky')).toEqual(['/sun-shadow.svg', '/sun.svg', '/cloud-shadow.svg', '/cloud.svg'])
  })

  it('renders sun + cloud layers for few clouds', () => {
    expect(renderedSources('few clouds')).toEqual(['/sun-shadow.svg', '/sun.svg', '/cloud-shadow.svg', '/cloud.svg'])
  })

  it('renders cloud layers only for scattered clouds', () => {
    expect(renderedSources('scattered clouds')).toEqual(['/cloud-shadow.svg', '/cloud.svg'])
  })

  it('renders greyscale cloud layers for broken clouds', () => {
    const { container } = render(<WeatherIcon description="broken clouds" />)
    const sources = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(sources).toEqual(['/cloud-shadow.svg', '/cloud.svg'])

    for (const img of container.querySelectorAll('img')) {
      expect(img.className).toMatch(/grayscale/)
    }
  })

  it('renders greyscale cloud + rain drops for shower rain / thunderstorm', () => {
    expect(renderedSources('shower rain')).toEqual([
      '/cloud-shadow.svg',
      '/cloud.svg',
      '/rain-drop-1.svg',
      '/rain-drop-2.svg',
      '/rain-drop-3.svg',
    ])
    expect(renderedSources('thunderstorm')).toEqual([
      '/cloud-shadow.svg',
      '/cloud.svg',
      '/rain-drop-1.svg',
      '/rain-drop-2.svg',
      '/rain-drop-3.svg',
    ])
  })

  it('renders sun + non-greyscale cloud + rain drops for plain rain', () => {
    const { container } = render(<WeatherIcon description="light rain" />)
    const sources = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(sources).toEqual([
      '/sun-shadow.svg',
      '/sun.svg',
      '/cloud-shadow.svg',
      '/cloud.svg',
      '/rain-drop-1.svg',
      '/rain-drop-2.svg',
      '/rain-drop-3.svg',
    ])

    for (const img of container.querySelectorAll('img')) {
      expect(img.className).not.toMatch(/grayscale/)
    }
  })

  it('renders the non-greyscale cloud layers fully opaque', () => {
    const { container } = render(<WeatherIcon description="few clouds" />)
    const cloudLayers = container.querySelectorAll('img[src="/cloud-shadow.svg"], img[src="/cloud.svg"]')

    expect(cloudLayers).toHaveLength(2)
    for (const img of cloudLayers) {
      expect(img.className).toMatch(/opacity-100/)
      expect(img.className).not.toMatch(/grayscale/)
    }
  })

  it('leaves the greyscale cloud variant fully opaque too', () => {
    const { container } = render(<WeatherIcon description="broken clouds" />)

    for (const img of container.querySelectorAll('img')) {
      expect(img.className).not.toMatch(/opacity-70/)
    }
  })

  it('renders the generic cloud + sun composition for uncovered conditions', () => {
    expect(renderedSources('mist')).toEqual(['/sun-shadow.svg', '/sun.svg', '/cloud-shadow.svg', '/cloud.svg'])
  })

  it('every icon layer is decorative (empty alt text)', () => {
    const { container } = render(<WeatherIcon description="thunderstorm" />)

    for (const img of container.querySelectorAll('img')) {
      expect(img).toHaveAttribute('alt', '')
    }
  })

  it('renders a backdrop-blur cloud mask when both sun and non-greyscale cloud are present', () => {
    for (const description of ['clear sky', 'few clouds', 'light rain', 'mist']) {
      const { container } = render(<WeatherIcon description={description} />)
      const mask = container.querySelector('[data-cloud-blur-mask]')
      expect(mask).not.toBeNull()
      expect(mask?.className).toMatch(/backdrop-blur/)
    }
  })

  it('skips the cloud mask when there is no sun (or the cloud is greyscale) behind it', () => {
    for (const description of ['scattered clouds', 'broken clouds', 'shower rain', 'thunderstorm']) {
      const { container } = render(<WeatherIcon description={description} />)
      expect(container.querySelector('[data-cloud-blur-mask]')).toBeNull()
    }
  })

  it('mounts and unmounts without throwing when GSAP animates the layers', () => {
    const { unmount, rerender } = render(<WeatherIcon description="clear sky" />)

    rerender(<WeatherIcon description="thunderstorm" />)

    expect(() => unmount()).not.toThrow()
  })
})
