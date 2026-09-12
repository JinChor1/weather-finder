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
- `npx vitest run src/App.test.tsx` — run a single test file (or add `-t "name"` to filter by test name)

A pre-commit hook (Husky, `.husky/pre-commit`) runs `lint-staged` (ESLint on staged `*.{js,jsx,ts,tsx}` files) and then `npm run typecheck` on every commit — both must pass for the commit to go through. Tests are not currently run on commit.

## Architecture

This is a Vite + React 19 + TypeScript scaffold. Styling is Tailwind CSS v4 (via `@tailwindcss/vite`, imported in `src/index.css` with `@import "tailwindcss";` — no `tailwind.config.js` needed for the default setup). Data fetching uses TanStack Query, with a single `QueryClient` set up in `src/main.tsx` via `QueryClientProvider` wrapping `<App />`.

Testing is Vitest + React Testing Library, configured via the `test` block in `vite.config.ts` (jsdom environment, globals enabled, setup file at `src/test/setup.ts` which loads `@testing-library/jest-dom/vitest` matchers, plus `matchMedia`/`ResizeObserver` polyfills that jsdom lacks — needed by GSAP/Lenis below). Test files live next to the code they test (e.g. `src/App.test.tsx`). `describe`/`it`/`expect` are global (no imports needed) — types come from `vitest/globals` in `tsconfig.app.json`.

Scroll/animation: GSAP + Lenis are wired together in `src/hooks/useLenis.ts`, which creates a `Lenis` instance, registers GSAP's `ScrollTrigger` plugin, and syncs Lenis's raf loop into GSAP's ticker (the standard GSAP+Lenis integration). `App` calls `useLenis()` so smooth scrolling is active app-wide; any component can use `gsap`/`ScrollTrigger` directly against that scroll position.

Client state: Zustand is installed for any state that needs to live outside React Query's server-state cache. No stores exist yet and no provider is needed — create one with `create()` from `zustand` and import it directly where needed.

Validation: Zod (v4) is installed for schema/form validation. No schemas or form-handling library exist yet — Zod is currently unwired, used standalone (`z.object({...}).parse(...)` / `.safeParse(...)`) wherever validation is needed.

No routing or feature pages exist yet — `src/App.tsx` is currently just the `useLenis()` call. Everything currently lives in `src/`:

- `src/main.tsx` — entry point; mounts `<App />` into `#root` via `createRoot`, wrapped in `QueryClientProvider`
- `src/App.tsx` — root component; calls `useLenis()`, otherwise empty (`return null`)
- `src/hooks/useLenis.ts` — GSAP + Lenis smooth-scroll setup (see above)
- `index.html` — Vite's HTML entry, loads `src/main.tsx` as a module

TypeScript config is split per the standard Vite template: `tsconfig.json` references `tsconfig.app.json` (src, strict mode) and `tsconfig.node.json` (vite.config.ts).

Since the app has no established structure yet, use judgment when adding the first features (e.g. where to put components, hooks, API calls) rather than assuming a pre-existing convention.

## Custom agents and skills

- `.claude/agents/react-specialist.md` — project subagent for implementing React/TypeScript features. Verifies the installed stack before writing code, and enforces: reusable/scalable components, responsive (mobile + desktop) UI, explicit loading/error/edge-case handling, a WCAG 2.2 AA-friendly markup baseline (compliance auditing itself is a separate agent's job), and Vitest + RTL unit tests per feature. Invoke it (via the Agent tool / `react-specialist` type) for any non-trivial React component, hook, or feature work.
- `.claude/skills/react-specialist/SKILL.md` — the same conventions as the agent above, packaged as a skill to load into the current session when doing React work directly rather than delegating to the subagent.

More project-specific agents/skills will be added here one at a time as they're set up — keep this list current when that happens.
