const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-07-14" → "Jul 14, 2026" (the hub's old `toLocaleDateString('en', …)` format, fixed in UTC). */
export function formatShort(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`
}

/** "2026-Q3" → "Q3 2026". */
export function quarterLabel(q: string): string {
  const [y, n] = q.split('-')
  return `${n} ${y}`
}
