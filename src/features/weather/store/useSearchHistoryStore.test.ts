import { act } from '@testing-library/react'
import { MAX_SEARCH_HISTORY_SIZE, useSearchHistoryStore } from './useSearchHistoryStore'

const STORAGE_KEY = 'weather-finder-search-history'

describe('useSearchHistoryStore', () => {
  beforeEach(() => {
    localStorage.clear()
    act(() => {
      useSearchHistoryStore.setState({ entries: [] })
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('starts empty', () => {
    expect(useSearchHistoryStore.getState().entries).toEqual([])
  })

  it('adds a new entry to the top of the list', () => {
    act(() => {
      useSearchHistoryStore.getState().addEntry({ label: 'Johor, MY', query: 'Johor, MY' })
      useSearchHistoryStore.getState().addEntry({ label: 'Paris, FR', query: 'Paris, FR' })
    })

    const { entries } = useSearchHistoryStore.getState()
    expect(entries).toHaveLength(2)
    expect(entries[0].label).toBe('Paris, FR')
    expect(entries[1].label).toBe('Johor, MY')
    expect(entries[0].id).not.toBe(entries[1].id)
  })

  it('persists entries to localStorage', () => {
    act(() => {
      useSearchHistoryStore.getState().addEntry({ label: 'Johor, MY', query: 'Johor, MY' })
    })

    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored as string).state.entries).toHaveLength(1)
  })

  it('moves a re-searched location to the top and updates its query/timestamp instead of duplicating it', () => {
    act(() => {
      useSearchHistoryStore.getState().addEntry({ label: 'Johor, MY', query: 'Johor, MY' })
      useSearchHistoryStore.getState().addEntry({ label: 'Paris, FR', query: 'Paris, FR' })
    })
    const originalId = useSearchHistoryStore.getState().entries[1].id

    act(() => {
      // Case-insensitive re-search with a slightly different raw query string.
      useSearchHistoryStore.getState().addEntry({ label: 'johor, my', query: 'Johor Bahru, Johor, MY' })
    })

    const { entries } = useSearchHistoryStore.getState()
    expect(entries).toHaveLength(2)
    expect(entries[0].label).toBe('johor, my')
    expect(entries[0].id).toBe(originalId)
    expect(entries[0].query).toBe('Johor Bahru, Johor, MY')
  })

  it(`caps history at ${MAX_SEARCH_HISTORY_SIZE} entries, evicting the oldest`, () => {
    act(() => {
      for (let i = 0; i < MAX_SEARCH_HISTORY_SIZE + 3; i++) {
        useSearchHistoryStore.getState().addEntry({ label: `City ${i}, XX`, query: `City ${i}, XX` })
      }
    })

    const { entries } = useSearchHistoryStore.getState()
    expect(entries).toHaveLength(MAX_SEARCH_HISTORY_SIZE)
    // Most recently added is first; the oldest three were evicted.
    expect(entries[0].label).toBe(`City ${MAX_SEARCH_HISTORY_SIZE + 2}, XX`)
    expect(entries.some((entry) => entry.label === 'City 0, XX')).toBe(false)
    expect(entries.some((entry) => entry.label === 'City 2, XX')).toBe(false)
    expect(entries.some((entry) => entry.label === 'City 3, XX')).toBe(true)
  })

  it('removes a single entry by id', () => {
    act(() => {
      useSearchHistoryStore.getState().addEntry({ label: 'Johor, MY', query: 'Johor, MY' })
      useSearchHistoryStore.getState().addEntry({ label: 'Paris, FR', query: 'Paris, FR' })
    })
    const idToRemove = useSearchHistoryStore.getState().entries[0].id

    act(() => {
      useSearchHistoryStore.getState().removeEntry(idToRemove)
    })

    const { entries } = useSearchHistoryStore.getState()
    expect(entries).toHaveLength(1)
    expect(entries[0].label).toBe('Johor, MY')
  })
})
