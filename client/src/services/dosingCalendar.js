// Quantize down so rounding can never exceed the product's approved daily limit.
export function splitDose({ deficit, raisesBy, mlPer100Liters, maxDailyIncrease, volume }) {
  if (![deficit, raisesBy, mlPer100Liters, maxDailyIncrease, volume].every(value => Number.isFinite(Number(value)) && Number(value) > 0)) return null
  const scale = 1e6
  const denominator = 100 * Number(raisesBy)
  const totalUnits = Math.floor(Number(deficit) * Number(mlPer100Liters) * Number(volume) * scale / denominator)
  const limitUnits = Math.floor(Number(maxDailyIncrease) * Number(mlPer100Liters) * Number(volume) * scale / denominator)
  if (!Number.isSafeInteger(totalUnits) || !Number.isSafeInteger(limitUnits) || totalUnits <= 0 || limitUnits <= 0) return null
  const days = Math.max(1, Math.ceil(Number(deficit) / Number(maxDailyIncrease)), Math.ceil(totalUnits / limitUnits))
  const base = Math.floor(totalUnits / days)
  const remainder = totalUnits % days
  const dailyAmounts = Array.from({ length: days }, (_, index) => (base + (index < remainder ? 1 : 0)) / scale)
  return { totalMl: totalUnits / scale, days, dailyMl: (base + (remainder ? 1 : 0)) / scale, dailyAmounts, maxDailyMl: limitUnits / scale, maxDailyIncrease: Number(maxDailyIncrease) }
}

export function dateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function weekStart(value) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value || '')
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 53) return ''
  const date = new Date(Number(match[1]), 0, 4, 12)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + (Number(match[2]) - 1) * 7)
  return dateValue(date)
}

export function calendarWeeks(items, start) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '')) return []
  const first = new Date(`${start}T12:00:00`)
  if (Number.isNaN(first.getTime()) || dateValue(first) !== start) return []
  const count = Math.max(0, ...items.map(item => item.dose?.days || 0))
  return Array.from({ length: Math.ceil(count / 7) }, (_, week) => Array.from({ length: 7 }, (_, day) => {
    const index = week * 7 + day
    const date = new Date(first)
    date.setDate(first.getDate() + index)
    return { date: dateValue(date), label: date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }), doses: items.flatMap(item => index < item.dose.dailyAmounts.length && item.dose.dailyAmounts[index] > 0 ? [{ key: item.key, label: item.label, product: item.dose.productName, ml: item.dose.dailyAmounts[index] }] : []) }
  }))
}
