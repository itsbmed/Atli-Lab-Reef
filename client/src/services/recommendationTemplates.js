const STORAGE_KEY = 'ati_recommendation_templates:v1'

// Editable copy per direct recommendation. `options` fills the highlighted blue box —
// one entry renders as a plain instruction, several as labelled alternatives, and an
// entry carrying `actionLabel` renders the card's call to action in place. `detail` is
// the block the evaluation sheet shows under each event ("Mögliche Quellen",
// "Empfohlene Massnahmen", the reduction percentages); `tips` is the hint box below.
const DEFAULT_TEMPLATES = Object.freeze([
  {
    key: 'water-change',
    name: 'Wasserwechsel',
    kicker: 'Sofortmaßnahme',
    title: 'Wasserwechsel durchführen',
    actionLabel: 'Wasserwechsel planen',
    recheckDays: 7,
    options: [
      {
        label: 'Option A: Standard Empfehlung (praktisch)',
        text: 'Führen Sie drei Wasserwechsel von jeweils 20 % im Abstand von einigen Tagen durch. Dies senkt die erhöhten Konzentrationen schrittweise und schonend für Ihre Aquarienbewohner.',
        actionLabel: '',
      },
      {
        label: 'Option B: Individuelle Korrektur (maßgeschneidert und effizient)',
        text: 'Möchten Sie das Ausmaß und die Anzahl der Wasserwechsel exakt auf Ihr Beckenvolumen und Ihre Zielwerte abstimmen? Planen Sie die optimale Korrektur:',
        actionLabel: 'Hier geht es zum Wasserwechsel-Simulator',
      },
    ],
    detailLabel: '',
    detailItems: [],
    dynamicDetail: false,
    tips: [
      'Verwenden Sie für die Wasserwechsel ein Meersalz mit naturnaher Zusammensetzung wie Absolute Ocean oder Nyos pure. Salze mit erhöhten KH-, Ca- und Mg-Werten eignen sich hierfür nicht, da sie die zu hohen Werte nicht effektiv senken.',
    ],
  },
  {
    key: 'reduce-supply',
    name: 'Elementversorgung reduzieren',
    kicker: 'Versorgung anpassen',
    title: 'Elementversorgung reduzieren',
    actionLabel: 'Dosierung anpassen',
    recheckDays: 14,
    options: [],
    detailLabel: 'Daher sollten Sie die tägliche Zugabe reduzieren',
    detailItems: [],
    dynamicDetail: true,
    tips: [],
  },
  {
    key: 'nutrients',
    name: 'Nährstoffmanagement · erhöht',
    kicker: 'Nährstoffmanagement',
    title: 'Nährstoffmanagement optimieren',
    actionLabel: 'Nährstoffe prüfen',
    recheckDays: 7,
    options: [],
    detailLabel: 'Empfohlene Maßnahmen',
    detailItems: ['Futtereintrag reduzieren', 'Eiweißabschäumer reinigen', 'PO₄-Adsorber nutzen'],
    dynamicDetail: false,
    tips: [],
  },
  {
    key: 'nutrients-low',
    name: 'Nährstoffmanagement · zu niedrig',
    kicker: 'Nährstoffmanagement',
    title: 'Nährstoffversorgung anheben',
    actionLabel: 'Nährstoffe prüfen',
    recheckDays: 7,
    options: [],
    detailLabel: 'Empfohlene Maßnahmen',
    detailItems: ['Adsorber zurückfahren', 'Fütterung behutsam erhöhen', 'Abschäumer schwächer einstellen'],
    dynamicDetail: false,
    tips: [],
  },
  {
    key: 'pollutants',
    name: 'Schadstoffquellen eliminieren',
    kicker: 'Eintragsquelle',
    title: 'Schadstoffquelle eliminieren',
    actionLabel: 'Alle Werte ansehen',
    recheckDays: 7,
    options: [],
    detailLabel: 'Mögliche Quellen',
    detailItems: ['Aktivkohle', 'RO-Wasser', 'Korrosion', 'Klebstoffe und Zubehör'],
    dynamicDetail: false,
    tips: [],
  },
  {
    key: 'dosing',
    name: 'Dosierungsplan',
    kicker: 'Korrekturkurs',
    title: 'Fehlende Elemente auffüllen',
    actionLabel: 'Dosierungsplan öffnen',
    recheckDays: 7,
    options: [],
    detailLabel: '',
    detailItems: [],
    dynamicDetail: false,
    tips: [],
  },
])

export const TEMPLATE_KEYS = Object.freeze(DEFAULT_TEMPLATES.map((template) => template.key))

function cloneDefaults() {
  return DEFAULT_TEMPLATES.map((template) => ({
    ...template,
    options: template.options.map((option) => ({ ...option })),
    detailItems: [...template.detailItems],
    tips: [...template.tips],
  }))
}

function sanitize(raw, fallback) {
  const list = (value, backup) => {
    const items = (Array.isArray(value) ? value : backup).map((item) => String(item || '').trim()).filter(Boolean)
    return items.length ? items : []
  }
  return {
    ...fallback,
    title: String(raw?.title || fallback.title).trim() || fallback.title,
    kicker: String(raw?.kicker || fallback.kicker).trim() || fallback.kicker,
    actionLabel: String(raw?.actionLabel || fallback.actionLabel).trim() || fallback.actionLabel,
    detailLabel: String(raw?.detailLabel ?? fallback.detailLabel).trim(),
    recheckDays: Math.max(1, Math.min(90, Number(raw?.recheckDays) || fallback.recheckDays)),
    options: (Array.isArray(raw?.options) ? raw.options : fallback.options)
      .map((option) => ({
        label: String(option?.label || '').trim(),
        text: String(option?.text || '').trim(),
        actionLabel: String(option?.actionLabel || '').trim(),
      }))
      .filter((option) => option.text),
    detailItems: list(raw?.detailItems, fallback.detailItems),
    tips: list(raw?.tips, fallback.tips),
  }
}

export function loadRecommendationTemplates() {
  const defaults = cloneDefaults()
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return defaults.map((template) => sanitize(stored[template.key], template))
  } catch {
    return defaults
  }
}

export function saveRecommendationTemplates(templates) {
  const defaults = Object.fromEntries(cloneDefaults().map((template) => [template.key, template]))
  const safe = {}
  for (const template of templates) {
    if (!defaults[template.key]) continue
    safe[template.key] = sanitize(template, defaults[template.key])
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  return safe
}

export function resetRecommendationTemplates() {
  localStorage.removeItem(STORAGE_KEY)
  return cloneDefaults()
}

export function templateMap(templates = loadRecommendationTemplates()) {
  return Object.fromEntries(templates.map((template) => [template.key, template]))
}
