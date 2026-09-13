/**
 * Shared "MM-DD-YYYY hh:mm" timestamp formatting for the "Today's Weather"
 * feature — extracted after `SearchHistory.tsx` (`formatSearchedAt`) and
 * `WeatherResult.tsx` (`formatObservedAt`) accumulated near-identical
 * MM-DD-YYYY plus 12-hour-clock-from-UTC-getters logic, differing only in
 * AM/PM casing/spacing (a byproduct of the mockup's own inconsistency across
 * its two screens, not a deliberate product requirement). Uses UTC getters
 * so the displayed time is deterministic regardless of the viewer's/test
 * runner's local timezone.
 */

export type TimestampPeriodStyle = 'upper-spaced' | 'lower-compact'

/**
 * Formats an ISO timestamp as `MM-DD-YYYY hh:mm AM/PM` (`periodStyle:
 * 'upper-spaced'`, matching `WeatherResult`'s mockup) or
 * `MM-DD-YYYY hh:mmam/pm` (`periodStyle: 'lower-compact'`, matching the
 * search-history mockup).
 */
export function formatTimestamp(isoTimestamp: string, periodStyle: TimestampPeriodStyle): string {
  const date = new Date(isoTimestamp)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  const hours24 = date.getUTCHours()
  const hours12 = String(hours24 % 12 || 12).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')

  const isPm = hours24 >= 12
  const period = periodStyle === 'upper-spaced' ? (isPm ? ' PM' : ' AM') : isPm ? 'pm' : 'am'

  return `${month}-${day}-${year} ${hours12}:${minutes}${period}`
}
