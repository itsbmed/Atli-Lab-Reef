import { SCORE_BAND_MAP, evaluateParameter } from './evaluationScales.js'
import { templateMap } from './recommendationTemplates.js'

// An imported report keeps the originating laboratory's verdict; only unclassified
// values fall through to the selected evaluation scale.
const SOURCE_SCORES = { in_range: 5, low: { watch: 3, critical: 2 }, high: { watch: 7, critical: 8 } }

function sourceScore(parameter) {
  if (Number.isFinite(Number(parameter.sourceScore))) return Number(parameter.sourceScore)
  if (!parameter.sourceDirection) return null
  const mapped = SOURCE_SCORES[parameter.sourceDirection]
  return typeof mapped === 'number' ? mapped : mapped?.[parameter.tone === 'critical' ? 'critical' : 'watch'] ?? 5
}

export function evaluateAnalysis(parameters = [], scale = null) {
  return parameters.map((parameter) => {
    const fromSource = sourceScore(parameter)
    const evaluation = fromSource !== null
      ? { score: fromSource, thresholds: scale?.thresholds?.[parameter.key] || null, ...SCORE_BAND_MAP[fromSource] }
      : evaluateParameter(parameter, scale)
    return evaluation ? { ...parameter, evaluation, score: evaluation.score } : { ...parameter, evaluation: null, score: null }
  })
}

// The client workbook assigns the same measured-value-dependent adjustment curve in
// both directions: slight deviations change the daily dose by 10 %, moderate ones by
// 20 %, and strong deviations by 30 %.
const SUPPLY_ADJUSTMENT_PERCENT = Object.freeze({ 1: 30, 2: 30, 3: 20, 4: 10, 6: 10, 7: 20, 8: 30, 9: 30 })

function supplyAdjustment(parameter) {
  const percent = SUPPLY_ADJUSTMENT_PERCENT[parameter.evaluation.score]
  if (!percent) return null
  return { percent, direction: parameter.evaluation.score < 5 ? 'increase' : 'reduce' }
}

function affected(parameters, predicate) {
  return parameters.filter((parameter) => parameter.evaluation && predicate(parameter.evaluation.score, parameter))
}

function severity(items) {
  return Math.max(0, ...items.map((item) => Math.abs(item.evaluation.score - 5)))
}

// Element names render bold inside the sentence instead of as a separate chip row.
function boldList(items) {
  return items.flatMap((item, index) => (index ? [{ text: index === items.length - 1 ? ' und ' : ', ' }] : []).concat([{ text: item.label, bold: true }]))
}

function plural(items, singular, multiple) {
  return items.length === 1 ? singular : multiple
}

function targetValue(parameter) {
  const explicit = [parameter.sourceIdealValue, parameter.correctionTarget]
    .map(Number).find(Number.isFinite)
  if (explicit !== undefined) return explicit
  const thresholds = parameter.evaluation?.thresholds
  if (Number.isFinite(Number(thresholds?.min)) && Number.isFinite(Number(thresholds?.max))) {
    return (Number(thresholds.min) + Number(thresholds.max)) / 2
  }
  const range = parameter.referenceRange || {}
  if (Number.isFinite(Number(range.min)) && Number.isFinite(Number(range.max))) return (Number(range.min) + Number(range.max)) / 2
  return null
}

function numberLabel(value, maximumFractionDigits = 1) {
  return Number(value).toLocaleString('de-DE', { maximumFractionDigits })
}

function salinityCorrection(parameter, volumeLiters) {
  const current = Number(parameter.value)
  const target = targetValue(parameter)
  const volume = Number(volumeLiters)
  const low = parameter.evaluation.score < 5
  if (!Number.isFinite(current) || !Number.isFinite(target)) return []
  if (!(volume > 0)) return low
    ? [{ label: 'Absolute Ocean 1 und 2', value: 'je 1,71 ml pro PSU und Liter' }]
    : [{ label: 'Meerwasser gegen Osmosewasser tauschen', value: 'Menge nach Beckenvolumen' }]
  if (low) {
    const millilitersEach = Math.max(0, (target - current) * 1.71 * volume)
    const amount = `${numberLabel(millilitersEach, 0)} ml`
    return [{ label: 'Absolute Ocean 1', value: amount }, { label: 'Absolute Ocean 2', value: amount }]
  }
  const liters = Math.max(0, volume - (target / current * volume))
  return [{ label: 'Meerwasser entnehmen und durch Osmosewasser ersetzen', value: `${numberLabel(liters)} l` }]
}

