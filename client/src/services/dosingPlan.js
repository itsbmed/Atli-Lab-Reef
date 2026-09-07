const NON_DOSING_GROUPS = new Set(['pollutants'])
const SPECIAL_CORRECTIONS = Object.freeze({
  salinity: {
    action: 'Salinität korrigieren',
    note: 'Mit passend angesetztem Meerwasser schrittweise anheben. Nicht als Einzelelement dosieren.',
  },
  nitrate: {
    action: 'Nährstoffversorgung anpassen',
    note: 'Nährstoffexport und Fütterung zuerst prüfen. Nur ein geeignetes Nitratprodukt kontrolliert einsetzen.',
  },
  phosphate: {
    action: 'Nährstoffversorgung anpassen',
    note: 'Adsorber und Nährstoffexport zuerst prüfen. Phosphat nur sehr langsam und messbegleitet ergänzen.',
  },
  phosphorus: {
    action: 'Phosphatversorgung prüfen',
    note: 'Phosphor und Phosphat gemeinsam bewerten; keine parallele Korrektur beider Werte beginnen.',
  },
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

export function isLowParameter(parameter) {
  const { min } = numericRange(parameter)
  return parameter.resultStatus !== 'invalid'
    && !NON_DOSING_GROUPS.has(parameter.groupKey)
    && Number(parameter.value) < min
}

export function buildDosingPlan(parameters = [], volumeLiters = 0) {
  const volume = Math.max(0, Number(volumeLiters) || 0)
  return parameters.filter(isLowParameter).map((parameter) => {
    const range = numericRange(parameter)
    const precision = Math.max(0, Number(parameter.precision ?? 2))
    const targetValue = round((range.min + range.max) / 2, precision)
    const deficit = round(Math.max(0, targetValue - Number(parameter.value)), Math.max(precision, 2))
    const unitFactor = parameter.unit === 'µg/l' ? 0.001 : parameter.unit === 'mg/l' ? 1 : null
    const requiredMassMg = unitFactor === null || volume <= 0 ? null : round(deficit * volume * unitFactor, 2)
    const special = SPECIAL_CORRECTIONS[parameter.key]

    return {
      ...parameter,
      targetValue,
      deficit,
      requiredMassMg,
      action: special?.action || `${parameter.label} ergänzen`,
      note: special?.note || `${parameter.label} mit einem geeigneten Einzel- oder Versorgungselement kontrolliert ergänzen.`,
      stageShares: [50, 30, 20],
    }
  })
}

export function formatMass(milligrams) {
  if (milligrams === null) return '—'
  if (milligrams >= 1000) return `${round(milligrams / 1000, 2).toLocaleString('de-DE')} g`
  if (milligrams < 1) return `${round(milligrams * 1000, 1).toLocaleString('de-DE')} µg`
  return `${round(milligrams, 2).toLocaleString('de-DE')} mg`
}
