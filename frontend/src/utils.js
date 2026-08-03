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

/**
 * parseDobFromIC — Extracts date of birth (YYYY-MM-DD) from the first 6 digits of a Malaysian IC number.
 *
 * Example:
 *  "880212-14-5566" -> "1988-02-12"
 *  "020510-10-1234" -> "2002-05-10"
 */
export const parseDobFromIC = (ic) => {
  if (!ic) return null
  const cleaned = String(ic).replace(/\D/g, '')
  if (cleaned.length < 6) return null

  const yyStr = cleaned.slice(0, 2)
  const mmStr = cleaned.slice(2, 4)
  const ddStr = cleaned.slice(4, 6)

  const yy = parseInt(yyStr, 10)
  const mm = parseInt(mmStr, 10)
  const dd = parseInt(ddStr, 10)

  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null
  if (mm < 1 || mm > 12) return null
  if (dd < 1 || dd > 31) return null

  const currentTwoDigitYear = new Date().getFullYear() % 100
  const fullYear = yy > currentTwoDigitYear ? 1900 + yy : 2000 + yy

  const formattedMonth = String(mm).padStart(2, '0')
  const formattedDay = String(dd).padStart(2, '0')

  const dateObj = new Date(fullYear, mm - 1, dd)
  if (
    dateObj.getFullYear() !== fullYear ||
    dateObj.getMonth() !== mm - 1 ||
    dateObj.getDate() !== dd
  ) {
    return null
  }

  return `${fullYear}-${formattedMonth}-${formattedDay}`
}

/**
 * getWhatsAppUrl — Generates a direct WhatsApp (wa.me) URL for a Malaysian phone number.
 */
export const getWhatsAppUrl = (phone) => {
  if (!phone) return '#'
  let clean = String(phone).replace(/\D/g, '')
  if (clean.startsWith('0060')) clean = clean.substring(2)
  else if (clean.startsWith('0')) clean = '6' + clean
  else if (clean.startsWith('1') && (clean.length === 9 || clean.length === 10)) clean = '60' + clean
  return `https://wa.me/${clean}`
}
