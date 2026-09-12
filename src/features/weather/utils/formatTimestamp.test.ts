import { formatTimestamp } from './formatTimestamp'

describe('formatTimestamp', () => {
  it('formats a morning timestamp as "MM-DD-YYYY hh:mm AM" with "upper-spaced"', () => {
    expect(formatTimestamp('2022-01-09T09:41:00Z', 'upper-spaced')).toBe('01-09-2022 09:41 AM')
  })

  it('formats an afternoon timestamp as "MM-DD-YYYY hh:mm PM" with "upper-spaced"', () => {
    expect(formatTimestamp('2022-01-09T21:41:00Z', 'upper-spaced')).toBe('01-09-2022 09:41 PM')
  })

  it('formats a morning timestamp as "MM-DD-YYYY hh:mmam" with "lower-compact"', () => {
    expect(formatTimestamp('2022-01-09T09:41:00Z', 'lower-compact')).toBe('01-09-2022 09:41am')
  })

  it('formats an afternoon timestamp as "MM-DD-YYYY hh:mmpm" with "lower-compact"', () => {
    expect(formatTimestamp('2022-01-09T21:41:00Z', 'lower-compact')).toBe('01-09-2022 09:41pm')
  })

  it('formats midnight as 12, not 00, in both styles', () => {
    expect(formatTimestamp('2022-01-09T00:05:00Z', 'upper-spaced')).toBe('01-09-2022 12:05 AM')
    expect(formatTimestamp('2022-01-09T00:05:00Z', 'lower-compact')).toBe('01-09-2022 12:05am')
  })

  it('formats noon as 12, not 00, in both styles', () => {
    expect(formatTimestamp('2022-01-09T12:05:00Z', 'upper-spaced')).toBe('01-09-2022 12:05 PM')
    expect(formatTimestamp('2022-01-09T12:05:00Z', 'lower-compact')).toBe('01-09-2022 12:05pm')
  })
})
