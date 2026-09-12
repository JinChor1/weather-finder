import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia; GSAP's ScrollTrigger needs it to register.
window.matchMedia ??= (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})

// jsdom doesn't implement ResizeObserver; Lenis needs it to track dimensions.
class MockResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= MockResizeObserver
