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

// Reduction advice per band, mirroring the evaluation sheet: bulk elements are eased
// back gently, trace elements and pollutants are cut hard because they accumulate.
const REDUCTION_PERCENT = {
  quantity: { 6: 10, 7: 20, 8: 100, 9: 100 },
  basis: { 6: 10, 7: 20, 8: 100, 9: 100 },
  nutrients: { 6: 25, 7: 50, 8: 100, 9: 100 },
  trace: { 6: 50, 7: 90, 8: 100, 9: 100 },
  pollutants: { 6: 100, 7: 100, 8: 100, 9: 100 },
}

function reductionFor(parameter) {
  return REDUCTION_PERCENT[parameter.groupKey]?.[parameter.evaluation.score] ?? null
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

const RULES = [
  {
    key: 'water-change',
    icon: '≈',
    action: { tool: 'waterchange' },
    match: (parameters) => affected(parameters, (score, parameter) => score >= 8 && parameter.groupKey !== 'pollutants'),
    build: (items) => ({
      summaryParts: [
        { text: `Durch die Wasseranalyse ${plural(items, 'wurde ein stark erhöhter Wert', 'wurden stark erhöhte Werte')} bei ` },
        ...boldList(items),
        { text: ` festgestellt. Um diese Werte zügig wieder in den optimalen Bereich zu senken, empfehlen wir die Durchführung von Wasserwechseln.` },
      ],
    }),
  },
  {
    key: 'reduce-supply',
    icon: '▼',
    action: { tool: 'consumption' },
    match: (parameters) => affected(parameters, (score, parameter) => score >= 6 && score <= 7 && parameter.groupKey !== 'pollutants'),
    build: (items) => ({
      summaryParts: [
        ...boldList(items),
        { text: ` ${plural(items, 'ist', 'sind')} erhöht.` },
      ],
      detailItems: items.map((item) => ({ label: item.label, value: `−${reductionFor(item)} %` })),
    }),
  },
  {
    key: 'nutrients',
    icon: 'N',
    action: { tool: 'trends' },
    match: (parameters) => affected(parameters, (score, parameter) => parameter.groupKey === 'nutrients' && score !== 5),
    templateKey: (items) => (items.some((item) => item.evaluation.score > 5) ? 'nutrients' : 'nutrients-low'),
    build: (items) => {
      const high = items.filter((item) => item.evaluation.score > 5)
      const scope = high.length ? high : items
      return {
        summaryParts: [
          ...boldList(scope),
          high.length
            ? { text: ` ${plural(scope, 'ist', 'sind')} erhöht. Wir empfehlen Ihnen das Nährstoffmanagement zu optimieren.` }
            : { text: ` ${plural(scope, 'ist', 'sind')} zu niedrig. Eine Limitierung bremst Wachstum und Farbentwicklung.` },
        ],
      }
    },
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

function compose(rule, items, templates) {
  const template = templates[rule.templateKey ? rule.templateKey(items) : rule.key]
  const built = rule.build(items)
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

export function buildDirectRecommendations(parameters = [], { dosingKeys = new Set(), templates = templateMap() } = {}) {
  const context = { dosingKeys: dosingKeys instanceof Set ? dosingKeys : new Set(dosingKeys) }
  const advisory = RULES
    .map((rule) => {
      const items = rule.match(parameters, context)
      return items.length ? compose(rule, items, templates) : null
    })
    .filter(Boolean)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, MAX_ADVISORY)

  const dosingItems = DOSING_RULE.match(parameters, context)
  return dosingItems.length ? [...advisory, compose(DOSING_RULE, dosingItems, templates)] : advisory
}
