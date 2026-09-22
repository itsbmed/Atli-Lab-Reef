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

// Relative course days instead of calendar dates: the plan stays valid whenever the customer starts.
export function doseSchedule(items = []) {
  const rows = items.filter(item => item.dose?.dailyAmounts?.length)
  const days = Math.max(0, ...rows.map(item => item.dose.dailyAmounts.length))
  return {
    days,
    rows: rows.map(item => ({
      key: item.key,
      label: item.label,
      unit: item.unit,
      productName: item.dose.productName,
      totalMl: item.dose.totalMl,
      dailyMl: item.dose.dailyMl,
      maxDailyMl: item.dose.maxDailyMl,
      amounts: Array.from({ length: days }, (_, index) => item.dose.dailyAmounts[index] ?? null),
    })),
  }
}
