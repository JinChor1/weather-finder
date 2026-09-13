import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/** Duration of the cross-fade tween, in seconds. Quick and subtle — this is for a content area, not a hero. */
const TRANSITION_DURATION = 0.3
const TRANSITION_EASE = 'power2.out'

/**
 * Re-plays a quick opacity-only cross-fade on the attached element whenever
 * `key` changes — e.g. a conditionally-rendered content area swapping
 * between its loading/error/success/idle branches, or a new successful
 * result replacing a previous one (same branch, different content) for a
 * different search.
 *
 * Deliberately opacity-only, with no vertical translate: callers attach this
 * hook's ref to an inner element that wraps only a panel's *content*, not
 * the bordered/background box around it (see `TodaysWeather.tsx`,
 * `WeatherResult.tsx`, `NotFoundBanner.tsx`) — the box itself should resize
 * to fit new content instantly with no motion of its own, while only the
 * content inside cross-fades. A `y` offset here would read as the whole box
 * sliding/re-mounting, which is exactly the "fade in from bottom" effect
 * this hook is meant to avoid on every result change (that motion is
 * reserved for the one-shot page-load entrance in `useFadeInUp`).
 *
 * Deliberately skips the very first render: this hook is meant to be
 * composed with a page-load entrance already on the same element (e.g.
 * `useFadeInUp`, via `mergeRefs`) without the two tweens fighting over the
 * same element's `opacity`/`y` on mount. Callers that only need this hook's
 * behavior (no separate page-load entrance) still get correct behavior —
 * the element is simply visible at rest on mount, per its own static
 * classes/styles, then transitions on every subsequent `key` change.
 *
 * Because whichever branch is no longer shown unmounts before an effect can
 * observe it, this only animates the *entrance* of newly-shown content, not
 * a true cross-fade of the outgoing content — an intentionally simpler
 * interpretation appropriate for a content area whose entire subtree swaps
 * at once. A list whose individual rows need real enter/exit choreography
 * (add/remove/reorder) needs a different technique — see
 * `useFlipListTransition` for that case.
 *
 * Skips the very first commit of a given `key` by comparing against the
 * *previous* `key` value (initialized to the current `key`, so the first
 * commit trivially matches and skips) rather than an invocation-count
 * boolean. `<StrictMode>` double-invokes effects on mount (mount -> cleanup
 * -> mount again) with no real re-render in between, so a boolean
 * "have I run before" flag sees `key` unchanged both times but still gets
 * flipped to `false` as a side effect of the first invocation — making the
 * second, still-initial invocation misread itself as a genuine subsequent
 * change and fire the entrance animation for real. Comparing against the
 * last-seen `key` instead makes both StrictMode invocations (same `key`) and
 * a real no-op re-render indistinguishable from "nothing changed".
 */
export function useContentTransition<T extends HTMLElement = HTMLDivElement>(key: string | number) {
  const ref = useRef<T>(null)
  const previousKeyRef = useRef(key)

  useEffect(() => {
    const isUnchanged = previousKeyRef.current === key
    previousKeyRef.current = key

    const element = ref.current
    if (isUnchanged || !element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(element, { opacity: 0 }, { opacity: 1, duration: TRANSITION_DURATION, ease: TRANSITION_EASE })
    }, element)

    return () => ctx.revert()
  }, [key])

  return ref
}
