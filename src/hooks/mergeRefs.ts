import type { Ref } from 'react'

/**
 * Combines any number of refs — ref objects (from `useRef`) and/or callback
 * refs, either of which may be `null`/`undefined` — into a single callback
 * ref, so more than one hook's ref can be attached to the same JSX element
 * via one `ref` prop (an element only ever takes one `ref` attribute).
 *
 * Needed because two independent animation hooks (e.g. `useFadeInUp` for a
 * page-load entrance and `useContentTransition` for a later content-swap
 * transition) sometimes need to observe/animate the exact same DOM node
 * without either hook knowing the other exists.
 *
 * Written for React 19's ref-callback-with-cleanup convention: the merged
 * callback returns its own cleanup function that unwinds each source ref
 * appropriately (calling a callback ref's own returned cleanup if it has
 * one, otherwise falling back to calling it again with `null`; resetting a
 * ref object's `.current` back to `null`) — so callers get the same
 * unmount/detach behavior they'd get attaching each ref individually.
 *
 * Deliberately not annotated as returning `RefCallback<T>` — that type's
 * return value is `void | (() => void)`, which isn't itself callable, and
 * this function's own cleanup-returning callback is still assignable to it
 * (a function that *always* returns `() => void` satisfies a signature
 * requiring `void | (() => void)`) wherever it's actually used as a `ref`.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | null | undefined>) {
  return (node: T | null) => {
    const cleanups: Array<() => void> = []

    for (const ref of refs) {
      if (!ref) continue

      if (typeof ref === 'function') {
        const cleanup = ref(node)
        cleanups.push(typeof cleanup === 'function' ? cleanup : () => ref(null))
      } else {
        ref.current = node
        cleanups.push(() => {
          ref.current = null
        })
      }
    }

    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }
}
