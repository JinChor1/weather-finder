import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'

gsap.registerPlugin(Flip)

/**
 * `gsap/Flip`'s typings expose `Flip.FlipState` only via the ambient global
 * `Flip` namespace, not off the module's imported `Flip` binding — deriving
 * the type from `Flip.getState`'s own return type sidesteps that mismatch.
 */
type FlipState = ReturnType<typeof Flip.getState>

/** Duration/ease of the reflow tween applied to rows sliding into their new position. */
const REFLOW_DURATION = 0.6
const REFLOW_EASE = 'sine.inOut'
/** Duration/ease of a newly-added (or newly-revealed) row's fade+scale-in. */
const ENTER_DURATION = 0.35
const ENTER_EASE = 'power2.out'
/** Duration/ease of a removed row's fade+scale-out. */
const LEAVE_DURATION = 0.28
const LEAVE_EASE = 'power1.in'

interface FlipListEntry<T> {
  /** Stable identity from `getKey`, also written to the row's `data-flip-id` for Flip to correlate elements across renders. */
  key: string
  item: T
  /** True for exactly as long as this row's own exit tween is still playing, after it's already gone from `items`. */
  leaving: boolean
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Drives GSAP Flip-based enter/exit/reflow animation for a keyed list whose
 * membership or order changes between renders (rows added, removed,
 * reordered, or revealed via pagination) — the GSAP equivalent of Framer
 * Motion's `layout`/`AnimatePresence` combo, built on `gsap/Flip` per this
 * repo's "GSAP owns animation" rule.
 *
 * Usage: call with the list's current `items` and a `getKey`; render
 * `renderedItems` (not the raw `items` you passed in) as the rows, and give
 * each row's root element both `ref={containerRef}` (on the list container)
 * and `data-flip-id={entry.key}` (on each row) so Flip can correlate
 * elements across renders. Each `renderedItems` entry also carries
 * `leaving` — render a row's normal interactive content when `false`, and a
 * simplified, non-interactive, `aria-hidden` stand-in when `true` (see
 * `SearchHistory.tsx`), since a leaving row is purely a visual artifact of
 * its own exit animation, not a real, actionable part of the list anymore.
 *
 * React normally unmounts a removed row's DOM node the instant `items`
 * drops it, before any effect gets a chance to animate it out. To animate
 * an exit at all, the departing row has to stay mounted a little longer
 * than the data says it should — `renderedItems` is a local superset of
 * `items` that keeps a just-removed row around (flagged `leaving`) for
 * exactly as long as its exit tween takes, then drops it for real once that
 * tween completes.
 *
 * Enter and reflow both go through Flip proper (`Flip.getState`/
 * `Flip.from`, using Flip's own `onEnter` callback for new/revealed rows
 * and the tween's natural before/after diff to slide survivors into their
 * new positions). Exit is driven by a plain GSAP tween instead of Flip's
 * built-in leave detection: Flip only recognizes a row as "leaving" if it's
 * still queryable with a collapsed (zero) bounding box at the exact moment
 * `Flip.from` runs, which — combined with needing the row visually held in
 * its old spot while it fades, then pulled out of flow so siblings can
 * immediately close the gap — added more indirection than it saved for one
 * row's fade+scale-out. Capturing its exact pre-removal bounds directly
 * (in the effect below) and animating from there via a plain tween is more
 * predictable and does the same visual job.
 *
 * This hook manages its own GSAP cleanup by killing (not `gsap.context()`
 * .revert()-ing) whatever's in flight before starting the *next reflow*
 * round specifically (see the guard around `Flip.from` in Effect B below) —
 * `.revert()` would also undo already-settled reflow transforms from a
 * *previous, already-completed* round every time this effect re-runs for
 * an unrelated reason (e.g. a leaving row's own tween finishing), which
 * isn't what should happen here; that idiom fits `useFadeInUp`/
 * `WeatherIcon`'s one-shot teardown-and-rebuild animations, not this
 * hook's continuously-evolving list.
 */
export function useFlipListTransition<T>(items: T[], getKey: (item: T) => string) {
  const containerRef = useRef<HTMLUListElement>(null)
  const [renderedItems, setRenderedItems] = useState<FlipListEntry<T>[]>(() =>
    items.map((item) => ({ key: getKey(item), item, leaving: false })),
  )
  const previousKeysRef = useRef<string[]>(items.map(getKey))
  const flipStateRef = useRef<FlipState | null>(null)
  const flipTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const leaveTweensRef = useRef(new Map<string, gsap.core.Tween>())

  // Effect A: fold `items` changes into `renderedItems`, capturing the
  // "before" Flip state off the current DOM first so Effect B (below) has
  // something to diff against once the new list actually commits.
  useLayoutEffect(() => {
    const nextKeys = items.map(getKey)
    const previousKeys = previousKeysRef.current
    const sameMembershipAndOrder =
      nextKeys.length === previousKeys.length && nextKeys.every((key, index) => key === previousKeys[index])
    previousKeysRef.current = nextKeys

    if (sameMembershipAndOrder) {
      // Nothing entered/left/reordered — still refresh each entry's `item`
      // in case its content changed by reference, but bail out (returning
      // the same array reference when nothing did) rather than triggering
      // Effect B for a no-op.
      setRenderedItems((current) => {
        let changed = false
        const next = current.map((entry) => {
          const index = nextKeys.indexOf(entry.key)
          const item = index === -1 ? entry.item : items[index]
          if (item !== entry.item) changed = true
          return item === entry.item ? entry : { ...entry, item }
        })
        return changed ? next : current
      })
      return
    }

    const container = containerRef.current
    const reduceMotion = prefersReducedMotion()
    flipStateRef.current = !reduceMotion && container ? Flip.getState(container.querySelectorAll('[data-flip-id]')) : null

    setRenderedItems((current) => {
      const nextKeysSet = new Set(nextKeys)

      // Rows still present (or brand new) take `items`' own order verbatim,
      // so a reorder (e.g. re-searching an existing history entry bumps it
      // to the top) is reflected immediately in the "to" layout Flip diffs
      // against.
      const merged: FlipListEntry<T>[] = items.map((item) => ({ key: getKey(item), item, leaving: false }))

      // Rows that just dropped out of `items` are kept a little longer so
      // they can play their exit animation — reinserted right after
      // whichever still-present row used to sit right before them (or at
      // the very front, if none did), so they stay visually anchored near
      // their old spot instead of jumping somewhere arbitrary while fading.
      // Skipped entirely under reduced motion: there's no exit tween to
      // hold them open for, so they can just disappear along with the rest
      // of the layout jumping straight to its final state.
      if (!reduceMotion) {
        current.forEach((entry, index) => {
          if (nextKeysSet.has(entry.key)) return

          const precedingSurvivorKey = current
            .slice(0, index)
            .reverse()
            .find((candidate) => nextKeysSet.has(candidate.key))?.key
          const insertAt = precedingSurvivorKey ? merged.findIndex((candidate) => candidate.key === precedingSurvivorKey) + 1 : 0
          merged.splice(insertAt, 0, { ...entry, leaving: true })
        })
      }

      return merged
    })
  }, [items, getKey])

  // Effect B: once `renderedItems` actually commits to the DOM, animate it.
  useLayoutEffect(() => {
    const container = containerRef.current
    const fromState = flipStateRef.current
    flipStateRef.current = null
    if (!container) return

    // Effect A already skips retaining any `leaving` rows at all once
    // reduced motion is on (there's no exit tween to hold them open for),
    // so this only needs to guard against a *previous* round's animations
    // still being in flight when the preference changes mid-session.
    if (prefersReducedMotion()) {
      flipTimelineRef.current?.kill()
      flipTimelineRef.current = null
      leaveTweensRef.current.forEach((tween) => tween.kill())
      leaveTweensRef.current.clear()
      return
    }

    const leavingEntries = renderedItems.filter((entry) => entry.leaving)

    const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-flip-id]'))
    const leavingKeys = new Set(leavingEntries.map((entry) => entry.key))
    const survivorElements = elements.filter((element) => !leavingKeys.has(element.dataset.flipId ?? ''))
    const leavingElements = elements.filter((element) => leavingKeys.has(element.dataset.flipId ?? ''))
    // Rows newly becoming `leaving` this round, as opposed to ones already
    // mid-exit (already pulled out of flow, already animating) from a
    // previous round whose tween just hasn't resolved yet — e.g. a second
    // delete arriving before the first one's tween finished, or (see the
    // `flipTimelineRef` guard below) this same effect re-running once a
    // *different* leaving row's own exit tween completes. Only rows newly
    // becoming leaving need to be measured/repositioned below.
    const newlyLeavingElements = leavingElements.filter(
      (element) => !leaveTweensRef.current.has(element.dataset.flipId ?? ''),
    )

    // Flip (and, to a lesser extent, a plain GSAP tween/`.set()`) mutates
    // inline styles on each target's *ancestor* row as part of positioning
    // it — purely cosmetic, but browsers can treat certain synchronous
    // style/attribute mutations on an ancestor as invalidating a
    // currently-focused descendant's focusability, silently dropping focus
    // to `<body>` with no `blur` event to react to (observed reliably
    // against this project's jsdom test environment; harmless in a real
    // browser is the assumption, but restoring focus here is cheap
    // insurance either way). None of this hook's DOM work is supposed to
    // affect keyboard focus, so if focus moved to `<body>` as a side effect
    // of the mutations below, it's restored to wherever it actually was.
    const focusedElementBeforeAnimating = document.activeElement

    // Pull every newly-leaving row out of flow *before* calling `Flip.from`
    // below, not after. `Flip.from` measures each survivor's current
    // (post-render) position synchronously the instant it's invoked, to use
    // as the tween's "to" state. If a leaving row is still occupying its
    // normal-flow space at that exact moment — as it would be if this loop
    // ran afterward — Flip computes survivor deltas against a layout that's
    // about to shift *again* the instant this row is yanked to
    // `position: absolute` right after, an uncoordinated second layout
    // change the already-in-flight Flip tween never accounted for.
    // Measuring/positioning here first means Flip's own "to" measurement
    // already reflects the final layout (leaving rows already out of flow)
    // in one consistent pass.
    const containerRect = container.getBoundingClientRect()
    newlyLeavingElements.forEach((element) => {
      const rect = element.getBoundingClientRect()
      gsap.set(element, {
        position: 'absolute',
        top: rect.top - containerRect.top,
        left: rect.left - containerRect.left,
        width: rect.width,
      })
    })

    // Only replace the in-flight reflow timeline when this round actually
    // has a new one to start (`fromState` is only non-null on a genuine
    // structural round — see Effect A). This effect also re-runs for a
    // reason that has *nothing* to animate: a leaving row's own exit tween
    // (below) completing and filtering itself out of `renderedItems` is
    // itself a `renderedItems` change, so it re-triggers this same effect
    // with `fromState` now `null`. Previously, this effect unconditionally
    // killed `flipTimelineRef.current` at the top before deciding whether
    // to replace it — which, on exactly that kind of re-run, killed the
    // *still in-flight* reflow tween from the round that had just started
    // it, freezing survivor rows at whatever partial position they'd
    // reached, with nothing left to finish animating them into place. This
    // was reliably reproducible because `LEAVE_DURATION` (0.28s) is shorter
    // than `REFLOW_DURATION` (0.6s): a leaving row's exit always completes
    // — and re-enters this effect — while its sibling reflow is still only
    // partway done, i.e. on every round where a row both enters and leaves
    // at once (exactly the "Show more" window eviction scenario). Gating
    // the kill+replace to only happen alongside actually starting a new
    // timeline leaves any still-relevant in-flight reflow alone to finish
    // on its own.
    if (fromState && survivorElements.length > 0) {
      flipTimelineRef.current?.kill()
      flipTimelineRef.current = Flip.from(fromState, {
        targets: survivorElements,
        duration: REFLOW_DURATION,
        ease: REFLOW_EASE,
        // Slides rows via `scale`/`transform` rather than tweening literal
        // `width`/`height` (Flip's other mode, which also forces
        // `min-width`/`max-width`/`min-height`/`max-height` inline styles
        // onto every target for the duration of the tween as a safety
        // clamp). Rows here never actually change size, only position, so
        // `scale` is the more correct mode regardless — but it also
        // sidesteps a real bug: under jsdom (`getBoundingClientRect`
        // always returns zeroes in tests), that min/max clamp collapses
        // each row's box to 0×0 for the tween's duration, which caused a
        // focused delete button inside a *reflowing sibling* row to lose
        // focus mid-test.
        scale: true,
        onEnter: (enteringElements) =>
          gsap.fromTo(
            enteringElements,
            { opacity: 0, scale: 0.85, y: -8 },
            { opacity: 1, scale: 1, y: 0, duration: ENTER_DURATION, ease: ENTER_EASE },
          ),
      })
    }

    newlyLeavingElements.forEach((element) => {
      const key = element.dataset.flipId ?? ''
      const tween = gsap.to(element, {
        opacity: 0,
        scale: 0.9,
        duration: LEAVE_DURATION,
        ease: LEAVE_EASE,
        onComplete: () => {
          leaveTweensRef.current.delete(key)
          setRenderedItems((current) => current.filter((entry) => entry.key !== key))
        },
      })
      leaveTweensRef.current.set(key, tween)
    })

    if (
      focusedElementBeforeAnimating instanceof HTMLElement &&
      focusedElementBeforeAnimating !== document.activeElement &&
      document.activeElement === document.body &&
      document.contains(focusedElementBeforeAnimating)
    ) {
      focusedElementBeforeAnimating.focus()
    }
  }, [renderedItems])

  // Unmount-only cleanup: kill anything still in flight so no leftover
  // tween keeps a reference to (or keeps animating) a DOM node after this
  // component is gone.
  useLayoutEffect(() => {
    // Captured once per mount rather than read fresh off the refs inside
    // the cleanup closure: both are long-lived mutable containers (a
    // `Map`, and a ref this hook itself reassigns), and capturing the
    // objects here (not primitives — they're still the same live
    // instances by the time cleanup runs) is what this rule is actually
    // asking for.
    const flipTimeline = flipTimelineRef
    const leaveTweens = leaveTweensRef.current

    return () => {
      flipTimeline.current?.kill()
      leaveTweens.forEach((tween) => tween.kill())
      leaveTweens.clear()
    }
  }, [])

  return { containerRef, renderedItems }
}
