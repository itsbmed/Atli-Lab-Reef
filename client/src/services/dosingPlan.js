import { loadDosingConfig } from '@/services/dosingConfig'

const EXCLUDED_GROUPS = new Set(['pollutants'])

const CORRECTION_PROFILES = Object.freeze({
  salinity: {
    mode: 'water', modeLabel: 'Wasserchemie', order: 0, recheckDays: 2,
    title: 'Salinität zuerst stabilisieren',
    summary: 'Die Salinität beeinflusst die Einordnung vieler weiterer Konzentrationen und wird deshalb vor Einzelelementen korrigiert.',
    steps: ['Messgerät und Kalibrierung kontrollieren.', 'Mit passend angesetztem Meerwasser langsam anheben.', 'Salinität erneut bestätigen, bevor weitere Korrekturen starten.'],
    caution: 'Nicht durch die Zugabe eines einzelnen Elements korrigieren.',
  },
  chloride: {
    mode: 'water', modeLabel: 'Wasserwechsel', order: 1, recheckDays: 7,
    title: 'Ionengleichgewicht prüfen', summary: 'Chlorid wird als Teil des gesamten Salz- und Ionengleichgewichts bewertet.',
    steps: ['Salinität gegenprüfen.', 'Meersalzansatz und Wasserwechsel dokumentieren.', 'Mit ausgewogenem Meerwasser schrittweise korrigieren.'],
    caution: 'Keine isolierte Chloridkorrektur ohne fachliche Freigabe.',
  },
  sodium: {
    mode: 'water', modeLabel: 'Wasserwechsel', order: 1, recheckDays: 7,
    title: 'Ionengleichgewicht prüfen', summary: 'Natrium wird zusammen mit Salinität und den übrigen Mengenelementen korrigiert.',
    steps: ['Salinität und verwendetes Salz prüfen.', 'Versorgungs- und Wasserwechselmengen kontrollieren.', 'Ionengleichgewicht über geeignetes Meerwasser normalisieren.'],
    caution: 'Natrium nicht isoliert dosieren.',
  },
  sulfur: {
    mode: 'water', modeLabel: 'Wasserwechsel', order: 1, recheckDays: 7,
    title: 'Ionengleichgewicht prüfen', summary: 'Schwefelabweichungen werden im Zusammenhang mit Sulfat, Salz und Versorgung bewertet.',
    steps: ['Salinität und Salzansatz prüfen.', 'Versorgungssystem auf Abweichungen kontrollieren.', 'Ausgewogenen Wasserwechsel als Korrekturweg verwenden.'],
    caution: 'Keine isolierte Schwefeldosierung beginnen.',
  },
  nitrate: {
    mode: 'nutrient', modeLabel: 'Nährstoffmanagement', order: 3, recheckDays: 3,
    title: 'Stickstoffversorgung behutsam anheben', summary: 'Zuerst Nährstoffexport und Fütterung prüfen; eine direkte Dosierung ist erst der zweite Schritt.',
    steps: ['Adsorber, Filterung und Nährstoffexport prüfen.', 'Fütterung und Besatzversorgung bewerten.', 'Nur bei Bedarf ein freigegebenes Nitratprodukt langsam einsetzen.'],
    caution: 'Keine schnelle Nährstoffanhebung und nicht gleichzeitig Nitrat und Phosphat stark verändern.',
  },
  phosphate: {
    mode: 'nutrient', modeLabel: 'Nährstoffmanagement', order: 3, recheckDays: 3,
    title: 'Phosphatlimitierung auflösen', summary: 'Phosphatadsorber und Export werden zuerst reduziert; direkte Ergänzung erfolgt nur messbegleitet.',
    steps: ['Phosphatadsorber und Exportleistung prüfen.', 'Fütterungs- und Nährstoffsituation bewerten.', 'Falls nötig nur ein freigegebenes Phosphatprodukt sehr langsam verwenden.'],
    caution: 'Phosphat nicht sprunghaft erhöhen und Phosphor nicht parallel separat korrigieren.',
  },
  phosphorus: {
    mode: 'nutrient', modeLabel: 'Nährstoffmanagement', order: 3, recheckDays: 3,
    title: 'Phosphor und Phosphat gemeinsam bewerten', summary: 'Der Phosphorwert wird nicht unabhängig von Phosphat korrigiert.',
    steps: ['Phosphatwert als primäre Entscheidungsgrundlage prüfen.', 'Nährstoffexport und Adsorber kontrollieren.', 'Nur eine gemeinsame Phosphatstrategie anwenden.'],
    caution: 'Keine parallele Phosphor- und Phosphatdosierung.',
  },
})

