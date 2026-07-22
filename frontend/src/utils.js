/**
 * formatPhone — Display-only formatter for Malaysian phone numbers.
 *
 * Converts raw DB strings (e.g. "60175367535") into human-readable form
 * (e.g. "+60 17-536 7535") without mutating the underlying data.
 *
 * Rules:
 *  - 60 11X... (12 digits) → +60 11-XXXX XXXX   (011 numbers have 8-digit subscriber)
 *  - 60 1X...  (11 digits) → +60 1X-XXX XXXX    (all other 01X have 7-digit subscriber)
 *  - Anything else passes through unchanged.
 */
export const formatPhone = (num) => {
  if (!num) return num
  const s = String(num).trim()
  if (!s.startsWith('60')) return s
  const local = s.slice(2) // strip country code, gives '1XXXXXXXXX'
  if (local.startsWith('11') && local.length === 10) {
    // 011 series: +60 11-XXXX XXXX
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 6)} ${local.slice(6)}`
  }
  if (local.startsWith('1') && local.length === 9) {
    // 01X series: +60 1X-XXX XXXX
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 5)} ${local.slice(5)}`
  }
  return `+60 ${local}` // fallback — still looks better than raw
}
