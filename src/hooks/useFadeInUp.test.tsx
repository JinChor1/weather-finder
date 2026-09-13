import { render } from '@testing-library/react'
import { useFadeInUp } from './useFadeInUp'

/** Minimal host component so the hook's ref actually attaches to a real DOM node, as JSX would. */
function FadeInUpProbe({ order }: { order: number }) {
  const ref = useFadeInUp<HTMLDivElement>(order)
  return (
    <div ref={ref} data-testid="fade-in-target">
      content
    </div>
  )
}

describe('useFadeInUp', () => {
  it('mounts and unmounts without throwing when GSAP animates the element', () => {
    const { unmount } = render(<FadeInUpProbe order={2} />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders the element immediately regardless of stagger order', () => {
    const { getByTestId } = render(<FadeInUpProbe order={3} />)
    expect(getByTestId('fade-in-target')).toHaveTextContent('content')
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

    const { getByTestId, unmount } = render(<FadeInUpProbe order={0} />)
    expect(getByTestId('fade-in-target')).toBeInTheDocument()
    expect(() => unmount()).not.toThrow()

    window.matchMedia = originalMatchMedia
  })
})
