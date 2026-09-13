---
name: a11y-auditor
description: Accessibility audit checklist for the weather-finder project against WCAG 2.2 AA — reports findings, does not fix code. Use when asked to review, audit, or check accessibility of React components, pages, or features in this repo.
---

Follow this checklist when auditing this project's UI for accessibility. Your job here is to **find and report issues, not fix them** — leave fixes to whoever implements/maintains the component (e.g. the `react-specialist` conventions).

## First, verify the stack

Read `package.json` and `CLAUDE.md` before auditing — don't assume tooling exists. Unless it's since changed, **no dedicated accessibility tooling is installed** (no `eslint-plugin-jsx-a11y`, `jest-axe`/`vitest-axe`/`axe-core`, `pa11y`, or Storybook a11y addon), so this is expert manual review against WCAG 2.2 AA applied to the actual JSX/TSX and Tailwind classes — not "nothing complained, so it's fine." If such tooling is present when you check, run it as part of the audit instead of relying purely on manual review. If you think tooling would genuinely help, recommend it in your findings rather than installing it yourself.

Also account for the rest of the installed stack while auditing: React 19 + TypeScript, Tailwind CSS v4, TanStack Query v5 (async loading/error states need to be announced to AT), Zod-validated forms (errors need to be programmatically associated with fields), GSAP/Lenis-driven scroll and motion (needs `prefers-reduced-motion` handling).

## WCAG 2.2 AA checklist, by principle

**Perceivable**
- Accessible names: meaningful `alt` on images, `aria-label`/visually-hidden text on icon-only buttons/links.
- Color contrast: 4.5:1 normal text / 3:1 large text and UI components — flag borderline Tailwind color pairings for manual verification.
- Never color-alone for state (e.g. only a red border marking a form error).
- Reflow: usable at 320px width, no horizontal scroll or lost functionality.

**Operable**
- No `onClick` on non-interactive elements (`div`/`span`) without `role`, `tabIndex`, and a key handler — prefer real `<button>`/`<a>`.
- Visible focus indicator everywhere — check that Tailwind resets or the global reset in `src/index.css` haven't stripped `:focus-visible`.
- Logical focus order, no keyboard traps (check modals/overlays/menus especially).
- WCAG 2.2 additions: **Focus Not Obscured** (sticky headers/footers can't hide the focused element), **Target Size (Minimum)** (≥24×24 CSS px or adequate spacing), **Dragging Movements** (need a non-drag alternative).
- GSAP/Lenis animation should respect `prefers-reduced-motion` for non-essential motion.

**Understandable**
- Every input has a programmatically associated label, not just placeholder text.
- Zod validation errors must be linked via `aria-describedby` and announced, not just shown visually nearby.
- Consistent behavior/appearance for repeated components.
- WCAG 2.2 **Redundant Entry**: don't force re-entering info already given in the same process.

**Robust**
- Valid semantic HTML/ARIA — no redundant or conflicting roles, no invalid `aria-*`.
- Custom widgets expose correct name/role/value/state — ask whether a native element would've given you this for free.
- TanStack Query async states (`isPending`/`isError`/`isSuccess`) must be announced: `aria-busy` or a visually-hidden live region for loading, `role="alert"`/`aria-live` for errors — not a silently-appearing message.

## How to sweep this repo

Grep first for risky patterns, then read the flagged component in context (a grep hit is a lead, not a finding):
- `onClick` on `div`/`span`
- `<img` without `alt`
- icon-only `<button>` without `aria-label`
- form controls without a matching `<label`/`aria-label`
- color-only state indicators
- GSAP/`ScrollTrigger`/Lenis usage with no `prefers-reduced-motion` handling

## Reporting findings

Order by severity: **Blocking** (keyboard traps, missing labels, no focus indicator) → **Serious** (contrast, missing accessible names, unannounced async state) → **Moderate** (target size, redundant entry, minor semantics). Keep AAA/nice-to-have suggestions clearly separate from actual AA failures. State concretely what breaks and for whom ("keyboard-only users can't activate this control"), not just a WCAG criterion number.

Automated tools catch roughly a third to half of real issues — reason about what a screen reader would actually announce and whether keyboard use actually works, don't just check for the presence of an attribute. Don't rubber-stamp: if you didn't actually trace through a component's keyboard/AT behavior, say so rather than reporting "no issues found."
