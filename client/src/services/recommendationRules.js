const STORAGE_KEY = 'ati_recommendation_rules:v1'

export const RECOMMENDATION_SCOPES = Object.freeze([
  { key: 'basis', label: 'Basiswerte' },
  { key: 'quantity', label: 'Mengenelemente' },
  { key: 'nutrients', label: 'Nährstoffe' },
  { key: 'trace', label: 'Spurenelemente' },
  { key: 'pollutants', label: 'Unerwünschte Elemente' },
])

export const DEFAULT_RECOMMENDATION_RULES = Object.freeze([
  {
    id: 'invalid-result', name: 'Ungültige Laborwerte', active: true, conditionType: 'invalid', groupKey: 'basis', waterType: 'all', minimumMatches: 1, tones: ['watch', 'critical'], priority: 'Hoch', recheckDays: 3,
    title: 'Messung vor einer Korrektur verifizieren',
    summary: 'Mindestens ein Laborwert ist nicht zuverlässig auswertbar. Keine Dosierentscheidung auf diesen Wert stützen.',
    why: 'Ungültige, fehlgeschlagene oder mathematisch fehlerhafte Ergebnisse besitzen keine belastbare Konzentrationsaussage.',
    steps: ['Betroffene Probe und Laborstatus kontrollieren.', 'Messung wiederholen oder durch das Labor verifizieren lassen.', 'Erst mit einem gültigen Ergebnis weitere Maßnahmen planen.'],
  },
  {
    id: 'basis-stability', name: 'Basiswerte stabilisieren', active: true, conditionType: 'group_status', groupKey: 'basis', waterType: 'Meerwasser', minimumMatches: 1, tones: ['watch', 'critical'], priority: 'Hoch', recheckDays: 7,
    title: 'Basiswerte kontrolliert stabilisieren',
    summary: 'Dichte, KH und weitere Basiswerte gemeinsam prüfen, bevor einzelne Spurenelemente korrigiert werden.',
    why: 'Abweichende Basiswerte beeinflussen die Interpretation und Dosierung vieler weiterer Elemente.',
    steps: ['Messgeräte und Kalibrierung kontrollieren.', 'Versorgung und Nachfüllwasser prüfen.', 'Werte schrittweise korrigieren und nach sieben Tagen erneut messen.'],
  },
  {
    id: 'macro-balance', name: 'Mengenelement-Balance', active: true, conditionType: 'group_status', groupKey: 'quantity', waterType: 'Meerwasser', minimumMatches: 2, tones: ['watch', 'critical'], priority: 'Mittel', recheckDays: 14,
    title: 'Mengenelemente gemeinsam ausbalancieren',
    summary: 'Mehrere Mengenelemente weichen ab. Versorgungssystem, Salinität und Dosiermengen als gemeinsame Ursache prüfen.',
    why: 'Calcium, Magnesium, Kalium und weitere Mengenelemente stehen über Salinität und Versorgung miteinander in Verbindung.',
    steps: ['Salinität als Bezugswert bestätigen.', 'Dosierbehälter, Pumpen und Tagesmengen kontrollieren.', 'Nur eine Anpassung gleichzeitig vornehmen und nach 14 Tagen kontrollieren.'],
  },
  {
    id: 'nutrient-balance', name: 'Nährstoffbalance', active: true, conditionType: 'group_status', groupKey: 'nutrients', waterType: 'all', minimumMatches: 1, tones: ['watch', 'critical'], priority: 'Hoch', recheckDays: 7,
    title: 'Nährstoffbalance wiederherstellen',
    summary: 'NO₃, PO₄, Phosphor und Silizium gemeinsam mit Fütterung und Nährstoffexport bewerten.',
    why: 'Eine isolierte Korrektur kann das Verhältnis der Nährstoffe verschlechtern und neue Limitierungen auslösen.',
    steps: ['Fütterung, Adsorber und Filterleistung dokumentieren.', 'Keine schnelle Absenkung oder starke Einzeldosierung durchführen.', 'Nährstoffe nach sieben Tagen gemeinsam kontrollieren.'],
  },
  {
    id: 'trace-supply', name: 'Spurenelement-Versorgung', active: true, conditionType: 'group_status', groupKey: 'trace', waterType: 'Meerwasser', minimumMatches: 2, tones: ['watch', 'critical'], priority: 'Mittel', recheckDays: 14,
    title: 'Spurenelementversorgung überprüfen',
    summary: 'Mehrere Spurenelemente zeigen Abweichungen. Versorgung, Verbrauch und mögliche Überdosierung als System bewerten.',
    why: 'Spurenelemente werden gemeinsam dosiert oder verbraucht; einzelne Korrekturen können andere Werte unbeabsichtigt verändern.',
    steps: ['Spurenmischungen und Einzeldosierungen erfassen.', 'Dosiermengen mit dem realen Wasservolumen abgleichen.', 'Änderungen klein halten und nach 14 Tagen nachmessen.'],
  },
  {
    id: 'contamination-source', name: 'Mögliche Kontaminationsquelle', active: true, conditionType: 'group_status', groupKey: 'pollutants', waterType: 'all', minimumMatches: 1, tones: ['watch', 'critical'], priority: 'Hoch', recheckDays: 7,
    title: 'Mögliche Eintragsquelle untersuchen',
    summary: 'Mindestens ein unerwünschtes Element ist auffällig. Technik, Magnete, Klemmen, Werkzeuge und Ausgangswasser prüfen.',
    why: 'Erhöhte Metalle und Begleitelemente entstehen häufig durch Korrosion, kontaminierte Zusätze oder ungeeignete Materialien.',
    steps: ['Pumpen, Magnete und metallische Bauteile visuell kontrollieren.', 'Osmosewasser, Salz und verwendete Zusätze als Quelle prüfen.', 'Verdächtige Quelle entfernen und nach sieben Tagen kontrollieren.'],
  },
])

