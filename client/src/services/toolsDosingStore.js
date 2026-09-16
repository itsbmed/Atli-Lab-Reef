const STORAGE_KEY = 'reef-pilot:tools-dosing-progress:v2'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function storageId(ownerId, aquariumId, analysisId, week) {
  return [ownerId || 'guest', aquariumId || 'none', analysisId || 'none', week].join(':')
}

export function loadDosingProgress(ownerId, aquariumId, analysisId, week) {
  return readAll()[storageId(ownerId, aquariumId, analysisId, week)] || {}
}

export function saveDosingProgress(ownerId, aquariumId, analysisId, week, progress) {
  const stored = readAll()
  stored[storageId(ownerId, aquariumId, analysisId, week)] = progress
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}
