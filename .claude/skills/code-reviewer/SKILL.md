---
name: code-reviewer
description: Substance-level code review checklist for the weather-finder project — architecture, functional/philosophy decisions, naming consistency, and risk, ignoring superficial style already owned by ESLint/Prettier. Reports findings, does not fix code. Use when asked to review a feature, diff, or PR in this repo beyond what lint/typecheck already cover.
---

Follow this checklist when reviewing code in this project. Your job is to **evaluate and report, not fix** — leave changes to whoever implements them (e.g. following `react-specialist` conventions). Don't re-litigate what ESLint (flat config) and TypeScript strict mode already enforce and gate in pre-commit (unused vars, hook deps, import order, quote style) — only raise a lint-shaped concern if the lint config has a genuine coverage gap.

## First, verify the stack

Read `package.json` and `CLAUDE.md` before reviewing — the installed stack (React 19, TypeScript strict, Vite, Tailwind CSS v4, TanStack Query v5, Zustand, Zod, GSAP/Lenis, Vitest + RTL) is the standard the code is judged against. Code that duplicates what an installed package already does (hand-rolled fetch/loading state instead of `useQuery`, ad hoc validation instead of Zod) is an architecture finding, not a nitpick. Code that reaches for something not installed is a decision worth surfacing, not something to wave through silently.

## What to evaluate

**Scalability, industry standard**
- Structure holds up as the app grows: no unnecessary prop-drilling that should be context/Zustand, no Zustand god-store, no logic duplicated across components instead of extracted to a hook/util.
- TanStack Query: structured, collision-free query keys; sensible `staleTime`/`enabled`/dependent-query usage rather than manual gating.
- Zod: schemas colocated and reused, types derived via `z.infer<>` rather than duplicated by hand.
- GSAP/Lenis: animations and `ScrollTrigger` instances actually cleaned up on unmount — leaked instances are an easy, real risk here.
- Referential-instability re-renders, N+1 fetches, logic in the wrong layer (render vs effect vs query).

**Functional/architectural decisions**
- Right tool for the job given the stack's existing choices (server state via `useQuery`, not manual `fetch`/`useEffect`/`useState`).
- State colocated at the right level — not lifted globally out of convenience, not stuck local when genuinely shared.
- Zod validation actually applied at the real trust boundary (form submit, API response), not quietly skipped.
- Consistent error-handling philosophy across the codebase rather than a new pattern per file.

**Naming and convention consistency**
- Matches established conventions: `PascalCase` components, `camelCase` hooks prefixed `use`, filename matches export, tests colocated as `Component.test.tsx` (matching `src/App.test.tsx`).
- Same terminology for the same concept across files.
- Export style (default vs named) consistent with the surrounding codebase.

**Risk**
- Unvalidated input reaching an API call or `dangerouslySetInnerHTML`; any secret that isn't safely outside the `VITE_*` client-bundle boundary (Vite inlines every `import.meta.env.VITE_*` into the client bundle).
- Race conditions in async effects/queries, stale closures over state, data used without the guarantees its Zod schema is supposed to provide.
- Regressions to behavior other code depends on.

## Rules to apply

- Judge code against neighboring code, not in isolation — consistency with an established pattern usually beats a "better" pattern introduced once.
- Flag speculative abstraction as readily as duplication — both are scalability problems, in opposite directions.
- Weigh by blast radius, not count: one in-place Zustand mutation or wrong query key outranks ten slightly-off names.
- Verify, don't trust: actually run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` rather than assuming they pass.
- Trace async and error paths yourself, not just the happy path.
- Separate "objectively wrong" (report with confidence, as a defect) from "defensible taste call" (label as a suggestion, not a blocker).
- Check whether tests were actually written for the risky logic and whether they test real behavior, not just that a test file exists.
- Note accessibility concerns in passing but leave the actual WCAG audit to the `a11y-auditor` skill/agent rather than duplicating it.

## Reporting

Order findings most severe first, tagged by category (`architecture`, `state-management`, `risk`, `convention`, `scalability`, `testing`). State the concrete failure scenario — what breaks, when, for whom — not just an abstract principle being violated.
