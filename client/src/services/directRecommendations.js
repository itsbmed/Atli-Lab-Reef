import { SCORE_BAND_MAP, evaluateParameter } from './evaluationScales.js'
import { templateMap } from './recommendationTemplates.js'
import { absoluteOceanSet, DAILY_SUPPLY_KEYS } from './atiProductCatalog.js'

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

// Tägliche Elementversorgung nach Auswertung V2.2: Welche Kanäle sich anpassen lassen,
// hängt vom Versorgungssystem ab (Teile 0–3). Jeder Kanal folgt einem Leitwert und wird
// pauschal um 10–20 % angepasst; die Spurenelemente (Spuren/DT) folgen dem Zink.
const SUPPLY_STEP = '10–20 %'
const SUPPLY_CHANNELS = Object.freeze({
  1: [{ label: 'All-in-one', key: 'kh' }],
  2: [{ label: 'KH', key: 'kh' }, { label: 'Ca/Mg', key: 'calcium' }],
  3: [{ label: 'KH', key: 'kh' }, { label: 'Ca', key: 'calcium' }, { label: 'Mg', key: 'magnesium' }],
})
// Ohne Angabe zum System: jedes täglich dosierte Element einzeln, wie bei drei Teilen.
const UNKNOWN_SYSTEM_CHANNELS = Object.freeze([{ key: 'kh' }, { key: 'calcium' }, { key: 'magnesium' }])

function supplyChange(score) {
  if (!Number.isFinite(score) || score === 5) return 'unverändert'
  // V2.2 gibt für drei Teile bei niedrigem Calcium „- 10-20 %“ aus – in beiden Zweigen
  // dasselbe Vorzeichen, ein Tippfehler: zu wenig Calcium heißt mehr Calcium.
  return `${score < 5 ? '+' : '−'}${SUPPLY_STEP}`
}

// Zink steuert die Spurenelemente: zu wenig +25 %, leicht erhöht −50 %, deutlich erhöht −100 %.
function traceChange(score) {
  if (!Number.isFinite(score) || score === 5) return null
  if (score < 5) return '+25 %'
  return score > 6 ? '−100 %' : '−50 %'
}

function scoreOf(parameters, key) {
  return parameters.find((parameter) => parameter.key === key)?.evaluation?.score
}

// Magnesium hat nur bei drei Teilen einen eigenen Kanal. Bei zwei Teilen zählt es nur,
// wenn es erhöht ist (Salztipp), bei All-in-one gar nicht.
function magnesiumCounts(score, parts) {
  if (parts === 1) return false
  if (parts === 2) return score > 5
  return true
}

