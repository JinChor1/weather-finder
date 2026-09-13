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

## Known issues / design follow-ups

The following light-theme color-contrast findings were raised in an
accessibility review and are documented here for a design-team decision,
rather than fixed in code with an engineer's own guess at replacement
colors:

- The `--muted` token, and the `.field-label`/`.eyebrow-label` component
  classes built on top of it, compute to roughly 2.8–4.4:1 contrast against
  the app's panels in light mode — below the 4.5:1 WCAG AA target for normal
  text.
- Primary content text (`--content`) sitting on the translucent glass panel
  (`.glass-panel`) over the full-bleed photographic background image can
  also dip as low as roughly 3.5:1, depending on which part of the image is
  behind it.

Fixing this needs a design-team decision — darker token values, and/or a
guaranteed-opaque text backing instead of relying on the translucent panel
over a photo — before it lands in code.

`SearchHistory`'s "No Record" empty-state text was switched from
`text-muted/70` to `text-content` (full opacity) as part of the search-history
PR's own accessibility review, since stacking `/70` on top of `.glass-panel`'s
own translucency made that specific spot's contrast clearly worse than the
rest of the app. This is a real improvement (removes one layer of
transparency) but isn't a guarantee of 4.5:1 in every case, per the
`--content`-on-`.glass-panel` finding directly above — the same underlying
design-team decision would also resolve this instance.

## Weather icon mapping

`WeatherIcon` (`src/features/weather/components/WeatherIcon.tsx`) renders a
layered, GSAP-animated icon built from `public/sun.svg`,
`public/sun-shadow.svg`, `public/cloud.svg`, `public/cloud-shadow.svg`, and
`public/rain-drop-{1,2,3}.svg`. Which layers appear is decided by
`getWeatherIconBucket` (`src/features/weather/utils/weatherIconBucket.ts`)
from OpenWeatherMap's longer `description` field (not the shorter
`condition` label — several distinct descriptions like "few clouds"/
"scattered clouds"/"broken clouds" all share `condition: "Clouds"` but need
different art):

| Bucket | Matches (`description`, case-insensitive) | Layers rendered |
| --- | --- | --- |
| Clear | `clear sky` | sun, sun-shadow |
| Few clouds | `few clouds` | sun, sun-shadow, cloud, cloud-shadow |
| Scattered clouds | `scattered clouds` | cloud, cloud-shadow |
| Broken clouds | `broken clouds`, `overcast clouds` | cloud, cloud-shadow (greyscale) |
| Shower rain / thunderstorm | `shower rain` and its intensity variants; `thunderstorm` and all of its variants (with rain/drizzle, light/heavy/ragged, etc.) | cloud, cloud-shadow (greyscale), rain-drop-1/2/3 |
| Rain | `light rain`, `moderate rain`, `heavy intensity rain`, `very heavy rain`, `extreme rain`, `freezing rain` | sun, sun-shadow, cloud, cloud-shadow, rain-drop-1/2/3 |
| Other (fallback) | Anything not listed above — drizzle (all variants), snow (all variants), the atmosphere group (mist, smoke, haze, fog, sand/dust, volcanic ash, squalls, tornado), and any unrecognized description | sun, sun-shadow, cloud, cloud-shadow |

`overcast clouds` is folded into the "broken clouds" bucket rather than the
"other" fallback: visually it's the same full-cloud-cover case, just one
step heavier, and no dedicated art exists for either. The "other" bucket
exists because OpenWeatherMap returns roughly 40 distinct `description`
values and no bespoke icon set covers drizzle, snow, or the
mist/fog/haze/dust "atmosphere" group yet — those reuse the generic
cloud+sun composition rather than showing nothing.

**Greyscale treatment**: the "broken clouds" and "shower rain / thunderstorm"
buckets desaturate `cloud.svg`/`cloud-shadow.svg` via a Tailwind CSS filter
(`grayscale-[70%] saturate-[40%] brightness-95`) rather than editing the
source SVGs' gradient stops directly. This was the cheaper, easily-tunable
option — it applies identically to both cloud layers and can be adjusted or
reverted without touching the asset files.

**Animation**: each layer group loops via GSAP (`gsap.context()`, cleaned up
on unmount/condition change) — sun/sun-shadow pulse gently (a plain filled
circle doesn't visibly change under rotation, so a scale/opacity "glow"
breathe was used instead), cloud/cloud-shadow drift horizontally as a unit,
and the three rain drops fall in a staggered loop so they don't fall in
sync. Animation is skipped entirely when the user has
`prefers-reduced-motion: reduce` set.

## Assumptions

- **`temperatureHigh`/`temperatureLow`**: populated from OpenWeatherMap's
  Current Weather Data endpoint's `main.temp_min`/`main.temp_max`, which per
  OpenWeatherMap's own docs represent the current min/max temperature
  observed across nearby stations right now — not a true daily forecast
  high/low. For many locations these will often equal the current
  temperature exactly. This is a deliberate, stated assumption driven by a
  free-tier API constraint, not a bug: a real daily high/low would require
  the One Call or 5-day/3-hour forecast endpoint instead.
- **Search history cap (20 entries)**: search history is capped at
  `MAX_SEARCH_HISTORY_SIZE` (`src/features/weather/store/useSearchHistoryStore.ts`),
  currently 20. No size is specified in the requirements docs; 20 is a
  reasonable default (roughly a week's worth of casual daily lookups) that
  keeps the `localStorage`-persisted payload small. Oldest entries are
  evicted first once a new search would exceed the cap.