function nutrientPair(parameters) {
  const nitrate = parameters.find((item) => item.key === 'nitrate')
  const phosphorus = parameters.find((item) => item.key === 'phosphorus') || parameters.find((item) => item.key === 'phosphate')
  if (![nitrate, phosphorus].every((item) => item?.evaluation && item.evaluation.score !== 5)) return []
  return [nitrate, phosphorus]
}

function nutrientDirection(parameter) {
  return parameter.evaluation.score < 5 ? 'low' : 'high'
}

function nutrientTemplateKey(items) {
  const combination = items.map(nutrientDirection).join('-')
  return {
    'high-high': 'nutrients',
    'low-low': 'nutrients-low',
    'high-low': 'nutrients-high-low',
    'low-high': 'nutrients-low-high',
  }[combination]
}

function nutrientDose(volumeLiters) {
  const volume = Number(volumeLiters)
  return volume > 0 ? `${numberLabel(0.5 * volume / 100)} ml täglich` : '0,5 ml je 100 l täglich'
}

function nutrientMeasures(items, volumeLiters) {
  const combination = items.map(nutrientDirection).join('-')
  const dose = nutrientDose(volumeLiters)
  return {
    'low-low': [{ label: 'Essential Nitro', value: dose }, { label: 'Essential Phospho', value: dose }],
    'high-low': [{ label: 'Essential Phospho', value: dose }, { label: 'Eiweißabschäumer', value: 'reinigen' }],
    'low-high': [{ label: 'PO₄-Adsorber', value: 'nutzen' }, { label: 'Essential Nitro', value: dose }],
    'high-high': [{ label: 'Futtereintrag', value: 'reduzieren' }, { label: 'Eiweißabschäumer', value: 'reinigen' }, { label: 'PO₄-Adsorber', value: 'nutzen' }],
  }[combination] || []
}

const RULES = [
  {
    key: 'water-change',
    icon: '≈',
    action: { tool: 'waterchange' },
    match: (parameters) => affected(parameters, (score, parameter) => score >= 8 && !['pollutants', 'nutrients'].includes(parameter.groupKey) && parameter.key !== 'salinity'),
    build: (items) => ({
      summaryParts: [
        { text: `Durch die Wasseranalyse ${plural(items, 'wurde ein stark erhöhter Wert', 'wurden stark erhöhte Werte')} bei ` },
        ...boldList(items),
        { text: ` festgestellt. Um diese Werte zügig wieder in den optimalen Bereich zu senken, empfehlen wir die Durchführung von Wasserwechseln.` },
      ],
    }),
  },
  {
    key: 'salinity',
    icon: '≋',
    action: {},
    match: (parameters) => affected(parameters, (score, parameter) => parameter.key === 'salinity' && score !== 5),
    templateKey: (items) => items[0].evaluation.score < 5 ? 'salinity-low' : 'salinity-high',
    build: (items, context) => {
      const item = items[0]
      const target = targetValue(item)
      const low = item.evaluation.score < 5
      return {
        summaryParts: [
          { text: 'Die ' },
          { text: item.label, bold: true },
          { text: ` liegt bei ${numberLabel(item.value)} ${item.unit || 'PSU'} und damit ${low ? 'unter' : 'über'} dem Zielwert${Number.isFinite(target) ? ` von ${numberLabel(target)} PSU` : ''}. ${low ? 'Ergänzen Sie Absolute Ocean 1 und 2 jeweils in der berechneten Menge.' : 'Entnehmen Sie die berechnete Menge Meerwasser und ersetzen Sie diese durch Osmosewasser.'}` },
        ],
        detailItems: salinityCorrection(item, context.volumeLiters),
      }
    },
  },
  {
    key: 'reduce-supply',
    icon: '▼',
    action: { tool: 'consumption' },
    match: (parameters) => affected(parameters, (score, parameter) => score !== 5 && !['pollutants', 'nutrients'].includes(parameter.groupKey) && parameter.key !== 'salinity'),
    build: (items) => ({
      summaryParts: [
        ...boldList(items),
        { text: ` ${plural(items, 'weicht', 'weichen')} vom Zielbereich ab. Passen Sie die tägliche Elementversorgung abhängig vom Messwert an.` },
      ],
      detailItems: items.map((item) => {
        const adjustment = supplyAdjustment(item)
        return { label: item.label, value: `${adjustment.direction === 'increase' ? '+' : '−'}${adjustment.percent} %` }
      }),
    }),
  },
  {
    key: 'nutrients',
    icon: 'N',
    action: { tool: 'trends' },
    match: nutrientPair,
    templateKey: nutrientTemplateKey,
    build: (items, context) => ({
      summaryParts: [
        { text: items[0].label, bold: true },
        { text: ` ist ${nutrientDirection(items[0]) === 'low' ? 'zu niedrig' : 'zu hoch'}, ` },
        { text: items[1].label, bold: true },
        { text: ` ist ${nutrientDirection(items[1]) === 'low' ? 'zu niedrig' : 'zu hoch'}. Die Maßnahmen werden als gemeinsame Nährstoffkorrektur aufeinander abgestimmt.` },
      ],
      detailItems: nutrientMeasures(items, context.volumeLiters),
    }),
  },
  {
    key: 'pollutants',
    icon: '!',
    action: { tab: 'values' },
    detailAction: { label: 'Mögliche Quellen prüfen', tool: 'sources' },
    match: (parameters) => affected(parameters, (score, parameter) => parameter.groupKey === 'pollutants' && score >= 6),
    build: (items) => ({
      summaryParts: [
        ...boldList(items),
        { text: ` ${plural(items, 'stammt', 'stammen')} vermutlich aus einer Eintragsquelle im System. Gesucht wird die Quelle, nicht eine Behandlung des Wertes.` },
      ],
    }),
  },
]