function supplyPlan(parameters, parts) {
  const known = [0, 1, 2, 3].includes(parts)
  const channels = (known ? SUPPLY_CHANNELS[parts] || [] : UNKNOWN_SYSTEM_CHANNELS)
    .filter((channel) => Number.isFinite(scoreOf(parameters, channel.key)))
    .map((channel) => ({
      label: channel.label || parameters.find((parameter) => parameter.key === channel.key).label,
      value: supplyChange(scoreOf(parameters, channel.key)),
    }))
  const trace = traceChange(scoreOf(parameters, 'zinc'))
  if (trace) channels.push({ label: 'Spuren/DT', value: trace })
  return channels
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

// Wortlaut der Auswertung V2.2: Absolute Ocean 1 und 2 oder alternativ Nyos pure Salz.
function lowSalinityText(target, current, volumeLiters) {
  const volume = Number(volumeLiters)
  const goal = Number.isFinite(target) ? ` auf ${numberLabel(target)} PSU` : ''
  if (!(volume > 0) || !Number.isFinite(target)) return `Ergänzen Sie Absolute Ocean 1 und 2 jeweils in der berechneten Menge oder ergänzen Sie Nyos pure Salz, um die Salinität${goal} anzuheben.`
  return `Ergänzen Sie Absolute Ocean 1 und 2 jeweils in der berechneten Menge oder ergänzen Sie ${numberLabel(nyosGrams(target, current, volume), 0)} g Nyos pure Salz, um die Salinität${goal} anzuheben.`
}

function salinityCorrection(parameter, volumeLiters) {
  const current = Number(parameter.value)
  const target = targetValue(parameter)
  const volume = Number(volumeLiters)
  const low = parameter.evaluation.score < 5
  if (!Number.isFinite(current) || !Number.isFinite(target)) return []
  if (!(volume > 0)) {
    if (!low) return [{ label: 'Meerwasser gegen Osmosewasser tauschen', value: 'Menge nach Beckenvolumen' }]
    const set = absoluteOceanSet(0)
    return [
      { label: 'Absolute Ocean 1 und 2', value: 'je 1,71 ml pro PSU und Liter', url: set.url, product: set.name },
      { label: 'oder Nyos pure Salz', value: '1,06 g pro PSU und Liter' },
    ]
  }
  if (low) {
    const millilitersEach = Math.max(0, (target - current) * 1.71 * volume)
    const amount = `${numberLabel(millilitersEach, 0)} ml`
    // Beide Flaschen werden gleich dosiert, also entscheidet die Menge je Flasche
    // darüber, welche Packung im Shop reicht. url und product werden nicht in der
    // Korrekturliste angezeigt, sondern speisen die Produktkarte der Empfehlung.
    const set = absoluteOceanSet(millilitersEach)
    // Je Flasche eine Zeile. Angezeigt wird das als Produktkarte, nicht als
    // zweiter Kasten – deshalb trägt jeder Eintrag Menge, Packung und Link.
    return [
      { label: 'Absolute Ocean 1', value: amount, url: set.url, product: set.name, image: set.image },
      { label: 'Absolute Ocean 2', value: amount, url: set.url, product: set.name, image: set.image },
      // V2.2: alternativ Nyos pure Salz, (Ziel − Messwert) × 1,06 × Volumen in Gramm.
      { label: 'oder Nyos pure Salz', value: `${numberLabel(nyosGrams(target, current, volume), 0)} g` },
    ]
  }
  const liters = Math.max(0, volume - (target / current * volume))
  return [{ label: 'Meerwasser entnehmen und durch Osmosewasser ersetzen', value: `${numberLabel(liters)} l` }]
}

function nyosGrams(target, current, volume) {
  return Math.max(0, (target - current) * 1.06 * volume)
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
    // V2.2: nur Calcium, Magnesium und Zink, und erst ab „zu hoch“ (Score 8 und 9).
    match: (parameters) => affected(parameters, (score, parameter) => score > 7 && ['calcium', 'magnesium', 'zinc'].includes(parameter.key)),
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
          { text: ` liegt bei ${numberLabel(item.value)} ${item.unit || 'PSU'} und damit ${low ? 'unter' : 'über'} dem Zielwert${Number.isFinite(target) ? ` von ${numberLabel(target)} PSU` : ''}. ${low ? lowSalinityText(target, Number(item.value), context.volumeLiters) : 'Entnehmen Sie die berechnete Menge Meerwasser und ersetzen Sie diese durch Osmosewasser.'}` },
        ],
        detailItems: salinityCorrection(item, context.volumeLiters),
      }
    },
  },
  {
    key: 'reduce-supply',
    icon: '▼',
    action: { tool: 'consumption' },
    // Anpassen lässt sich, was täglich dosiert wird (KH, Calcium, Magnesium), dazu die
    // Spurenelemente über Zink. Weicht davon nichts ab, entfällt die Karte.
    match: (parameters, context) => affected(parameters, (score, parameter) => score !== 5
      && (DAILY_SUPPLY_KEYS.includes(parameter.key) || parameter.key === 'zinc')
      && (parameter.key !== 'magnesium' || magnesiumCounts(score, context.supplyParts))),
    build: (items, context) => {
      const parts = context.supplyParts
      const parameters = context.parameters || []
      const tips = []
      // Zwei Teile: Magnesium hat keinen eigenen Kanal; ist es erhöht, hilft nur das richtige Salz.
      if (parts === 2 && scoreOf(parameters, 'magnesium') > 5) tips.push('Nutzen Sie ausschließlich Meersalze mit naturnahen Werten für Wasserwechsel.')
      if (parts === null || parts === undefined) tips.push('Hinterlegen Sie im Aquarium Ihr Versorgungssystem – dann passen wir die Empfehlung an seine Teile an.')
      return {
        summaryParts: [
          ...boldList(items),
          { text: parts === 0
            ? ` ${plural(items, 'weicht', 'weichen')} vom Zielbereich ab. Wir empfehlen Ihnen ein Versorgungssystem wie z. B. Essentials SPS zu nutzen.`
            : ` ${plural(items, 'weicht', 'weichen')} vom Zielbereich ab. Passen Sie die tägliche Elementversorgung abhängig vom Messwert an.` },
        ],
        // Alle Kanäle stehen da, auch die, die passen – sonst bleibt offen, ob sie geprüft wurden.
        detailItems: supplyPlan(parameters, parts),
        tips,
      }
    },
  },
  {
    key: 'nutrients',
    icon: 'N',
    action: { tool: 'trends' },
    match: nutrientPair,
    templateKey: nutrientTemplateKey,
    build: (items, context) => ({
      // Wortlaut der Auswertung V2.2 (Nährstoffmanagement, Q27–Q29).
      summaryParts: [
        { text: 'Wir empfehlen Ihnen das Nährstoffmanagement zu optimieren, da ' },
        { text: items[0].label, bold: true },
        { text: ` ${nutrientDirection(items[0]) === 'low' ? 'reduziert' : 'erhöht'} ist und ` },
        { text: items[1].label, bold: true },
        { text: ` ${nutrientDirection(items[1]) === 'low' ? 'reduziert' : 'erhöht'} ist.` },
      ],
      detailItems: nutrientMeasures(items, context.volumeLiters),
    }),
  },
  {
    key: 'pollutants',
    icon: '!',
    action: { tab: 'values' },
    detailAction: { label: 'Mögliche Quellen prüfen', tool: 'sources' },
    // Zink zählt zu den Spurenelementen, kann laut V2.2 aber aus einer Schadstoffquelle stammen (ab Score 6).
    match: (parameters) => affected(parameters, (score, parameter) => score >= 6 && (parameter.groupKey === 'pollutants' || parameter.key === 'zinc')),
    build: (items) => ({
      summaryParts: [
        ...boldList(items),
        { text: ` ${plural(items, 'stammt', 'stammen')} vermutlich aus einer Eintragsquelle im System. Gesucht wird die Quelle, nicht eine Behandlung des Wertes.` },
      ],
    }),
  },
]