const GROUP_PROFILES = Object.freeze({
  basis: { mode: 'supply', modeLabel: 'Versorgungssystem', order: 1, recheckDays: 3 },
  quantity: { mode: 'product', modeLabel: 'Elementkorrektur', order: 2, recheckDays: 7 },
  nutrients: { mode: 'nutrient', modeLabel: 'Nährstoffmanagement', order: 3, recheckDays: 3 },
  trace: { mode: 'product', modeLabel: 'Spurenelement', order: 4, recheckDays: 10 },
})

function round(value, precision = 2) {
  return Number(Number(value).toFixed(precision))
}

function numericRange(parameter) {
  const reference = parameter.referenceRange || {}
  if (Number.isFinite(Number(reference.min)) && Number.isFinite(Number(reference.max))) {
    return { min: Number(reference.min), max: Number(reference.max) }
  }
  const values = String(parameter.target || '').match(/-?\d+(?:[.,]\d+)?/g)?.map((value) => Number(value.replace(',', '.'))) || []
  return { min: values[0] || 0, max: values[1] || values[0] || 0 }
}

function fallbackProfile(parameter) {
  const base = GROUP_PROFILES[parameter.groupKey] || GROUP_PROFILES.trace
  return {
    ...base,
    title: `${parameter.label} kontrolliert anheben`,
    summary: `${parameter.label} liegt unter dem Zielbereich. Versorgung und Verbrauch werden geprüft, bevor eine Ergänzung beginnt.`,
    steps: [`Aktuelle ${parameter.label}-Zufuhr und Dosieranlage prüfen.`, 'Nur ein freigegebenes Einzel- oder Versorgungselement verwenden.', `${parameter.label} nach der Korrektur erneut messen.`],
    caution: 'Nicht mehrere unbekannte Einzelelemente gleichzeitig korrigieren.',
  }
}

function verifiedDose(parameter, deficit, volume, dosingConfig) {
  const centralDosing = dosingConfig[parameter.key]
  const dosing = centralDosing?.enabled ? centralDosing : parameter.dosingRecommendation || parameter.dosing
  if (!dosing?.verified || !dosing.productName || !(Number(dosing.raisesBy) > 0) || !(Number(dosing.mlPer100Liters) > 0) || !(volume > 0)) return null
  const totalMl = round((deficit / Number(dosing.raisesBy)) * Number(dosing.mlPer100Liters) * volume / 100, 2)
  const maxIncrease = Number(dosing.maxDailyIncrease)
  const days = maxIncrease > 0 ? Math.max(1, Math.ceil(deficit / maxIncrease)) : 1
  return {
    productName: String(dosing.productName),
    totalMl,
    days,
    dailyMl: round(totalMl / days, 2),
    instructions: String(dosing.instructions || ''),
  }
}

export function isLowParameter(parameter) {
  const { min } = numericRange(parameter)
  return parameter.resultStatus !== 'invalid' && !EXCLUDED_GROUPS.has(parameter.groupKey) && Number(parameter.value) < min
}

export function buildDosingPlan(parameters = [], volumeLiters = 0) {
  const volume = Math.max(0, Number(volumeLiters) || 0)
  const dosingConfig = loadDosingConfig()
  return parameters.filter(isLowParameter).map((parameter) => {
    const range = numericRange(parameter)
    const precision = Math.max(0, Number(parameter.precision ?? 2))
    const targetValue = round(range.min, precision)
    const deficit = round(Math.max(0, targetValue - Number(parameter.value)), Math.max(precision, 2))
    const unitFactor = parameter.unit === 'µg/l' ? 0.001 : parameter.unit === 'mg/l' ? 1 : null
    const requiredMassMg = unitFactor === null || volume <= 0 ? null : round(deficit * volume * unitFactor, 2)
    const profile = CORRECTION_PROFILES[parameter.key] || fallbackProfile(parameter)
    return {
      ...parameter,
      ...profile,
      targetValue,
      targetRange: range,
      deficit,
      requiredMassMg,
      dose: verifiedDose(parameter, deficit, volume, dosingConfig),
      priority: parameter.tone === 'critical' ? 'Hoch' : 'Mittel',
      sequence: profile.order * 10 + (parameter.tone === 'critical' ? 0 : 1),
    }
  }).sort((a, b) => a.sequence - b.sequence || a.label.localeCompare(b.label, 'de'))
}

export function formatMass(milligrams) {
  if (milligrams === null) return 'Nicht berechenbar'
  if (milligrams >= 1000) return `${round(milligrams / 1000, 2).toLocaleString('de-DE')} g`
  if (milligrams < 1) return `${round(milligrams * 1000, 1).toLocaleString('de-DE')} µg`
  return `${round(milligrams, 2).toLocaleString('de-DE')} mg`
}
