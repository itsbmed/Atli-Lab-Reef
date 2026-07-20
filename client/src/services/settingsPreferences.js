const STORAGE_PREFIX = 'ati_settings'

export const DEFAULT_SETTINGS_PREFERENCES = Object.freeze({
  units: 'metric',
  push_notifications: false,
  assistant_intent: 'action',
  assistant_audience: 'reefkeeper',
  explanation_depth: 'balanced',
  correction_style: 'careful',
})

function accountKey(accountId) {
  return `${STORAGE_PREFIX}:${accountId || 'guest'}`
}

export function loadSettingsPreferences(accountId) {
  try {
    const stored = JSON.parse(localStorage.getItem(accountKey(accountId)) || '{}')
    return { ...DEFAULT_SETTINGS_PREFERENCES, ...stored }
  } catch {
    return { ...DEFAULT_SETTINGS_PREFERENCES }
  }
}

export function saveSettingsPreferences(accountId, preferences) {
  localStorage.setItem(accountKey(accountId), JSON.stringify(preferences))
}