// Osmosewasser nach Auswertung V2.2: Silizium über 25, Zink oder Phosphor über 0 in der
// Osmoseprobe. Was zu tun ist, hängt davon ab, ob Osmoseanlage (RO) und Harzfilter (MBF)
// vorhanden sind. Die Sätze sind der Wortlaut der Arbeitsmappe.
const OSMOSIS_LIMITS = Object.freeze([
  { keys: ['silicon'], label: 'Silizium', limit: 25 },
  { keys: ['zinc'], label: 'Zink', limit: 0 },
  { keys: ['phosphorus', 'phosphate'], label: 'Phosphor', limit: 0 },
])

function osmosisFindings(osmosis) {
  const rows = osmosis?.parameters || []
  return OSMOSIS_LIMITS.map((entry) => {
    const row = entry.keys.map((key) => rows.find((parameter) => parameter.key === key)).find(Boolean)
    const value = row && row.resultStatus !== 'below_detection' ? Number(row.value) : null
    // Ohne Laborbewertung zählt ein Fund wie „erhöht“ (Score 7) – für die Reihenfolge der Karten.
    return Number.isFinite(value) && value > entry.limit ? { key: row.key, label: entry.label, value, evaluation: { score: 7 } } : null
  }).filter(Boolean)
}

function osmosisMeasures(items, osmosis) {
  const found = new Set(items.map((item) => item.label))
  const measures = []
  if (found.has('Silizium')) {
    const text = osmosis.ro && osmosis.resin
      ? 'Wechseln Sie das Harz im Reinstfilter aus.'
      : osmosis.ro ? 'Nutzen Sie einen Harzfilter hinter der Osmoseanlage.' : 'Nutzen Sie eine Osmoseanlage und einen Harzfilter.'
    measures.push({ label: text, value: '' })
  }
  if (found.has('Phosphor')) measures.push({ label: 'PO4 kann im RO Wasser vorkommen, wenn der Harzfilter entweder zu klein oder erschöpft ist, oder etwas im Vorratstank PO4 freisetzt.', value: '' })
  if (found.has('Zink')) measures.push({ label: 'Zink kann im RO Wasser vorkommen, wenn der Harzfilter entweder zu klein oder erschöpft ist, oder etwas im Vorratstank Zink freisetzt.', value: '' })
  return measures
}

const OSMOSIS_RULE = {
  key: 'osmosis',
  icon: 'RO',
  action: { tab: 'osmosis' },
  match: (parameters, context) => osmosisFindings(context.osmosis),
  build: (items, context) => ({
    summaryParts: [
      { text: 'Durch die Wasseranalyse wurde herausgefunden, dass sich ' },
      ...boldList(items),
      { text: ` in der Osmoseprobe ${plural(items, 'befindet', 'befinden')}.` },
    ],
    detailItems: osmosisMeasures(items, context.osmosis),
  }),
}

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
// Die Auswertung V2.2 zeigt alle Blöcke gleichzeitig: Wasserwechsel, Versorgung, Nährstoffe,
// Schadstoffquellen, Salinität und Osmosewasser.
const MAX_ADVISORY = 6

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

export function buildDirectRecommendations(parameters = [], { dosingKeys = new Set(), templates = templateMap(), volumeLiters = 0, supplyParts = null, osmosis = null } = {}) {
  const context = {
    dosingKeys: dosingKeys instanceof Set ? dosingKeys : new Set(dosingKeys),
    volumeLiters: Math.max(0, Number(volumeLiters) || 0),
    parameters,
    supplyParts: [0, 1, 2, 3].includes(supplyParts) ? supplyParts : null,
    osmosis: { parameters: osmosis?.parameters || [], ro: Boolean(osmosis?.ro), resin: Boolean(osmosis?.resin) },
  }
  const advisory = [...RULES, OSMOSIS_RULE]
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
