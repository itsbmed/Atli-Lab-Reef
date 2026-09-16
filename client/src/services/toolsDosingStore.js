const STORAGE_KEY = 'reef-pilot:tools-dosing-progress:v1'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function storageId(ownerId, aquariumId, week) {
  return [ownerId || 'guest', aquariumId || 'none', week].join(':')
}

export function loadDosingProgress(ownerId, aquariumId, week) {
  return readAll()[storageId(ownerId, aquariumId, week)] || {}
}

export function saveDosingProgress(ownerId, aquariumId, week, progress) {
  const stored = readAll()
  stored[storageId(ownerId, aquariumId, week)] = progress
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}
