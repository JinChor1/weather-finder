import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/** Duration of the fade+translate tween, in seconds. */
const FADE_IN_DURATION = 0.5
const FADE_IN_EASE = 'power2.out'
/** Starting vertical offset (px) the element travels up from while fading in. */
const FADE_IN_OFFSET_Y = 24
/** Gap (seconds) between each `order` step's start — what makes the sequence read as staggered rather than simultaneous. */
const FADE_IN_STAGGER_GAP = 0.15

/**
 * Page-load "fade in from bottom" entrance, staggered across however many
 * top-level elements call it. Each caller passes its position in the
 * sequence (`order`: 0, 1, 2, 3, ...); the resulting `delay` is
 * `order * FADE_IN_STAGGER_GAP`, so element 1 starts shortly after element
 * 0 finishes starting, and so on — not all of them firing at once.
 *
 * Attach the returned ref to the single wrapping element that should
 * animate in. Mirrors `WeatherIcon.tsx`'s established GSAP conventions in
 * this repo: gated behind `prefers-reduced-motion` (skips straight to the
 * resting opacity/position), scoped with `gsap.context()` and torn down via
 * `.revert()` on unmount. Unlike `WeatherIcon`, this only ever needs to run
 * once per mount — it's a one-shot entrance, not a bucket-driven loop — so
 * the effect intentionally has no reactive dependencies beyond `order`
 * itself (a stable literal at each call site).
 */
export function useFadeInUp<T extends HTMLElement = HTMLDivElement>(order: number) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        { opacity: 0, y: FADE_IN_OFFSET_Y },
        {
          opacity: 1,
          y: 0,
          duration: FADE_IN_DURATION,
          ease: FADE_IN_EASE,
          delay: order * FADE_IN_STAGGER_GAP,
          // GSAP animates `y` via an inline `transform`, and doesn't strip
          // that inline style once the tween completes by default — it's
          // left on the element as `transform: translate(0px, 0px)` (or
          // equivalent), not no inline `transform` at all. Any element with
          // a `transform` value other than `none` establishes its own CSS
          // stacking context, which is a problem for a wrapper whose only
          // job is layout: it silently starts competing (and losing) against
          // *sibling* stacking contexts by DOM order rather than z-index,
          // since z-index values only resolve against siblings *within* the
          // same stacking context. `clearProps: 'transform'` removes that
          // inline transform once the tween resolves, returning the element
          // to having none at rest, so it doesn't leave a stray stacking
          // context behind (see `SearchBar`'s z-index comments for a
          // concrete case this fixed: its suggestions dropdown rendering
          // behind `WeatherResult` because of exactly this).
          clearProps: 'transform',
        },
      )
    }, element)

    return () => ctx.revert()
  }, [order])

  return ref
}
