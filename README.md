# Weather Finder

React + TypeScript "Today's Weather" app, built on Vite. This README covers
just enough to get the app running locally — a fuller setup/assumptions doc
lands in a later task.

## Prerequisites

This app calls the [OpenWeatherMap API](https://openweathermap.org/api)
client-side, so it needs an API key before `npm run dev` will actually fetch
any weather.

1. Copy `.env.example` to `.env`:

   ```sh
   cp .env.example .env
   ```

2. Get a free API key from OpenWeatherMap: sign up at
   [home.openweathermap.org/users/sign_up](https://home.openweathermap.org/users/sign_up),
   then grab your key from the
   [API keys](https://home.openweathermap.org/api_keys) tab.
3. Paste it into `.env` as `VITE_OPENWEATHER_API_KEY`.

`.env` is git-ignored — never commit a real key. Note that Vite inlines any
`VITE_`-prefixed variable into the client bundle, so this key is visible to
anyone using the built app; that's expected/acceptable for a free-tier key
in a project like this.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then production build (outputs to `dist/`)
- `npm run preview` — serve the production build locally
- `npm run lint` — run ESLint
- `npm run typecheck` — run the TypeScript project-references check, no emit
- `npm run test` — run the Vitest suite once
- `npm run test:watch` — run Vitest in watch mode
