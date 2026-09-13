import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import gsap from 'gsap'
import { useContentTransition } from './useContentTransition'

/** Minimal host component so the hook's ref actually attaches to a real DOM node, as JSX would. */
function ContentTransitionProbe({ transitionKey, text }: { transitionKey: string; text: string }) {
  const ref = useContentTransition<HTMLDivElement>(transitionKey)
  return (
    <div ref={ref} data-testid="content-transition-target">
      {text}
    </div>
  )
}

describe('useContentTransition', () => {
  it('renders the element immediately on mount', () => {
    const { getByTestId } = render(<ContentTransitionProbe transitionKey="idle" text="Search a city…" />)
    expect(getByTestId('content-transition-target')).toHaveTextContent('Search a city…')
  })

  it('re-renders new content without throwing when the key changes (e.g. idle -> loading -> success)', () => {
    const { getByTestId, rerender } = render(<ContentTransitionProbe transitionKey="idle" text="idle" />)

    rerender(<ContentTransitionProbe transitionKey="loading" text="loading" />)
    expect(getByTestId('content-transition-target')).toHaveTextContent('loading')

    rerender(<ContentTransitionProbe transitionKey="success:Johor, MY" text="Johor, MY" />)
    expect(getByTestId('content-transition-target')).toHaveTextContent('Johor, MY')
  })

  it('does not replay/throw when re-rendered with the same key (unrelated re-render)', () => {
    const { getByTestId, rerender } = render(<ContentTransitionProbe transitionKey="success:Johor, MY" text="Johor, MY" />)

    expect(() =>
      rerender(<ContentTransitionProbe transitionKey="success:Johor, MY" text="Johor, MY (refetched)" />),
    ).not.toThrow()
    expect(getByTestId('content-transition-target')).toHaveTextContent('Johor, MY (refetched)')
  })

  it('mounts, transitions, and unmounts without throwing when GSAP animates the element', () => {
    const { rerender, unmount } = render(<ContentTransitionProbe transitionKey="idle" text="idle" />)
    rerender(<ContentTransitionProbe transitionKey="success:Paris, FR" text="Paris, FR" />)
    expect(() => unmount()).not.toThrow()
  })

  it('does not replay the entrance tween on a StrictMode double-invoked mount with an unchanged key', () => {
    // Regression test: `<StrictMode>` (active app-wide via `src/main.tsx`)
    // double-invokes effects on mount — mount -> cleanup -> mount again —
    // with no real re-render or key change in between. An earlier
    // "have I run before" boolean flag saw the *first* of those two
    // invocations as the initial mount (correctly skipping), but flipped
    // itself to "already run" as a side effect, so the second invocation
    // (same key, still the initial mount) misread itself as a genuine
    // subsequent change and fired the tween for real — a visible double
    // fade-in. Comparing against the previous `key` value instead means
    // both invocations see an unchanged key and skip.
    const fromToSpy = vi.spyOn(gsap, 'fromTo')

    render(
      <StrictMode>
        <ContentTransitionProbe transitionKey="idle" text="idle" />
      </StrictMode>,
    )

    expect(fromToSpy).not.toHaveBeenCalled()
    fromToSpy.mockRestore()
  })

  it('skips the animation and still renders normally when prefers-reduced-motion is set', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia

    const { getByTestId, rerender, unmount } = render(<ContentTransitionProbe transitionKey="idle" text="idle" />)
    rerender(<ContentTransitionProbe transitionKey="success:Paris, FR" text="Paris, FR" />)

    expect(getByTestId('content-transition-target')).toHaveTextContent('Paris, FR')
    expect(() => unmount()).not.toThrow()

    window.matchMedia = originalMatchMedia
  })
})
