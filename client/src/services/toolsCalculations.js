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


