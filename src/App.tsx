import './App.css'
import { useLenis } from './hooks/useLenis.ts'
import { useFadeInUp } from './hooks/useFadeInUp.ts'
import { TodaysWeather } from './features/weather/components/TodaysWeather.tsx'
import { ThemeToggle } from './features/theme/components/ThemeToggle.tsx'

function App() {
  useLenis()
  const themeToggleFadeInRef = useFadeInUp<HTMLDivElement>(0)

  return (
    <div className="min-h-screen bg-[url('/bg-light.png')] bg-cover bg-center bg-fixed dark:bg-[url('/bg-dark.png')]">
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">
        <h1 className="sr-only">Today's Weather</h1>
        <div ref={themeToggleFadeInRef} className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <TodaysWeather />
      </div>
    </div>
  )
}

export default App
