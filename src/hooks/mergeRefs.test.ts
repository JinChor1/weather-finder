import { createRef } from 'react'
import { mergeRefs } from './mergeRefs'

describe('mergeRefs', () => {
  it('assigns the node to every ref object passed in', () => {
    const refA = createRef<HTMLDivElement>()
    const refB = createRef<HTMLDivElement>()
    const node = document.createElement('div')

    const cleanup = mergeRefs(refA, refB)(node)

    expect(refA.current).toBe(node)
    expect(refB.current).toBe(node)

    cleanup()
    expect(refA.current).toBeNull()
    expect(refB.current).toBeNull()
  })

  it('calls callback refs with the node and invokes their returned cleanup on detach', () => {
    const node = document.createElement('div')
    const seen: Array<HTMLDivElement | null> = []
    const innerCleanup = vi.fn()
    const callbackRef = vi.fn((n: HTMLDivElement | null) => {
      seen.push(n)
      return innerCleanup
    })

    const cleanup = mergeRefs<HTMLDivElement>(callbackRef)(node)

    expect(callbackRef).toHaveBeenCalledWith(node)
    expect(seen).toEqual([node])

    cleanup()
    expect(innerCleanup).toHaveBeenCalledTimes(1)
  })

  it('falls back to calling a legacy callback ref with null when it returns no cleanup', () => {
    const node = document.createElement('div')
    const calls: Array<HTMLDivElement | null> = []
    const callbackRef = (n: HTMLDivElement | null) => {
      calls.push(n)
    }

    const cleanup = mergeRefs<HTMLDivElement>(callbackRef)(node)
    expect(calls).toEqual([node])

    cleanup()
    expect(calls).toEqual([node, null])
  })

  it('ignores null/undefined refs', () => {
    const refA = createRef<HTMLDivElement>()
    const node = document.createElement('div')

    expect(() => mergeRefs(refA, null, undefined)(node)()).not.toThrow()
    expect(refA.current).toBeNull()
  })
})
