/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OpenWeatherMap API key (openweathermap.org/api). See `.env.example`. */
  readonly VITE_OPENWEATHER_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
