export function linkError(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return 'Bitte einen gültigen http- oder https-Link eingeben.'
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || /\s/.test(value)) throw new Error()
    return ''
  } catch {
    return 'Bitte einen gültigen http- oder https-Link eingeben.'
  }
}

export function dosingEntryErrors(entry = {}) {
  const errors = {}
  if ((entry.productOverride || entry.enabled) && !String(entry.productName || '').trim()) errors.productName = 'Produktname fehlt.'
  if (linkError(entry.productUrl)) errors.productUrl = linkError(entry.productUrl)
  if (linkError(entry.productImage)) errors.productImage = linkError(entry.productImage)
  if (entry.enabled) {
    for (const [key, label] of [['mlPer100Liters', 'Produktmenge'], ['raisesBy', 'Produktwirkung'], ['maxDailyIncrease', 'Maximaler Tagesanstieg']]) {
      if (!Number.isFinite(Number(entry[key])) || !(Number(entry[key]) > 0)) errors[key] = `${label} muss größer als 0 sein.`
    }
  }
  return errors
}

export function elementEntryError(entry = {}) {
  if (entry.targetMin === '' || entry.targetMax === '' || entry.targetMin == null || entry.targetMax == null || !Number.isFinite(Number(entry.targetMin)) || !Number.isFinite(Number(entry.targetMax))) return 'Bitte beide Zielwerte ausfüllen.'
  if (Number(entry.targetMin) > Number(entry.targetMax)) return 'Ziel Minimum darf nicht größer als Ziel Maximum sein.'
  if (!String(entry.unit || '').trim()) return 'Einheit fehlt.'
  return ''
}
