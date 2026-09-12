---
name: react-specialist
description: React 19 + TypeScript conventions for the weather-finder project — component structure, responsive design, loading/edge-case handling, accessibility baseline, and testing standards. Use when building or modifying React components, hooks, pages, or features in this repo.
---

Follow these rules whenever you implement or modify React code in this project.

## First, verify the stack

Read `package.json` (and `CLAUDE.md`'s Architecture section) before writing code — don't assume versions or available libraries. The installed stack is the rule for what to use:

- **React 19** — function components + hooks only; `ref` is a normal prop (no `forwardRef`); reach for `use()`/`useActionState`/`useOptimistic` where they simplify a flow.
- **TypeScript strict mode** — no `any`; explicit prop types; don't fight the compiler by widening types.
- **Vite** — the build tool; `npm run dev` / `npm run build`.
- **Tailwind CSS v4** (`@tailwindcss/vite`, `@import "tailwindcss"` in `src/index.css`, no `tailwind.config.js`) — style with utility classes, not inline styles or ad-hoc CSS files.
- **TanStack Query v5** — all server/async state goes through `useQuery`/`useMutation` against the existing `QueryClient` (`src/main.tsx`). Don't hand-roll fetch/useEffect/useState for data it should own.
- **Zustand** — only for real cross-component client state; keep stores small and feature-scoped, not one global store.
- **Zod** — validate anything crossing a trust boundary (forms, API responses); derive types with `z.infer<>` instead of duplicating them by hand.
- **GSAP + Lenis** (`src/hooks/useLenis.ts`) — smooth scroll is already wired app-wide; hook scroll-linked animation into `ScrollTrigger` rather than a new scroll listener.
- **Vitest + React Testing Library** — the test stack (see Testing below).
- **ESLint + Husky pre-commit** — `npm run lint` and `npm run typecheck` gate every commit; don't write code that would fail either.

If a task seems to need something not already installed, flag it before adding a new dependency.

## What to deliver on every React task

1. **Clean, readable, reusable components** — small and single-purpose; shared logic goes into hooks (`src/hooks/`) or utilities, not copy-pasted. Match the scale of the actual task — no speculative abstraction for a single use case.
2. **Responsive on both mobile and desktop** — use Tailwind's responsive prefixes and actually consider narrow-viewport layout and touch targets, not just how it looks at one size.
3. **Loading, error, and edge-case states are required, not optional** — for `useQuery`/`useMutation`-backed UI, handle pending/error/empty/success explicitly. For lists: empty and single-item cases. For forms: submitting/disabled/invalid states.
4. **WCAG 2.2 AA-friendly markup as a baseline** — semantic HTML, labelled inputs, visible focus states, keyboard operability, `aria-*` only where semantics fall short. A separate review agent audits compliance — you don't need to certify it, just not ship obviously inaccessible markup (icon-only buttons with no accessible name, click handlers on bare `div`s, etc.).
5. **Unit tests for what you build** — after implementing, add Vitest + React Testing Library tests for the behavior that matters (rendering, interaction, hook/validation logic) — use judgment on coverage rather than testing everything. Query by role/label/text, not implementation details. Colocate as `Component.test.tsx` next to `Component.tsx`, matching `src/App.test.tsx`.

## Engineering standards

- Naming: `PascalCase` components, `camelCase` hooks prefixed `use`, one component per file.
- Props: explicit, minimal, well-typed; prefer a discriminated union or splitting the component over boolean-flag soup.
- Don't reach for `useMemo`/`useCallback`/`React.memo` by default — only when there's an actual re-render or cost problem.
- Prefer deriving state during render or handling logic in event handlers over `useEffect`; reserve `useEffect` for real external-system sync.
- Wrap risky subtrees (third-party/animated content) in error boundaries.
- No established feature-folder structure exists yet — default to `src/features/<feature>/` (components/hooks/schema/store) as things grow past a couple of components, but don't restructure unrelated existing code as a side effect.

## Before calling it done

Run `npm run lint`, `npm run typecheck`, and `npm run test`, and fix anything they catch — these are exactly what the pre-commit hook enforces.
