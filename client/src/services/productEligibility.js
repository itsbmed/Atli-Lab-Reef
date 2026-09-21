const INVALID_STATUSES = new Set(['invalid', 'failed', 'math_error'])

export function eligibleProductKeys(keys = [], parameters = []) {
  const requested = new Set(keys)
  return parameters.filter((parameter) => {
    if (!requested.has(parameter.key) || INVALID_STATUSES.has(parameter.resultStatus) || parameter.groupKey === 'pollutants') return false
    if (parameter.tone === 'good' || (parameter.sourceDirection && parameter.sourceDirection !== 'low')) return false
    if (parameter.value === null || parameter.value === undefined || parameter.value === '') return false
    const rawValue = String(parameter.value).trim()
    if (!rawValue) return false
    const value = Number(rawValue)
    const rawMinimum = parameter.referenceRange?.min
    const target = String(parameter.target || '').match(/-?\d+(?:[.,]\d+)?/g) || []
    const minimum = rawMinimum !== null && rawMinimum !== undefined && rawMinimum !== ''
      ? Number(rawMinimum)
      : Number(target[0]?.replace(',', '.'))
    return Number.isFinite(value) && Number.isFinite(minimum) && value < minimum
  }).map((parameter) => parameter.key)
}
