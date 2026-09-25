import { buildDirectRecommendations, evaluateAnalysis } from './directRecommendations.js'
import { findScale, loadActiveScaleId, loadEvaluationScales } from './evaluationScales.js'
import { templateMap } from './recommendationTemplates.js'

const DAY = 86400000

export function reportDate(analysis) {
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

export function startOfToday(now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return start
}

// Overdue and today collapse into one bucket: both mean "do this now".
export function dueBucket(dueDate, now = new Date()) {
  const days = Math.floor((startOfToday(dueDate) - startOfToday(now)) / DAY)
  if (days <= 0) return 'now'
  if (days <= 7) return 'week'
  return 'later'
}

export function dueLabel(dueDate, now = new Date()) {
  const days = Math.floor((startOfToday(dueDate) - startOfToday(now)) / DAY)
  if (days < 0) return `seit ${Math.abs(days)} ${Math.abs(days) === 1 ? 'Tag' : 'Tagen'} fällig`
  if (days === 0) return 'heute fällig'
  if (days === 1) return 'morgen fällig'
  return `in ${days} Tagen`
}

// One task per recommendation of the newest report per aquarium, dated from that report.
export function buildRecommendationItems(analyses = [], options = {}) {
  const scales = options.scales || loadEvaluationScales()
  const templates = options.templates || templateMap()
  const activeScaleId = options.activeScaleId || loadActiveScaleId()
  const dosingKeysFor = options.dosingKeysFor || (() => [])

  return analyses.flatMap((analysis) => {
    const scale = findScale(scales, analysis.aquariumProfile?.evaluationScaleId || activeScaleId)
    const evaluated = evaluateAnalysis(analysis.parameters || [], scale)
    const source = reportDate(analysis)
    return buildDirectRecommendations(evaluated, { dosingKeys: dosingKeysFor(analysis), templates }).map((recommendation) => {
      const dueDate = new Date(source)
      dueDate.setDate(dueDate.getDate() + recommendation.recheckDays)
      return {
        id: `${analysis.id}:${recommendation.key}`,
        key: recommendation.key,
        analysisId: analysis.id,
        aquariumId: analysis.aquariumId || analysis.profile_id || '',
        aquariumName: analysis.aquariumName || 'Aquarium',
        reportNumber: analysis.reportNumber || analysis.barcode || analysis.id,
        reportDate: source,
        dueDate,
        icon: recommendation.icon,
        title: recommendation.title,
        summary: recommendation.summary,
        summaryParts: recommendation.summaryParts,
        options: recommendation.options,
        detailLabel: recommendation.detailLabel,
        detailItems: recommendation.detailItems,
        tips: recommendation.tips,
        priority: recommendation.priority,
        tone: recommendation.tone,
        elements: recommendation.elements,
        elementKeys: recommendation.elementKeys,
      }
    })
  }).sort((left, right) => left.dueDate - right.dueDate
    || (left.tone === right.tone ? 0 : left.tone === 'critical' ? -1 : 1)
    || left.title.localeCompare(right.title, 'de'))
}

export function recommendationProgressKey(item) {
  return item.key
}
