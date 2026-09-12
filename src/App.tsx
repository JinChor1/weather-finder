import './App.css'
import { useLenis } from './hooks/useLenis.ts'
import { SearchBar } from './features/weather/components/SearchBar.tsx'
import { WeatherResult } from './features/weather/components/WeatherResult.tsx'
import type { WeatherResultData } from './features/weather/schema.ts'
import { ThemeToggle } from './features/theme/components/ThemeToggle.tsx'

// Static sample matching the Figma mockup's numbers. Real data (from a
// search against OpenWeatherMap) lands in a later task.
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

function App() {
  useLenis()

  return (
    <div className="min-h-screen bg-[url('/bg-light.png')] bg-cover bg-center bg-fixed dark:bg-[url('/bg-dark.png')]">
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <SearchBar />
        <div className="mt-6">
          <WeatherResult weather={sampleWeather} />
        </div>
      </div>
    </div>
  )
}

export default App
