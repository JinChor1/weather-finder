# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then production build (outputs to `dist/`)
- `npm run preview` — serve the production build locally
- `npm run lint` — run ESLint (flat config in `eslint.config.js`)
- `npm run typecheck` — run TypeScript project references check (`tsc -b`), no emit
- `npm run test` — run the Vitest suite once
- `npm run test:watch` — run Vitest in watch mode
- `npx vitest run src/App.test.tsx` — run a single test file (add `-t "name"` to filter by test name)

A pre-commit hook (Husky, `.husky/pre-commit`) runs `lint-staged` (ESLint on staged `*.{js,jsx,ts,tsx}` files) and then `npm run typecheck` on every commit — both must pass for the commit to go through. Tests are **not** run on commit; run `npm run test` yourself before considering work done.

## Product requirements

This repo's actual deliverable is a client-facing frontend feature: a single **"Today's Weather"** page/feature. The source of truth lives in `docs/` — read both files there before doing any feature work; the summary below is a pointer to them, not a replacement:

- `docs/Requirement.pdf` — the client's requirements document: project description, numbered requirements, success criteria, and desktop/mobile mockups (plus Figma and asset-drive links).
- `docs/Important_Notes.txt` — supplementary constraints layered on top of the requirements document.

Condensed requirements (see the source docs for the authoritative wording and mockups):

