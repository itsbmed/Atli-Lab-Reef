import { SCORE_BAND_MAP, evaluateParameter } from './evaluationScales.js'

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

function affected(parameters, predicate) {
  return parameters.filter((parameter) => parameter.evaluation && predicate(parameter.evaluation.score, parameter))
}

function elementView(parameter) {
  return {
    key: parameter.key,
    label: parameter.label,
    symbol: parameter.symbol,
    value: parameter.reportedValue ?? parameter.value,
    unit: parameter.unit,
    score: parameter.evaluation.score,
    band: parameter.evaluation.label,
    tone: parameter.evaluation.tone,
    percent: REDUCTION_PERCENT[parameter.groupKey]?.[parameter.evaluation.score] ?? null,
  }
}

function severity(items) {
  return Math.max(0, ...items.map((item) => Math.abs(item.evaluation.score - 5)))
}

function list(items) {
  return items.map((item) => item.label).join(', ')
}

const RULES = [
  {
    key: 'water-change',
    icon: '≈',
    kicker: 'Sofortmaßnahme',
    recheckDays: 7,
    action: { label: 'Wasserwechsel planen', tool: 'dosing' },
    match: (parameters) => affected(parameters, (score, parameter) => score >= 8 && parameter.groupKey !== 'pollutants'),
    build: (items) => ({
      title: 'Wasserwechsel durchführen',
      summary: `${list(items)} ${items.length === 1 ? 'liegt' : 'liegen'} deutlich über dem Zielbereich. Ein Wasserwechsel senkt mehrere Werte gleichzeitig, ohne das Ionengleichgewicht zu stören.`,
      steps: [
        'Wasserwechselmenge anhand des Nettovolumens festlegen.',
        'Kein Pro-Salz verwenden, da KH, Calcium und Magnesium darin bereits erhöht sind.',
        'Nach dem Wechsel 24 Stunden warten und erst dann erneut bewerten.',
      ],
    }),
  },
  {
    key: 'reduce-supply',
    icon: '▼',
    kicker: 'Versorgung anpassen',
    recheckDays: 14,
    action: { label: 'Dosierung anpassen', tool: 'dosing' },
    match: (parameters) => affected(parameters, (score, parameter) => score >= 6 && score <= 7 && parameter.groupKey !== 'pollutants'),
    build: (items) => ({
      title: 'Elementversorgung reduzieren',
      summary: `${list(items)} ${items.length === 1 ? 'ist' : 'sind'} erhöht. Die tägliche Zugabe wird reduziert, statt gegenzusteuern.`,
      steps: [
        ...items.map((item) => `${item.label}: tägliche Zugabe um ${REDUCTION_PERCENT[item.groupKey]?.[item.evaluation.score] ?? 10} % reduzieren.`),
        'Dosierpumpen und Ansatzmengen nach der Anpassung kontrollieren.',
      ],
    }),
  },
  {
    key: 'dosing',
    icon: 'ml',
    kicker: 'Korrekturkurs',
    recheckDays: 7,
    action: { label: 'Dosierungsplan öffnen', tab: 'dosing' },
    match: (parameters, context) => affected(parameters, (score, parameter) => score <= 4 && context.dosingKeys.has(parameter.key)),
    build: (items) => ({
      title: 'Fehlende Elemente auffüllen',
      summary: `Für ${list(items)} ${items.length === 1 ? 'liegt' : 'liegen'} eine freigegebene Produktdosierung bereit. Der Plan portioniert die Menge innerhalb des Tageslimits.`,
      steps: [
        'Dosierungsplan öffnen und die Tagesmengen übernehmen.',
        'Jede Tagesdosis erst nach der Zugabe abhaken.',
        'Nach Abschluss des Kurses erneut messen, bevor weiter dosiert wird.',
      ],
    }),
  },
  {
    key: 'nutrients',
    icon: 'N',
    kicker: 'Nährstoffmanagement',
    recheckDays: 7,
    action: { label: 'Nährstoffe prüfen', tool: 'dosing' },
    match: (parameters) => affected(parameters, (score, parameter) => parameter.groupKey === 'nutrients' && score !== 5),
    build: (items) => {
      const high = items.filter((item) => item.evaluation.score > 5)
      return {
        title: high.length ? 'Nährstoffmanagement optimieren' : 'Nährstoffversorgung anheben',
        summary: high.length
          ? `${list(high)} ${high.length === 1 ? 'ist' : 'sind'} erhöht. Eintrag und Export werden angepasst, bevor einzelne Werte korrigiert werden.`
          : `${list(items)} ${items.length === 1 ? 'ist' : 'sind'} zu niedrig. Eine Limitierung bremst Wachstum und Farbentwicklung.`,
        steps: high.length
          ? ['Futtereintrag reduzieren.', 'Eiweißabschäumer reinigen und Leistung prüfen.', 'PO₄-Adsorber einsetzen oder Standzeit verlängern.']
          : ['Nährstoffexport und Adsorber zurückfahren.', 'Fütterung behutsam erhöhen.', 'Nitrat und Phosphat gemeinsam und langsam anheben.'],
      }
    },
  },
  {
    key: 'pollutants',
    icon: '!',
    kicker: 'Eintragsquelle',
    recheckDays: 7,
    action: { label: 'Alle Werte ansehen', tab: 'values' },
    match: (parameters) => affected(parameters, (score, parameter) => parameter.groupKey === 'pollutants' && score >= 6),
    build: (items) => ({
      title: 'Schadstoffquelle eliminieren',
      summary: `${list(items)} ${items.length === 1 ? 'stammt' : 'stammen'} vermutlich aus einer Eintragsquelle im System. Die Quelle wird gesucht, nicht der Wert behandelt.`,
      steps: [
        'Aktivkohle einsetzen und regelmäßig wechseln.',
        'Osmosewasser und Nachfüllwasser prüfen.',
        'Technik auf Korrosion, Klebstoffe und Zubehör kontrollieren.',
      ],
    }),
  },
]

const MAX_RECOMMENDATIONS = 3

export function buildDirectRecommendations(parameters = [], { dosingKeys = new Set() } = {}) {
  const context = { dosingKeys: dosingKeys instanceof Set ? dosingKeys : new Set(dosingKeys) }
  return RULES
    .map((rule) => {
      const items = rule.match(parameters, context)
      if (!items.length) return null
      const rank = severity(items)
      return {
        key: rule.key,
        icon: rule.icon,
        kicker: rule.kicker,
        recheckDays: rule.recheckDays,
        action: rule.action,
        tone: rank >= 3 ? 'critical' : 'watch',
        priority: rank >= 3 ? 'Hoch' : 'Mittel',
        elements: items.map(elementView),
        rank,
        ...rule.build(items),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, MAX_RECOMMENDATIONS)
}
