/**
 * Christmas season: Christmas mode (only Christmas songs, lights, snow), the
 * Christmas theme and app icon, and the Christmas card colour.
 *
 * Every year it opens on its own on December 1st and switches itself on, then
 * closes after January 8th (two weeks after Christmas) until next December.
 * Before then it's hidden; open the site with ?christmas=preview to try it early
 * on your own device (?christmas=off hides the preview again).
 */
const OPENS = { month: 12, day: 1 }
const CLOSES = { month: 1, day: 8 }

const KEY = 'praise-play:christmas-preview'

export function inChristmasSeason(date = new Date()): boolean {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return (month === OPENS.month && day >= OPENS.day) || (month === CLOSES.month && day <= CLOSES.day)
}

/** The year the current (or next) season opened in, e.g. 2026 for Jan 5 2027. */
export function seasonYear(date = new Date()): number {
  return date.getMonth() + 1 === CLOSES.month ? date.getFullYear() - 1 : date.getFullYear()
}

function previewing(): boolean {
  try {
    const flag = new URLSearchParams(location.search).get('christmas')
    if (flag === 'preview') localStorage.setItem(KEY, '1')
    if (flag === 'off') localStorage.removeItem(KEY)
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let available: boolean | null = null
export function christmasAvailable(): boolean {
  available ??= inChristmasSeason() || previewing()
  return available
}
