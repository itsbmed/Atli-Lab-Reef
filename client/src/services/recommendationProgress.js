const STORAGE_KEY = 'reef-pilot:recommendation-progress:v1'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function recordKey(ownerId, analysisId) {
  return `${ownerId || 'guest'}:${analysisId || 'none'}`
}

export function loadRecommendationProgress(ownerId, analysisId) {
  return readAll()[recordKey(ownerId, analysisId)] || {}
}

export function saveRecommendationProgress(ownerId, analysisId, progress) {
  if (!analysisId) return
  const stored = readAll()
  stored[recordKey(ownerId, analysisId)] = Object.fromEntries(
    Object.entries(progress || {}).map(([key, value]) => [key, Boolean(value)]),
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}
