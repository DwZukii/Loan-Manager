// ── Shared Number Classification & Extraction Utilities ──────────────────────
// Pure functions with zero React dependencies.
// Used by AdminCleanAdd.jsx for spreadsheet phone-number extraction.

/**
 * Classify a raw string as 'ic', 'phone', 'ambiguous', or null.
 * IC   = exactly 12 raw digits with a valid YYMMDD birth date
 * Phone = normalises to a valid Malaysian 601x number (11 or 12 digits)
 * Ambiguous = 6011xxxxxxxx (12 digits) — valid as both a November-1960 IC AND a 6011 phone
 */
export const classifyNumber = (rawPart) => {
  const clean = String(rawPart).replace(/\D/g, '')
  if (!clean) return null

  // ── Phone normalisation ──
  let p = clean
  if (p.startsWith('0060')) p = p.substring(2)
  if (p.startsWith('1') && (p.length === 9 || p.length === 10)) p = '60' + p
  else if (p.startsWith('0') && (p.length === 10 || p.length === 11)) p = '6' + p
  const phoneValid = p.startsWith('601') && (p.length === 11 || p.length === 12)

  // ── IC validation (YYMMDD) ──
  const mm = parseInt(clean.slice(2, 4))
  const dd = parseInt(clean.slice(4, 6))
  const icValid = clean.length === 12 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31

  if (icValid && phoneValid) return { type: 'ambiguous', icValue: clean, phoneValue: p }
  if (icValid)               return { type: 'ic',        value: clean }
  if (phoneValid)            return { type: 'phone',     value: p }
  return null
}

/**
 * Derive age from a valid Malaysian IC string (YYMMDD...).
 */
export const extractAge = (icStr) => {
  const yy = parseInt(icStr.slice(0, 2))
  const currentYear = new Date().getFullYear()
  const cutoff = currentYear % 100
  const fullYear = yy <= cutoff ? 2000 + yy : 1900 + yy
  return currentYear - fullYear
}

/**
 * MODE A: All Numbers extraction.
 * Iterates every cell and grabs all valid Malaysian phone numbers regardless of age or IC.
 */
export const runAllNumbersExtraction = async (rawData, onProgress) => {
  const extracted = []
  const YIELD_EVERY = 5000
  for (let r = 0; r < rawData.length; r++) {
    const row = rawData[r]
    if (row) {
      row.forEach(cell => {
        if (!cell) return
        const cellStr = String(cell)
        const matches = cellStr.match(/[\d\s\-+.()]+/g) || []
        matches.forEach(part => {
          let clean = part.replace(/\D/g, '')
          if (!clean) return
          if (clean.startsWith('0060')) clean = clean.substring(2)
          if (clean.startsWith('1') && (clean.length === 9 || clean.length === 10)) clean = '60' + clean
          else if (clean.startsWith('0') && (clean.length === 10 || clean.length === 11)) clean = '6' + clean
          if (clean.startsWith('601') && (clean.length === 11 || clean.length === 12)) extracted.push(clean)
        })
      })
    }
    if ((r + 1) % YIELD_EVERY === 0) {
      onProgress && onProgress(r + 1, rawData.length)
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  onProgress && onProgress(rawData.length, rawData.length)
  return extracted
}

/**
 * MODE B: By Age Range extraction.
 * Iterates row-by-row. Each row must contain both a valid Malaysian IC and a
 * phone number. Rows missing either are skipped. The IC is decoded to get the
 * person's age; if the age falls outside [minAge, maxAge] the row is skipped.
 *
 * Disambiguation rules for the 6011/IC ambiguity:
 *   clear IC + clear phone         → use both
 *   clear IC + ambiguous (no phone) → treat ambiguous as phone
 *   clear phone + ambiguous (no IC) → treat ambiguous as IC
 *   two ambiguous, nothing else     → first = IC, second = phone
 *   single ambiguous only           → skip (cannot safely determine role)
 */
export const runAgeFilteredExtraction = async (rawData, minA, maxA, onProgress) => {
  const extracted = []
  let rowsScanned = 0, rowsWithIC = 0, rowsMatched = 0
  const YIELD_EVERY = 5000

  for (let r = 0; r < rawData.length; r++) {
    const row = rawData[r]
    if (!row || row.length === 0) {
      if ((r + 1) % YIELD_EVERY === 0) {
        onProgress && onProgress(r + 1, rawData.length)
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      continue
    }
    rowsScanned++

    const ics = [], phones = [], ambiguous = []

    row.forEach(cell => {
      if (!cell) return
      const cellStr = String(cell)
      const matches = cellStr.match(/[\d\s\-+.()]+/g) || []
      matches.forEach(part => {
        const result = classifyNumber(part)
        if (!result) return
        if (result.type === 'ic')        ics.push(result.value)
        else if (result.type === 'phone')     phones.push(result.value)
        else if (result.type === 'ambiguous') ambiguous.push(result)
      })
    })

    // Resolve which number is IC and which is phone for this row
    let icStr = null, phoneStr = null
    if (ics.length > 0 && phones.length > 0) {
      icStr = ics[0]; phoneStr = phones[0]
    } else if (ics.length > 0 && phones.length === 0 && ambiguous.length > 0) {
      icStr = ics[0]; phoneStr = ambiguous[0].phoneValue
    } else if (phones.length > 0 && ics.length === 0 && ambiguous.length > 0) {
      icStr = ambiguous[0].icValue; phoneStr = phones[0]
    } else if (ics.length === 0 && phones.length === 0 && ambiguous.length >= 2) {
      icStr = ambiguous[0].icValue; phoneStr = ambiguous[1].phoneValue
    }
    // ambiguous.length === 1 with nothing else → unresolvable, skip

    if (!icStr || !phoneStr) {
      if ((r + 1) % YIELD_EVERY === 0) {
        onProgress && onProgress(r + 1, rawData.length)
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      continue
    }
    rowsWithIC++

    const age = extractAge(icStr)
    if (age >= minA && age <= maxA) {
      rowsMatched++
      extracted.push({ phone: phoneStr, age })
    }

    if ((r + 1) % YIELD_EVERY === 0) {
      onProgress && onProgress(r + 1, rawData.length)
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  onProgress && onProgress(rawData.length, rawData.length)
  return { numbers: extracted, rowsScanned, rowsWithIC, rowsMatched }
}