function cloneRules(rules = DEFAULT_RECOMMENDATION_RULES) {
  return rules.map((rule) => ({ ...rule, tones: [...rule.tones], directions: [...(rule.directions || ['low', 'high'])], steps: [...rule.steps] }))
}

function normalizeRule(rule, index) {
  return {
    id: String(rule?.id || `rule-${Date.now()}-${index}`),
    name: String(rule?.name || 'Neue Regel').trim(),
    active: rule?.active !== false,
    conditionType: rule?.conditionType === 'invalid' ? 'invalid' : 'group_status',
    groupKey: RECOMMENDATION_SCOPES.some((scope) => scope.key === rule?.groupKey) ? rule.groupKey : 'basis',
    waterType: String(rule?.waterType || 'all'),
    minimumMatches: Math.max(1, Number(rule?.minimumMatches) || 1),
    tones: Array.isArray(rule?.tones) && rule.tones.length ? rule.tones.filter((tone) => ['watch', 'critical'].includes(tone)) : ['watch', 'critical'],
    directions: Array.isArray(rule?.directions) && rule.directions.length ? rule.directions.filter((direction) => ['low', 'high'].includes(direction)) : ['low', 'high'],
    priority: rule?.priority === 'Mittel' ? 'Mittel' : 'Hoch',
    recheckDays: Math.max(1, Number(rule?.recheckDays) || 7),
    title: String(rule?.title || '').trim(),
    summary: String(rule?.summary || '').trim(),
    why: String(rule?.why || '').trim(),
    steps: Array.isArray(rule?.steps) ? rule.steps.map((step) => String(step).trim()).filter(Boolean) : String(rule?.steps || '').split('\n').map((step) => step.trim()).filter(Boolean),
  }
}

export function loadRecommendationRules() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return Array.isArray(stored) ? stored.map(normalizeRule) : cloneRules()
  } catch {
    return cloneRules()
  }
}

export function saveRecommendationRules(rules) {
  const safeRules = (rules || []).map(normalizeRule).filter((rule) => rule.title && rule.summary && rule.steps.length)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeRules))
  return cloneRules(safeRules)
}

export function createRecommendationRule() {
  return normalizeRule({ id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: 'Neue Regel', active: true, groupKey: 'nutrients', waterType: 'Meerwasser', title: 'Neue Empfehlung', summary: '', why: '', steps: [] }, 0)
}

function matchesRule(rule, analysis) {
  if (!rule.active || (rule.waterType !== 'all' && rule.waterType !== analysis.waterType)) return []
  const parameters = analysis.parameters || []
  if (rule.conditionType === 'invalid') {
    return parameters.filter((parameter) => ['invalid', 'failed', 'math_error'].includes(parameter.resultStatus))
  }
  return parameters.filter((parameter) => parameter.groupKey === rule.groupKey
    && rule.tones.includes(parameter.tone)
    && rule.directions.includes(parameterDirection(parameter)))
}

function parameterDirection(parameter) {
  const value = Number(parameter.value)
  const minimum = Number(parameter.referenceRange?.min)
  const maximum = Number(parameter.referenceRange?.max)
  if (Number.isFinite(value) && Number.isFinite(minimum) && value < minimum) return 'low'
  if (Number.isFinite(value) && Number.isFinite(maximum) && value > maximum) return 'high'
  const targetValues = String(parameter.target || '').match(/-?\d+(?:[.,]\d+)?/g)?.map((item) => Number(item.replace(',', '.'))) || []
  if (Number.isFinite(value) && targetValues.length >= 2 && value < targetValues[0]) return 'low'
  if (Number.isFinite(value) && targetValues.length >= 2 && value > targetValues[1]) return 'high'
  return 'high'
}

export function evaluateRecommendationRules(analysis, rules = loadRecommendationRules()) {
  return rules
    .map(normalizeRule)
    .map((rule) => ({ rule, matched: matchesRule(rule, analysis) }))
    .filter(({ rule, matched }) => matched.length >= rule.minimumMatches)
    .map(({ rule, matched }) => ({
      key: `rule-${rule.id}`,
      ruleId: rule.id,
      ruleName: rule.name,
      groupKey: rule.groupKey,
      title: rule.title,
      summary: rule.summary,
      priority: rule.priority,
      days: rule.recheckDays,
      recheckDays: rule.recheckDays,
      recheck: `Kontrolle in ${rule.recheckDays} Tagen`,
      parameterKeys: matched.map((parameter) => parameter.key),
      parameters: matched.map((parameter) => parameter.label),
      matchedCount: matched.length,
      whys: [rule.why],
      steps: [...rule.steps],
      tone: matched.some((parameter) => parameter.tone === 'critical') || rule.conditionType === 'invalid' ? 'critical' : 'watch',
    }))
    .sort((a, b) => (a.priority === 'Hoch' ? 0 : 1) - (b.priority === 'Hoch' ? 0 : 1) || a.title.localeCompare(b.title, 'de'))
}
