export function clampNumber(value, minimum, maximum, fallback = minimum) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maximum, Math.max(minimum, number))
}

export function waterChangeFraction({ amount, unit, volume }) {
  const safeVolume = Math.max(1, Number(volume) || 1)
  if (unit === 'l') return clampNumber(Number(amount) / safeVolume, 0.01, 0.9, 0.01)
  return clampNumber(Number(amount) / 100, 0.01, 0.9, 0.01)
}

export function simulateWaterChanges(parameters, replacementValues, count, fraction) {
  const safeCount = Math.round(clampNumber(count, 1, 12, 1))
  const safeFraction = clampNumber(fraction, 0.01, 0.9, 0.01)

  return Object.fromEntries(parameters.map((parameter) => {
    let value = Number(parameter.aquarium) || 0
    const replacement = Number(replacementValues[parameter.key]) || 0
    for (let index = 0; index < safeCount; index += 1) {
      value = value * (1 - safeFraction) + replacement * safeFraction
    }
    return [parameter.key, value]
  }))
}

export function scoreValue(value, target) {
  const [minimum, maximum] = target.map(Number)
  if (value >= minimum && value <= maximum) return 100
  const width = maximum - minimum || 1
  const distance = value < minimum ? minimum - value : value - maximum
  return Math.max(0, Math.round(100 - (distance / width) * 55))
}

export function scoreParameters(parameters, values) {
  if (!parameters.length) return 0
  const total = parameters.reduce((sum, parameter) => (
    sum + scoreValue(Number(values[parameter.key]), parameter.target)
  ), 0)
  return Math.round(total / parameters.length)
}

export function parameterFromAnalysis(analysis, key) {
  return analysis?.parameters?.find((parameter) => parameter.key === key) || null
}

export function buildAnalysisSeries(analyses, parameterKey, { months = 0, now = new Date() } = {}) {
  const cutoff = months > 0
    ? new Date(now.getFullYear(), now.getMonth() - Number(months), now.getDate())
    : null

  return analyses
    .map((analysis) => {
      const parameter = parameterFromAnalysis(analysis, parameterKey)
      const date = new Date(analysis.completed_at || analysis.completedAt || analysis.created_at || analysis.createdAt)
      const value = Number(parameter?.value)
      if (!parameter || !Number.isFinite(value) || Number.isNaN(date.getTime())) return null
      if (cutoff && date < cutoff) return null
      return {
        analysisId: analysis.id,
        date,
        value,
        unit: parameter.unit || '',
        minimum: Number(parameter.referenceRange?.min),
        maximum: Number(parameter.referenceRange?.max),
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.date - right.date)
}

export function calculateConsumption({ olderValue, newerValue, intervalDays, dosingMode = 'none', documentedDose = 0 }) {
  const days = Math.max(1, Number(intervalDays) || 1)
  const measuredDropPerDay = (Number(olderValue) - Number(newerValue)) / days
  const documented = Math.max(0, Number(documentedDose) || 0)
  const suppliedPerDay = dosingMode === 'once'
    ? documented / days
    : dosingMode === 'regular' ? documented : 0
  const consumptionPerDay = measuredDropPerDay + suppliedPerDay

  return {
    consumptionPerDay,
    suppliedPerDay,
    recommendedAdditionalPerDay: dosingMode === 'regular' ? measuredDropPerDay : consumptionPerDay,
  }
}

export function isoWeekValue(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