// Pinned below the advisory cards: it is the plan, not a finding.
const DOSING_RULE = {
  key: 'dosing',
  icon: 'ml',
  action: { tab: 'dosing' },
  match: (parameters, context) => affected(parameters, (score, parameter) => score <= 4 && context.dosingKeys.has(parameter.key)),
  build: (items) => ({
    summaryParts: [
      { text: 'Für ' },
      ...boldList(items),
      { text: ` ${plural(items, 'liegt', 'liegen')} eine freigegebene Produktdosierung bereit. Der Plan portioniert die Menge innerhalb des Tageslimits.` },
    ],
  }),
}

// One card per advisory type at most; the dosing course is appended below them.
const MAX_ADVISORY = 4

function compose(rule, items, templates, context) {
  const template = templates[rule.templateKey ? rule.templateKey(items, context) : rule.key]
  const built = rule.build(items, context)
  const rank = severity(items)
  const detailItems = built.detailItems || template.detailItems.map((label) => ({ label, value: '' }))
  return {
    key: rule.key,
    icon: rule.icon,
    kicker: template.kicker,
    title: template.title,
    recheckDays: template.recheckDays,
    action: { ...rule.action, label: template.actionLabel },
    detailAction: rule.detailAction || null,
    options: template.options.map((option) => ({ ...option })),
    detailLabel: template.detailLabel,
    detailItems,
    tips: [...template.tips],
    tone: rank >= 3 ? 'critical' : 'watch',
    priority: rank >= 3 ? 'Hoch' : 'Mittel',
    elements: items.map((item) => item.label),
    elementKeys: items.map((item) => item.key),
    summary: built.summaryParts.map((part) => part.text).join(''),
    rank,
    ...built,
  }
}

export function buildDirectRecommendations(parameters = [], { dosingKeys = new Set(), templates = templateMap(), volumeLiters = 0 } = {}) {
  const context = { dosingKeys: dosingKeys instanceof Set ? dosingKeys : new Set(dosingKeys), volumeLiters: Math.max(0, Number(volumeLiters) || 0) }
  const advisory = RULES
    .map((rule) => {
      const items = rule.match(parameters, context)
      return items.length ? compose(rule, items, templates, context) : null
    })
    .filter(Boolean)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, MAX_ADVISORY)

  const dosingItems = DOSING_RULE.match(parameters, context)
  return dosingItems.length ? [...advisory, compose(DOSING_RULE, dosingItems, templates, context)] : advisory
}
