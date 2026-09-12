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
2. Search takes **both city and country** as separate inputs (per the mockup), submitted together.
3. Working **Search**, **Clear**, **search-again** (from a history row), and **Delete** (from a history row) actions.
4. **Search history persists across a page refresh** — no backend exists, so this implies `localStorage` or similar, to be decided when the feature is actually built.
5. Invalid city/country or an API error must show a **clear, visible message** (mockup shows a "Not found" banner and a "No Record" empty state for history).
6. **Responsive**: desktop and mobile mockups are both provided and must both work.
7. Ship **at least one** of light/dark theme; both themes **with a switcher is optional/bonus**, not required.
8. **Loading states and edge cases are required**, not optional (empty history, invalid input, API failure, etc.).
9. `npm run lint`, `npm run typecheck`, and `npm run build` must all pass **with no errors**, and unused code / unfinished functions must be removed before calling something done.
10. The **README** needs clear setup instructions and stated assumptions. (The requirements document separately suggests putting UI-behavior assumptions in "a separate document" — where exactly assumptions get written is an open question to settle when we get there, not decided yet.)
11. Automated tests are explicitly **optional** ("if possible") — this project already has Vitest + RTL wired up, so there's little reason to skip them, but they aren't a hard requirement.

The client's stated success criteria (feature completeness, code readability, web standards compliance, reusability/extendibility, responsive compatibility, UI/UX quality) are exactly what the `react-specialist` / `code-reviewer` / `a11y-auditor` agents below already enforce — this feature is the concrete thing they'll all end up working on.

**Open items, not decided yet** (flag/ask rather than assuming when implementation starts): whether history persistence is `localStorage` or something else; where the OpenWeatherMap API key is sourced from (a `VITE_`-prefixed env var is the obvious choice given the stack, but per the stack table below, Vite inlines any `VITE_*` value into the client bundle — acceptable for a free-tier key in this kind of project, but the `.env` file itself must stay out of git); and where the "assumptions" document lives (README vs. a separate file in `docs/`).

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
| UI framework | React 19 | Function components + hooks only; `ref` is a normal prop (no `forwardRef`); reach for `use()`/`useActionState`/`useOptimistic` where they simplify a flow |
| Language | TypeScript (strict) | `tsconfig.app.json`/`tsconfig.node.json` have `strict`, `noUnusedLocals`, `noUnusedParameters` on. No `any`; derive types from Zod schemas (`z.infer<>`) rather than hand-duplicating them |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Utility classes, not inline `style` or ad hoc CSS files. Imported via `@import "tailwindcss";` in `src/index.css` — there is **no** `tailwind.config.js`; don't create one unless a task genuinely needs to extend the theme |
| Server/async state | TanStack Query v5 | All data fetching goes through `useQuery`/`useMutation` against the `QueryClient` in `src/main.tsx`. Never hand-roll `useEffect` + `fetch` + `useState` for data this should own, and never duplicate server data into Zustand |
| Client state | Zustand | Only for genuine cross-component client/UI state that props/context can't handle cleanly. Small, feature-scoped stores — not one global store |
| Validation | Zod v4 | Validates everything crossing a trust boundary (form input, API responses). Colocate schemas with the feature |
| Scroll/animation | GSAP + Lenis | Wired together in `src/hooks/useLenis.ts` (see Architecture below); scroll-linked animation goes through `ScrollTrigger`, not a new scroll listener |
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
- **Definition of done**: `npm run lint`, `npm run typecheck`, and `npm run test` should all pass before a task is considered finished — this mirrors what the pre-commit hook enforces (minus tests, which aren't hooked in yet).

## Custom agents and skills

Each project agent also exists as an identically-scoped skill (`.claude/skills/<name>/SKILL.md`) for when the same rules should apply to work done directly in the current session instead of being delegated to a subagent. All three read `package.json`/this file first and treat the stack table above as authoritative — they don't assume a dependency exists or invent one.

**Division of labor** — one builder, two independent reviewers that don't overlap:

- **`react-specialist`** (`Read, Write, Edit, Bash, Glob, Grep`) — the only one of the three with write access. Implements/refactors React + TypeScript features per the stack rules and project conventions above: reusable/scalable components, responsive (mobile + desktop) UI, explicit loading/error/edge-case handling, an accessibility-friendly baseline, and Vitest + RTL tests per feature. It does not audit or review — it builds.
- **`a11y-auditor`** (`Read, Glob, Grep, Bash, ReportFindings` — no write access) — audits UI against WCAG 2.2 AA and reports findings; does not fix code. No accessibility tooling is installed, so audits are expert manual review, not automated-tool output; it recommends tooling rather than installing it. Invoke after UI work is done.
- **`code-reviewer`** (`Read, Glob, Grep, Bash, ReportFindings` — no write access) — reviews architecture, functional/philosophy decisions, naming/convention consistency, and risk (scalability, state-management correctness, security, regressions). Deliberately ignores formatting/style already owned by ESLint/TypeScript-strict/pre-commit, and defers accessibility findings to `a11y-auditor` rather than duplicating that review. Verifies `lint`/`typecheck`/`test`/`build` itself rather than trusting the diff. Invoke after a feature is implemented, before considering it done.

Typical flow for a non-trivial feature: `react-specialist` implements → `code-reviewer` and `a11y-auditor` review in parallel (their scopes don't overlap) → `react-specialist` addresses findings → re-review if the changes were substantial.

More project-specific agents/skills will be added here one at a time as they're set up — keep this section current when that happens.
