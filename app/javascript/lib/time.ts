const UNITS: [Intl.RelativeTimeFormatUnit, number, string][] = [
  ['year', 365 * 24 * 3600, 'y'],
  ['week', 7 * 24 * 3600, 'w'],
  ['day', 24 * 3600, 'd'],
  ['hour', 3600, 'h'],
  ['minute', 60, 'm'],
]

function elapsed(iso: string, now = Date.now()) {
  return Math.max(0, (now - new Date(iso).getTime()) / 1000)
}

// "3h", "2d", as Instagram labels a post or comment; "now" under a minute.
export function shortTimeAgo(iso: string) {
  const seconds = elapsed(iso)
  for (const [, size, suffix] of UNITS) if (seconds >= size) return `${Math.floor(seconds / size)}${suffix}`
  return 'now'
}

// "3 hours ago".
export function timeAgo(iso: string) {
  const seconds = elapsed(iso)
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, size] of UNITS) if (seconds >= size) return format.format(-Math.floor(seconds / size), unit)
  return 'just now'
}