1. Weather data comes from the **OpenWeatherMap API** (openweathermap.org/api), fetched client-side — a natural fit for the already-installed TanStack Query.
2. Search takes a **single free-text input** covering city/country/state together (labelled "City/Country/State"). The mockup originally showed two separate city/country inputs; the client later decided the country field was redundant and asked for it collapsed into one field — see the **OpenWeatherMap integration** section below for how that's implemented. Treat the single-field version as current, not the two-field mockup.
3. Working **Search**, **Clear**, **search-again** (from a history row), and **Delete** (from a history row) actions.
4. **Search history persists across a page refresh** — no backend exists, so this implies `localStorage` or similar, to be decided when the feature is actually built.
5. Invalid city/country or an API error must show a **clear, visible message** (mockup shows a "Not found" banner and a "No Record" empty state for history).
6. **Responsive**: desktop and mobile mockups are both provided and must both work.
7. Both light and dark themes are implemented, with a switcher (the requirement's bonus option, now decided) — see the **Theming** section below for the standing architecture; all future UI work must support both themes, not just the one it was designed against.
8. **Loading states and edge cases are required**, not optional (empty history, invalid input, API failure, etc.).
9. `npm run lint`, `npm run typecheck`, and `npm run build` must all pass **with no errors**, and unused code / unfinished functions must be removed before calling something done.
10. The **README** needs clear setup instructions and stated assumptions. (The requirements document separately suggests putting UI-behavior assumptions in "a separate document" — where exactly assumptions get written is an open question to settle when we get there, not decided yet.)
11. Automated tests are explicitly **optional** ("if possible") — this project already has Vitest + RTL wired up, so there's little reason to skip them, but they aren't a hard requirement.

The client's stated success criteria (feature completeness, code readability, web standards compliance, reusability/extendibility, responsive compatibility, UI/UX quality) are exactly what the `react-specialist` / `code-reviewer` / `a11y-auditor` agents below already enforce — this feature is the concrete thing they'll all end up working on.

**Design assets** (`public/`) — the mockup's actual art, matching `docs/Requirement.pdf`:
- `bg-light.png` / `bg-dark.png` — full-bleed purple cloudy-sky background images for the light and dark theme respectively; both are in use, swapped by the theme switcher (see **Theming** below).
- `cloud.png` / `sun.png` — the weather condition icon glyphs from the mockup (a rain cloud, and a cloud-over-sun combo) — presumably the start of a small icon set for mapping OpenWeatherMap conditions to an illustration; more conditions may need equivalent art later (clear, thunderstorm, snow, etc.) if the API returns something these two don't cover.
- `favicon.svg` — the default Vite placeholder favicon, unrelated to the mockup; still pending a real favicon.

Serve these from `public/` with a root-relative path (e.g. `/bg-light.png`) rather than importing them through `src/assets/` — nothing in `src/` re-exports or wraps them yet.

**Open items, not decided yet** (flag/ask rather than assuming when implementation starts): whether history persistence is `localStorage` or something else; and where the "assumptions" document lives (README vs. a separate file in `docs/`).

## OpenWeatherMap integration

The data-fetching layer is built (env var, Zod-validated client, TanStack Query hooks), and both the location-suggestions dropdown and the current-weather lookup are wired end to end. Search is a **single free-text field** (city/country/state combined) rather than separate city and country inputs — the country input was removed after the client decided it was redundant; the whole query pipeline (client functions, hooks, `SearchBar`) takes one string, not a `{ city, country }` pair. What exists today:

- **API key**: `VITE_OPENWEATHER_API_KEY`, read via `import.meta.env` (typed in `src/vite-env.d.ts`). Copy `.env.example` to `.env` and fill in a real key — `.env`/`.env.*` are gitignored (with `.env.example` explicitly un-ignored), see `README.md` for where to get a free key.
- **Raw-response validation**: `src/features/weather/api/openWeatherSchemas.ts` — Zod schemas for OpenWeatherMap's actual JSON shapes (Current Weather Data + Geocoding direct endpoints), kept separate from `src/features/weather/schema.ts`'s `weatherResultSchema` (the UI-facing display shape). Don't conflate the two: the API schemas validate "their side," `weatherResultSchema` is "our side." Note `weatherResultSchema` still has separate `city`/`country` fields — those come from OpenWeatherMap's *response* (`data.name`, `data.sys.country`), which is unrelated to how the user's *query* is shaped, so the single-field search change didn't touch this schema.
- **Client**: `src/features/weather/api/openWeatherClient.ts` — `fetchCurrentWeather(query)` and `fetchLocationSuggestions(query)`, each taking one free-text string and passing it straight through as OpenWeatherMap's `q` param (which natively accepts `"city"`, `"city,country"`, or `"city,state,country"` — no client-side joining needed). Both throw a typed `OpenWeatherApiError` (`status` + a `reason` union — `'not-found'` is the specific signal `NotFoundBanner` keys off of via its `reason` prop, distinct from other failure reasons). Also exports `shouldRetryOpenWeatherQuery`, a shared TanStack Query `retry` function that skips retrying deterministic 4xx failures (a 5xx *is* retried — that's deliberate, don't "fix" it into always skipping retries).
- **Hooks**: `src/features/weather/hooks/useCurrentWeatherQuery.ts` and `useLocationSuggestionsQuery.ts` — thin `useQuery` wrappers (reads, not mutations — this is cacheable GET data, which is what makes "search again from history" cheap once history exists). `useCurrentWeatherQuery` takes `query: string | null` and stays disabled on `null`/empty; it's called from `TodaysWeather.tsx` (see below). `useLocationSuggestionsQuery` takes `query: string` and stays disabled until the text reaches `MIN_SEARCH_QUERY_LENGTH` (exported from that file, renamed from `MIN_CITY_QUERY_LENGTH` now that the field isn't city-specific) and does **not** debounce internally by design — `SearchBar` is the one debouncing (see below).
- **Assumption on record**: OpenWeatherMap's geocoding API has no separate "look up a country" endpoint — there's also no client-side query-building assumption left to state here beyond that, since the single free-text field is passed straight through as `q` with no joining logic at all.
- **`TodaysWeather.tsx`** (`src/features/weather/components/TodaysWeather.tsx`) — composes `SearchBar` with the result area. Owns the *submitted* query (set only on Search click, not on every keystroke) and the `useCurrentWeatherQuery` call, then renders idle/loading/error (`NotFoundBanner` with the error's `reason`)/success (`WeatherResult`) off that query's state. `App.tsx` just renders this component plus the page shell (background, `ThemeToggle`).
- **`SearchBar`'s single input + suggestions dropdown** (`src/features/weather/components/SearchBar.tsx`): one controlled text input, labelled "City/Country/State". Typing debounces (350ms, via `lodash/debounce` — use the same subpath-import style for any future debounce need, not a different library or the full `lodash` barrel import) into `useLocationSuggestionsQuery`, rendered as a combobox-pattern dropdown (`role="combobox"`/`listbox`/`option`, arrow-key + Enter navigation) covering loading/results/empty/error states with the shared theme tokens. Selecting a suggestion fills the input with the exact same formatted label shown in the dropdown row (`"{name}, {state, }{country}"`, via the shared `suggestionLabel` helper) and stops there — it does not itself trigger a weather lookup; clicking Search does, via the `onSearch` callback prop into `TodaysWeather`.

## Documentation (`docs/`)

The `docs/` folder is the canonical place to record project documentation going forward — used **when explicitly asked to document something** (e.g. an architecture/design decision, an assumptions doc, notes on a tricky implementation choice), not created speculatively on every task. Currently contains:

- `docs/Requirement.pdf` — the client's requirements document (see Product requirements above).
- `docs/Important_Notes.txt` — supplementary constraints from the user (see Product requirements above).

When asked to write documentation, put it in `docs/` (as a new file, or an addition to an existing one) rather than leaving it only in chat history, and reference it from this file if it's the kind of thing a future session should know to go looking for.

## Stack and the rule each package implies

This is a Vite + React 19 + TypeScript (strict) scaffold. Nothing below is optional flavor — each entry is the standing rule for how that concern gets handled in this repo. Don't introduce a parallel way of doing something a package below already owns, and don't add a new dependency for something already covered here without flagging it first.

| Concern | Package | Rule |
|---|---|---|
| Build tool | Vite | `npm run dev`/`build`/`preview`; no webpack/CRA-era patterns |
| UI framework | React 19 | **Components** are function components + hooks only — no React class components (`extends React.Component`), ever; `ref` is a normal prop (no `forwardRef`); reach for `use()`/`useActionState`/`useOptimistic` where they simplify a flow. This rule is about React components specifically — plain TypeScript/JS `class` syntax used for non-component purposes (e.g. a custom `Error` subclass like `OpenWeatherApiError` in `src/features/weather/api/openWeatherClient.ts`, needed for clean `instanceof` narrowing) is normal, idiomatic, and not what this rule bans. Don't flag or "fix" that kind of class. |
| Language | TypeScript (strict) | `tsconfig.app.json`/`tsconfig.node.json` have `strict`, `noUnusedLocals`, `noUnusedParameters` on. No `any`; derive types from Zod schemas (`z.infer<>`) rather than hand-duplicating them |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Utility classes, not inline `style` or ad hoc CSS files. Imported via `@import "tailwindcss";` in `src/index.css` — there is **no** `tailwind.config.js`; don't create one unless a task genuinely needs to extend the theme |
| Server/async state | TanStack Query v5 | All data fetching goes through `useQuery`/`useMutation` against the `QueryClient` in `src/main.tsx`. Never hand-roll `useEffect` + `fetch` + `useState` for data this should own, and never duplicate server data into Zustand |
| Client state | Zustand | Only for genuine cross-component client/UI state that props/context can't handle cleanly. Small, feature-scoped stores — not one global store |
| Validation | Zod v4 | Validates everything crossing a trust boundary (form input, API responses). Colocate schemas with the feature |
| Scroll/animation | GSAP + Lenis | Wired together in `src/hooks/useLenis.ts` (see Architecture below); scroll-linked animation goes through `ScrollTrigger`, not a new scroll listener |
| Debouncing | lodash (`lodash/debounce` subpath import) | Used by `SearchBar`'s suggestions dropdown (see OpenWeatherMap integration below). Import the specific subpath, not the full `lodash` barrel — keeps bundle impact small. Don't add a different debounce utility/library for a future need this already covers |
| Testing | Vitest + React Testing Library | See Testing below |
| Linting | ESLint (flat config, `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`) | Gates every commit via Husky, alongside `tsc -b` |
| Git hooks | Husky + lint-staged | `.husky/pre-commit` → `lint-staged` (ESLint) then `npm run typecheck` |

No routing library, UI component library, or accessibility-testing tooling (`eslint-plugin-jsx-a11y`, `jest-axe`/`vitest-axe`, `pa11y`) is installed. Don't assume any of them exist — check `package.json` if in doubt, since agents/skills in this repo are instructed to do the same before writing or reviewing code.

## Architecture

No routing or feature pages exist yet — `src/App.tsx` currently just calls `useLenis()`. Everything lives in `src/`:

- `src/main.tsx` — entry point; mounts `<App />` into `#root` via `createRoot`, wrapped in `QueryClientProvider`
- `src/App.tsx` — root component; calls `useLenis()`, otherwise empty (`return null`)
- `src/hooks/useLenis.ts` — creates the `Lenis` instance, registers GSAP's `ScrollTrigger` plugin, and syncs Lenis's raf loop into GSAP's ticker (the standard GSAP+Lenis integration). Smooth scroll is active app-wide via this hook; any component can use `gsap`/`ScrollTrigger` directly against that scroll position
- `index.html` — Vite's HTML entry, loads `src/main.tsx` as a module

`tsconfig.json` references `tsconfig.app.json` (src, strict mode) and `tsconfig.node.json` (`vite.config.ts`) — the standard split Vite template.

The app has no established feature structure yet. Default to a feature-based layout under `src/features/<feature>/` (components/hooks/schema/store as needed) once there's more than a couple of components, rather than one flat `src/components` bucket — but don't restructure existing code as a side effect of an unrelated task.

- `src/features/weather/` — the "Today's Weather" feature (search bar, and whatever weather-display/search-history components/hooks/schema land here as they're built).
- `src/features/theme/` — light/dark theme switching, scoped as its own small feature since it's cross-cutting UI state rather than part of any one feature. See **Theming** below.

## Theming

Both light and dark themes are implemented, switched manually by the user rather than following OS preference alone (requirement 7):

- **State**: `src/features/theme/store/useThemeStore.ts` — a Zustand store using the `persist` middleware (`zustand/middleware`, already part of the `zustand` package — no new dependency) to save the choice to `localStorage`. Holds `theme: 'light' | 'dark'` and a `toggleTheme` action. Falls back to `prefers-color-scheme` only the first time there's no stored preference. This store is the canonical example of the stack table's "small, feature-scoped store" rule for Zustand — don't fold unrelated state into it, and don't spin up a second global-ish store for some other cross-cutting concern without the same justification.
- **Applying the theme**: the stored `theme` is synced onto a `dark` class on `<html>`, and Tailwind is configured for **class-based** dark mode via `@custom-variant dark (&:where(.dark, .dark *));` in `src/index.css` — this overrides Tailwind v4's default (`prefers-color-scheme`-only) behavior so the `dark:` variant follows the switcher, not just the OS. Don't add a `tailwind.config.js` for this; the CSS-first `@custom-variant` directive is the v4-native way and keeps the "no config file" stack rule intact.
- **Switcher**: `src/features/theme/components/ThemeToggle.tsx` — a button (sun/moon icon) that calls `toggleTheme`.
- **Color tokens, not repeated `dark:` pairs**: `src/index.css` defines the palette as CSS custom properties rather than leaving every component to hand-roll a color plus its `dark:` counterpart. Two layers:
  - **Brand color** (`@theme` block): `--color-primary` is pinned to the client's exact hex (`#6C40B5`), with `--color-primary-hover`/`--color-primary-strong` as derived shades for interactive states. This is theme-invariant — same value in light and dark.
  - **Theme-aware semantic tokens**: values that legitimately differ between themes (body text, muted text, glass-panel surfaces, icon-button surfaces, the danger/error palette used by `NotFoundBanner`, etc.) are defined once as plain custom properties on `:root` (light) and overridden under `.dark` (dark), then re-exposed to Tailwind via `@theme inline` so they become ordinary utilities (`text-content`, `text-muted`, `bg-surface-glass`, `text-danger-content`, …). A component using `text-muted` needs **no `dark:` prefix at all** — the variable itself swaps when `useThemeStore` toggles the `.dark` class. Add a new token here (following the existing naming/light-dark pattern) instead of writing a fresh `dark:` pair inline.
  - **Reusable component classes** (`@layer components`, same file): `.glass-panel`, `.solid-panel`, `.icon-button`, `.field-label`, `.eyebrow-label` capture visual patterns already repeated across ≥2 components. Reach for an existing one before copy-pasting a component's utility string, and add a new one here (built with `@apply` against the tokens above) once a third occurrence of the same pattern shows up — don't invent a class for something used exactly once. `.solid-panel` is `.glass-panel`'s fully-opaque sibling (`bg-surface-solid` instead of `bg-surface-glass`, no `backdrop-blur`) — reach for it instead of `.glass-panel` whenever content needs to be reliably legible against whatever's behind it (e.g. `SearchBar`'s suggestions dropdown), rather than blending with it.
- **Standing rule for all UI work from here on**: every new color/background/border must be theme-correct in both light and dark — prefer an existing (or new) semantic token/utility class from `src/index.css` over hand-writing a `dark:` pair inline, and reserve raw Tailwind palette utilities (`purple-950`, `rose-500`, etc.) for one-off cases that don't yet warrant a token. Shipping light-only (or dark-only) styling on new UI is not acceptable now that the switcher exists — `react-specialist` and anyone writing UI directly should treat this the same as the existing loading/error/edge-case and accessibility baselines: required, not optional. `code-reviewer` and `a11y-auditor` should flag UI that skips theme support or duplicates a token/class that already exists.

## Testing

Vitest + React Testing Library, configured via the `test` block in `vite.config.ts` (jsdom environment, `globals: true`, setup file `src/test/setup.ts`). The setup file loads `@testing-library/jest-dom/vitest` matchers and polyfills `matchMedia`/`ResizeObserver`, which jsdom lacks but GSAP's `ScrollTrigger` and Lenis both need to initialize.

- `describe`/`it`/`expect` are global — no imports needed (types come from `vitest/globals` in `tsconfig.app.json`).
- Test files are colocated with the code they test (`Component.test.tsx` next to `Component.tsx`), e.g. `src/App.test.tsx`.
- Prefer testing user-visible behavior (queries by role/label/text) over implementation detail.

## Project conventions

These apply regardless of which agent/skill (or you, directly) is writing the code:

- **Naming**: `PascalCase` components, `camelCase` hooks prefixed `use`, one component per file with the filename matching the export.
- **Props**: explicit, minimal, well-typed interfaces; prefer a discriminated union or splitting a component over boolean-flag soup.
- **Effects**: prefer deriving state during render or handling logic in event handlers; reserve `useEffect` for real synchronization with an external system (subscriptions, DOM APIs — the `useLenis` pattern).
- **Performance**: don't reach for `useMemo`/`useCallback`/`React.memo` by default — only when there's an actual re-render or cost problem.
- **Loading/error/edge cases are required, not optional**: anything backed by `useQuery`/`useMutation` needs explicit pending/error/empty/success handling, not just the happy path.
- **Accessibility baseline**: semantic HTML, labelled form controls, visible focus states, keyboard operability — a WCAG 2.2 AA-friendly baseline is expected from whoever writes UI code, even though auditing/certifying compliance is a separate agent's job (see below).
- **Theming**: every new color/background/border utility needs a `dark:` counterpart — see **Theming** above. Required, not optional, now that the theme switcher exists.
- **Definition of done**: `npm run lint`, `npm run typecheck`, and `npm run test` should all pass before a task is considered finished — this mirrors what the pre-commit hook enforces (minus tests, which aren't hooked in yet).

## Custom agents and skills

Each project agent also exists as an identically-scoped skill (`.claude/skills/<name>/SKILL.md`) for when the same rules should apply to work done directly in the current session instead of being delegated to a subagent. All three read `package.json`/this file first and treat the stack table above as authoritative — they don't assume a dependency exists or invent one.

**Division of labor** — one builder, two independent reviewers that don't overlap:

- **`react-specialist`** (`Read, Write, Edit, Bash, Glob, Grep`) — the only one of the three with write access. Implements/refactors React + TypeScript features per the stack rules and project conventions above: reusable/scalable components, responsive (mobile + desktop) UI, explicit loading/error/edge-case handling, an accessibility-friendly baseline, and Vitest + RTL tests per feature. It does not audit or review — it builds.
- **`a11y-auditor`** (`Read, Glob, Grep, Bash, ReportFindings` — no write access) — audits UI against WCAG 2.2 AA and reports findings; does not fix code. No accessibility tooling is installed, so audits are expert manual review, not automated-tool output; it recommends tooling rather than installing it. Invoke after UI work is done.
- **`code-reviewer`** (`Read, Glob, Grep, Bash, ReportFindings` — no write access) — reviews architecture, functional/philosophy decisions, naming/convention consistency, and risk (scalability, state-management correctness, security, regressions). Deliberately ignores formatting/style already owned by ESLint/TypeScript-strict/pre-commit, and defers accessibility findings to `a11y-auditor` rather than duplicating that review. Verifies `lint`/`typecheck`/`test`/`build` itself rather than trusting the diff. Invoke after a feature is implemented, before considering it done.

Typical flow for a non-trivial feature: `react-specialist` implements → `code-reviewer` and `a11y-auditor` review in parallel (their scopes don't overlap) → `react-specialist` addresses findings → re-review if the changes were substantial.

More project-specific agents/skills will be added here one at a time as they're set up — keep this section current when that happens.
