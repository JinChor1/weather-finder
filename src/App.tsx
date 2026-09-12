import './App.css'
import { useLenis } from './hooks/useLenis.ts'
import { SearchBar } from './features/weather/components/SearchBar.tsx'
import { ThemeToggle } from './features/theme/components/ThemeToggle.tsx'

function App() {
  useLenis()

  return (
    <div className="min-h-screen bg-[url('/bg-light.png')] bg-cover bg-center bg-fixed dark:bg-[url('/bg-dark.png')]">
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <SearchBar />
      </div>
    </div>
  )
}

export default App
