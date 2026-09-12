import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { SearchHistory } from './SearchHistory'
import type { SearchHistoryEntry } from '../store/useSearchHistoryStore'

function makeEntry(overrides: Partial<SearchHistoryEntry>): SearchHistoryEntry {
  return {
    id: 'id-1',
    label: 'Johor, MY',
    query: 'Johor, MY',
    searchedAt: '2022-01-09T09:41:00Z',
    ...overrides,
  }
}

function makeEntries(count: number): SearchHistoryEntry[] {
  return Array.from({ length: count }, (_, index) =>
    makeEntry({ id: `id-${index}`, label: `City ${index}, XX`, query: `City ${index}, XX` }),
  )
}

/**
 * `SearchHistory` is presentational — deletion actually shrinking `entries`
 * (needed to exercise the post-delete focus-management behavior) requires a
 * stateful wrapper standing in for `TodaysWeather`'s real `onDelete` wiring.
 */
function ControlledSearchHistory({ initialEntries }: { initialEntries: SearchHistoryEntry[] }) {
  const [entries, setEntries] = useState(initialEntries)
  return (
    <SearchHistory
      entries={entries}
      onSearchAgain={vi.fn()}
      onDelete={(id) => setEntries((current) => current.filter((entry) => entry.id !== id))}
    />
  )
}

describe('SearchHistory', () => {
  it('shows the "No Record" empty state when there is no history', () => {
    render(<SearchHistory entries={[]} onSearchAgain={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('No Record')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument()
  })

  it('renders each history row with its label, timestamp, and action buttons', () => {
    render(
      <SearchHistory
        entries={[makeEntry({})]}
        onSearchAgain={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('Johor, MY')).toBeInTheDocument()
    expect(screen.getByText('01-09-2022 09:41am')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search again for Johor, MY' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Johor, MY from history' })).toBeInTheDocument()
  })

  it('shows only 5 rows initially and reveals 5 more per "Show more" click', async () => {
    const user = userEvent.setup()
    render(<SearchHistory entries={makeEntries(12)} onSearchAgain={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(5)

    await user.click(screen.getByRole('button', { name: /show more/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(10)

    await user.click(screen.getByRole('button', { name: /show more/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(12)
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument()
  })

  it('calls onSearchAgain with the entry\'s raw query when its search-again button is clicked', async () => {
    const user = userEvent.setup()
    const onSearchAgain = vi.fn()
    render(
      <SearchHistory entries={[makeEntry({ query: 'Johor Bahru, Johor, MY' })]} onSearchAgain={onSearchAgain} onDelete={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Search again for Johor, MY' }))

    expect(onSearchAgain).toHaveBeenCalledWith('Johor Bahru, Johor, MY')
  })

  it('calls onDelete with the entry\'s id when its delete button is clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<SearchHistory entries={[makeEntry({ id: 'entry-42' })]} onSearchAgain={vi.fn()} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Delete Johor, MY from history' }))

    expect(onDelete).toHaveBeenCalledWith('entry-42')
  })

  it('moves focus to the next row\'s delete button after deleting a row', async () => {
    const user = userEvent.setup()
    render(<ControlledSearchHistory initialEntries={makeEntries(3)} />)

    await user.click(screen.getByRole('button', { name: 'Delete City 0, XX from history' }))

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete City 1, XX from history' }))
  })

  it('moves focus to the previous row\'s delete button when deleting the last row', async () => {
    const user = userEvent.setup()
    render(<ControlledSearchHistory initialEntries={makeEntries(3)} />)

    await user.click(screen.getByRole('button', { name: 'Delete City 2, XX from history' }))

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete City 1, XX from history' }))
  })

  it('moves focus to the "Search History" heading after deleting the only remaining row', async () => {
    const user = userEvent.setup()
    render(<ControlledSearchHistory initialEntries={[makeEntry({})]} />)

    await user.click(screen.getByRole('button', { name: 'Delete Johor, MY from history' }))

    expect(screen.getByText('No Record')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Search History' }))
  })

  it('moves focus to the list when "Show more" unmounts itself after revealing the final page', async () => {
    const user = userEvent.setup()
    render(<ControlledSearchHistory initialEntries={makeEntries(7)} />)

    await user.click(screen.getByRole('button', { name: /show more/i }))

    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('list'))
  })
})
