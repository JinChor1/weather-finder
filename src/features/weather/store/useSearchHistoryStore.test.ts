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

  it('moves a re-searched location to the top and updates its label/timestamp instead of duplicating it, matching on the raw query (case-insensitive) rather than the display label', () => {
    act(() => {
      useSearchHistoryStore.getState().addEntry({ label: 'Johor, MY', query: 'Johor, MY' })
      useSearchHistoryStore.getState().addEntry({ label: 'Paris, FR', query: 'Paris, FR' })
    })
    const originalId = useSearchHistoryStore.getState().entries[1].id

    act(() => {
      // Same raw query, different case, and the weather API happening to
      // return a slightly different display label this time.
      useSearchHistoryStore.getState().addEntry({ label: 'Johor Bahru, MY', query: 'johor, my' })
    })

    const { entries } = useSearchHistoryStore.getState()
    expect(entries).toHaveLength(2)
    expect(entries[0].label).toBe('Johor Bahru, MY')
    expect(entries[0].id).toBe(originalId)
    expect(entries[0].query).toBe('johor, my')
  })

  it('keeps two entries with the same display label but different raw queries distinct, instead of merging them', () => {
    // Two real, different "Springfield, US" locations (different states) —
    // `label` is built from the weather API's `city`/`country` only, so
    // both would render identically, even though the raw queries that
    // produced them differ.
    act(() => {
      useSearchHistoryStore.getState().addEntry({ label: 'Springfield, US', query: 'Springfield, Illinois, US' })
      useSearchHistoryStore.getState().addEntry({ label: 'Springfield, US', query: 'Springfield, Missouri, US' })
    })

    const { entries } = useSearchHistoryStore.getState()
    expect(entries).toHaveLength(2)
    expect(entries.map((entry) => entry.query)).toEqual(['Springfield, Missouri, US', 'Springfield, Illinois, US'])
    expect(entries[0].id).not.toBe(entries[1].id)
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

  it('falls back to an empty history when the persisted localStorage value does not match the expected shape', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { entries: 'not-an-array' }, version: 0 }))
    vi.resetModules()

    const { useSearchHistoryStore: freshStore } = await import('./useSearchHistoryStore')
    expect(freshStore.getState().entries).toEqual([])

    vi.resetModules()
  })

  it('falls back to an empty history when a persisted entry is missing a required field', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { entries: [{ id: 'a', label: 'Johor, MY', query: 'Johor, MY' }] }, version: 0 }),
    )
    vi.resetModules()

    const { useSearchHistoryStore: freshStore } = await import('./useSearchHistoryStore')
    expect(freshStore.getState().entries).toEqual([])

    vi.resetModules()
  })

  it('loads a validly-shaped persisted history as-is', async () => {
    const validEntry = { id: 'a', label: 'Johor, MY', query: 'Johor, MY', searchedAt: '2022-01-09T09:41:00Z' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { entries: [validEntry] }, version: 0 }))
    vi.resetModules()

    const { useSearchHistoryStore: freshStore } = await import('./useSearchHistoryStore')
    expect(freshStore.getState().entries).toEqual([validEntry])

    vi.resetModules()
  })
})
