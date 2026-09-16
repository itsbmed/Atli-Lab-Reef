function reportDate(analysis) {
  return new Date(analysis.completedAt || analysis.completed_at || analysis.createdAt || analysis.created_at)
}

function aquariumKey(analysis) {
  return String(analysis.aquariumId || analysis.profile_id || analysis.aquariumName || analysis.id)
}

export function latestCompletedByAquarium(analyses = []) {
  const latest = new Map()
  for (const analysis of analyses.filter((item) => item.status === 'completed')) {
    const key = aquariumKey(analysis)
    const current = latest.get(key)
    if (!current || reportDate(analysis) > reportDate(current)) latest.set(key, analysis)
  }
  return [...latest.values()].sort((left, right) => reportDate(right) - reportDate(left))
}

export function buildRecommendationItems(analyses = []) {
  return analyses.flatMap((analysis) => (analysis.recommendationGroups || []).map((recommendation) => {
    const days = Math.max(1, Number(recommendation.recheckDays || recommendation.days) || 14)
    const sourceDate = reportDate(analysis)
    const dueDate = new Date(sourceDate)
    dueDate.setDate(dueDate.getDate() + days)
    return {
      id: `${analysis.id}:${recommendation.key || recommendation.ruleId}`,
      key: recommendation.key || `rule-${recommendation.ruleId}`,
      analysisId: analysis.id,
      aquariumId: analysis.aquariumId || analysis.profile_id || '',
      aquariumName: analysis.aquariumName || 'Aquarium',
      reportNumber: analysis.reportNumber || analysis.barcode || analysis.id,
      reportDate: sourceDate,
      dueDate,
      days,
      title: recommendation.title,
      summary: recommendation.summary,
      priority: recommendation.priority || 'Mittel',
      tone: recommendation.tone || (recommendation.priority === 'Hoch' ? 'critical' : 'watch'),
      groupKey: recommendation.groupKey || 'other',
      parameterKeys: recommendation.parameterKeys || [],
      sourceParameters: analysis.parameters || [],
      parameters: recommendation.parameters?.length
        ? recommendation.parameters
        : (recommendation.parameterKeys || []),
      whys: recommendation.whys?.filter(Boolean).length
        ? recommendation.whys.filter(Boolean)
        : [recommendation.why].filter(Boolean),
      steps: (recommendation.steps || []).filter(Boolean),
    }
  })).sort((left, right) => {
    const priority = (value) => value === 'Hoch' ? 0 : 1
    return priority(left.priority) - priority(right.priority)
      || left.dueDate - right.dueDate
      || left.title.localeCompare(right.title, 'de')
  })
}

export function recommendationProgressKey(item) {
  return item.key
}
