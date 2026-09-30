import { ELEMENT_DEFINITIONS } from './analysisCatalog.js'

const STORAGE_KEY = 'ati_analysis_content:v1'

export const ANALYSIS_PARAMETERS = ELEMENT_DEFINITIONS

const CUSTOM_PARAMETER_CONTENT = {
  cobalt: {
    general: 'Physiologisch ist Cobalt für viele marine Organismen ein essenzielles Spurenelement, da es das zentrale Atom im bioaktiven Zentrum von Cobalamin (Vitamin B12) bildet. Dieses Coenzym ist bei Wirbeltieren, vielen Wirbellosen und Mikroorganismen unverzichtbar für die DNA-Replikation und Zellteilung, die Blutbildung sowie ein funktionierendes Nervensystem.',
    importance: 'Cobalt unterstützt über Vitamin B12 zentrale Stoffwechselprozesse, die Zellteilung und die Stabilität des Mikrobioms im Aquariensystem.',
    analytics: [
      { method: 'ICP-OES', lod: '0,4–0,5 µg/l', loq: '1,2–1,5 µg/l' },
      { method: 'ICP-MS', lod: '0,01–0,1 µg/l', loq: '0,03–0,3 µg/l' },
    ],
    lodDefinition: 'Unterhalb dieser Grenze ist ein Nachweis nicht zuverlässig möglich. Ab der LOD ist der Analyt nachweisbar, die quantitative Bestimmung ist jedoch noch mit einer erhöhten Messunsicherheit verbunden.',
    loqDefinition: 'Untere Grenze für eine zuverlässige quantitative Bestimmung. Ab der LOQ können Werte mit definierter beziehungsweise akzeptabler Messunsicherheit quantitativ angegeben werden.',
    attentionThreshold: 0.6,
    referenceConditions: '35 PSU · pH 8,0–8,4 · 25 °C',
    advice: {
      low: {
        causes: [
          'Der Idealbereich liegt bei ICP-OES unterhalb der Nachweisgrenze.',
          'Unterversorgung durch das Versorgungssystem, zum Beispiel den Kalkreaktor.',
          'Reduktion durch Filtermedien.',
          'Regelmäßige Nutzung von PO₄-Adsorbern.',
        ],
        effects: [
          'Störungen des Mikrobioms und damit ein Verlust der Stabilität des Aquariensystems.',
          'Reduziertes Wachstum der Aquarienbewohner.',
        ],
        corrections: [
          'Den Wert mit einer ICP-MS-Analyse überprüfen.',
          'Wenn nötig, den Wert durch die Zugabe von ICP Element Cobalt ausgleichen.',
          'Ein ausgewogenes Versorgungssystem wie Essentials SPS oder Mixed Reef nutzen.',
        ],
      },
      high: {
        causes: [
          'Cobaltreiche Meersalze oder Meerwässer.',
          'Spurenelementmischungen.',
          'Überversorgung durch das Versorgungssystem.',
          'Kontaminierte Wasserpflegeprodukte.',
          'Korrodierende Magnete oder Metalle.',
        ],
        effects: [
          'Absterben von Muscheln und roten Makroalgen möglich.',
          'Reduzierte Vitalität mit vermindertem Wachstum, schlechter Farbausbildung oder Bleaching und geringer Polypenexpansion.',
          'In Extremfällen Gewebenekrosen und Tod.',
        ],
        corrections: [
          'Zufuhr beziehungsweise Dosierung stoppen.',
          'Die Quelle oder Ursache finden und beseitigen.',
          'Wenn möglich über einen eisenbasierten PO₄-Adsorber und Aktivkohle filtern.',
          'Größere Wasserwechsel mit Absolute Ocean oder Nyos Pure durchführen.',
        ],
      },
    },
    high: 'Zufuhr stoppen, die Eintragsquelle beseitigen und den Wert durch geeignete Filterung oder größere Wasserwechsel kontrolliert senken.',
    low: 'Den Wert per ICP-MS bestätigen und bei Bedarf kontrolliert mit ICP Element Cobalt oder einem ausgewogenen Versorgungssystem ausgleichen.',
  },
  salinity: {
    general: 'Die Salinität beschreibt die gesamte Konzentration gelöster Salze im Meerwasser. Sie wird hier in Practical Salinity Units (PSU) angegeben.',
    importance: 'Eine stabile Salinität ist die Grundlage für den osmotischen Haushalt aller Tiere und beeinflusst zugleich die gemessenen Konzentrationen vieler weiterer Elemente.',
    high: 'Verdunstungsausgleich, Dichtemessgerät und Kalibrierung prüfen. Ausschließlich mit Osmosewasser langsam korrigieren und keine schnelle Absenkung vornehmen.',
    low: 'Ursache wie zu viel Nachfüllwasser oder fehlerhafte Messung prüfen. Mit passend angesetztem Meerwasser schrittweise anheben und zwischendurch kontrollieren.',
  },
  kh: {
    general: 'Die Karbonathärte beschreibt die Pufferkapazität des Wassers gegen pH-Schwankungen und wird in Grad deutscher Karbonathärte (dKH) angegeben.',
    importance: 'KH stabilisiert den pH-Wert und liefert Karbonat für den Skelettaufbau von Steinkorallen und anderen kalkbildenden Organismen.',
    high: 'KH-Dosierung pausieren oder reduzieren, Dosierpumpe und Ansatz kontrollieren und den Wert ohne abrupte Gegenkorrektur absinken lassen.',
    low: 'Verbrauch und Dosieranlage prüfen. KH-Versorgung in kleinen, berechneten Schritten erhöhen und den Tagesanstieg begrenzen.',
  },
  calcium: {
    general: 'Calcium ist ein Mengenelement des Meerwassers. Die Konzentration wird in Milligramm pro Liter gemessen und steht eng mit KH und Magnesium in Verbindung.',
    importance: 'Korallen, Kalkrotalgen und andere Organismen benötigen Calcium zusammen mit Karbonat für Wachstum und Skelettbildung.',
    high: 'Calciumzufuhr reduzieren oder pausieren, Salinität und Dosierung kontrollieren und KH sowie Magnesium gemeinsam bewerten.',
    low: 'Calcium kontrolliert nachdosieren, Verbrauch prüfen und auf ein ausgewogenes Verhältnis zu KH und Magnesium achten.',
  },
  magnesium: {
    general: 'Magnesium ist eines der häufigsten Ionen im Meerwasser und wird in Milligramm pro Liter angegeben. Es wirkt als chemischer Stabilisator im Kalkhaushalt.',
    importance: 'Ein passender Magnesiumwert hilft, Calcium und Karbonat in Lösung zu halten, und unterstützt zahlreiche biologische Stoffwechselprozesse.',
    high: 'Magnesiumdosierung stoppen, verwendetes Salz und Dosiermengen kontrollieren und den Wert durch Verbrauch oder behutsame Wasserwechsel normalisieren lassen.',
    low: 'Magnesiumpräparat berechnet und über mehrere Etappen dosieren. Anschließend Calcium und KH erneut gemeinsam kontrollieren.',
  },
  nitrate: {
    general: 'Nitrat (NO₃) ist die oxidierte Endstufe des Stickstoffkreislaufs und ein messbarer Nährstoff im Aquarium.',
    importance: 'In moderater Konzentration versorgt Nitrat Korallen und Mikroorganismen mit Stickstoff. Zu hohe und zu niedrige Werte können das biologische Gleichgewicht stören.',
    high: 'Futtereintrag, Besatz und organische Belastung prüfen. Abschäumung, Filterpflege und Wasserwechsel optimieren und den Wert langsam senken.',
    low: 'Nährstoffentzug durch Filter oder Adsorber prüfen, Fütterung behutsam anpassen und eine gezielte Dosierung nur kontrolliert beginnen.',
  },
  phosphate: {
    general: 'Phosphat (PO₄) ist eine gut messbare Phosphorverbindung und ein zentraler Nährstoff im Riffaquarium.',
    importance: 'Phosphor wird für Energieübertragung, Zellaufbau und Wachstum benötigt. Ein ausgewogener Wert vermeidet sowohl Limitierung als auch erhöhten Algendruck.',
    high: 'Futter, Ablagerungen und Eintragsquellen prüfen. Adsorber oder Filtermaßnahmen vorsichtig einsetzen und keine schnelle Absenkung erzwingen.',
    low: 'Phosphatadsorber und Nährstoffexport reduzieren, Versorgung prüfen und den Wert bei Bedarf sehr langsam und messbegleitet anheben.',
  },
}

// Demo guidance per element group. Elements the laboratory has not documented in
// detail yet fall back to this, so every card reads completely instead of showing
// half an empty panel. Replace per element as ATI supplies its own wording.
const GROUP_ADVICE = Object.freeze({
  basis: {
    low: {
      causes: ['Zu viel Osmose- oder Nachfüllwasser im System.', 'Verbrauch durch Besatz und Wachstum übersteigt die Zufuhr.', 'Mess- oder Kalibrierfehler am verwendeten Testgerät.'],
      effects: ['Instabile Wasserchemie und schwankende Folgewerte.', 'Nachlassendes Wachstum und Stressreaktionen beim Besatz.'],
    },
    high: {
      causes: ['Verdunstungsausgleich läuft nicht ausreichend nach.', 'Überdosierung über das Versorgungssystem.', 'Wechsel von Salz oder Zusatzmittel ohne begleitende Kontrolle.'],
      effects: ['Osmotischer Stress und veränderte Einordnung aller weiteren Messwerte.', 'Ausfällungen und Trübungen bei starken Abweichungen.'],
    },
  },
  quantity: {
    low: {
      causes: ['Hoher Verbrauch durch Korallen- und Kalkrotalgenwachstum.', 'Versorgungssystem oder Kalkreaktor liefert zu wenig nach.', 'Salzmischung führt dieses Element niedrig.'],
      effects: ['Gebremstes Skelettwachstum und blasse Färbung.', 'Verschiebung des Gleichgewichts zwischen KH, Calcium und Magnesium.'],
    },
    high: {
      causes: ['Überdosierung über das Versorgungssystem oder einen Einzelzusatz.', 'Salzmischung mit erhöhtem Gehalt dieses Elements.', 'Zwei parallel laufende Versorgungssysteme.'],
      effects: ['Ionenungleichgewicht gegenüber Salinität und verwandten Elementen.', 'Ausfällungen und dadurch schlechtere Verfügbarkeit anderer Elemente.'],
    },
  },
  nutrients: {
    low: {
      causes: ['Zu starker Export über Abschäumer, Adsorber oder Filterung.', 'Geringer Futtereintrag im Verhältnis zum Besatz.', 'Hoher Verbrauch durch schnell wachsende Korallen und Algen.'],
      effects: ['Nährstofflimitierung mit blasser Färbung und Bleaching.', 'Gebremstes Wachstum und Gewebeverlust an den Spitzen.', 'Vermehrtes Auftreten von Dinoflagellaten und Cyanobakterien.'],
    },
    high: {
      causes: ['Hoher Futtereintrag im Verhältnis zur Exportleistung.', 'Nachlassende Abschäumerleistung oder erschöpfte Filtermedien.', 'Belastetes Osmose- oder Nachfüllwasser.'],
      effects: ['Vermehrtes Algenwachstum und Belagbildung.', 'Nachlassende Farbintensität besonders bei SPS-Korallen.', 'Verschobenes Verhältnis von Stickstoff zu Phosphor.'],
    },
  },
  trace: {
    low: {
      causes: ['Verbrauch durch den Besatz ohne entsprechende Nachversorgung.', 'Entzug über Aktivkohle, Adsorber oder starke Abschäumung.', 'Der Idealbereich liegt nahe der Nachweisgrenze der Methode.'],
      effects: ['Gestörte Enzym- und Stoffwechselprozesse.', 'Nachlassende Färbung und verlangsamtes Wachstum.'],
    },
    high: {
      causes: ['Überdosierung einer Spurenelementmischung.', 'Mehrere Versorgungssysteme mit überschneidenden Elementen.', 'Eintrag über Salzmischung oder Nachfüllwasser.'],
      effects: ['Belastung empfindlicher Wirbelloser.', 'Reduzierte Vitalität mit schwacher Polypenexpansion.'],
    },
  },
  pollutants: {
    low: {
      causes: ['Für dieses Element ist kein Mindestwert vorgesehen.'],
      effects: [],
      corrections: ['Keine Maßnahme nötig. Ein nicht nachweisbarer Wert ist hier der Zielzustand.'],
    },
    high: {
      causes: ['Korrodierende Metalle, Magnete oder Technik im Wasserkontakt.', 'Belastetes Osmose- oder Leitungswasser.', 'Klebstoffe, Beschichtungen oder nicht aquarientaugliches Material.'],
      effects: ['Schleichende Belastung empfindlicher Korallen und Wirbelloser.', 'Gewebeverlust und Bleaching bei anhaltender Exposition.'],
      corrections: ['Die Eintragsquelle suchen und entfernen.', 'Über Aktivkohle filtern.', 'Mit größeren Wasserwechseln schrittweise senken.'],
    },
  },
})

const REFERENCE_CONDITIONS = '35 PSU · pH 8,0–8,4 · 25 °C'

export const DEFAULT_PARAMETER_GUIDE = Object.freeze({
  general: 'Dieser Laborparameter beschreibt die gemessene Konzentration eines für das Aquariensystem relevanten Stoffes.',
  importance: 'Der Wert sollte zusammen mit seiner Elementgruppe, dem Zielbereich und dem zeitlichen Verlauf beurteilt werden.',
  high: 'Mögliche Eintragsquellen und Dosierungen prüfen. Den Wert langsam korrigieren und die Wirkung durch eine erneute Messung kontrollieren.',
  low: 'Verbrauch und Versorgung prüfen. Eine notwendige Ergänzung in kleinen Schritten vornehmen und zeitnah nachmessen.',
})

function groupAdvice(definition, flat) {
  const group = GROUP_ADVICE[definition.groupKey] || GROUP_ADVICE.trace
  return Object.fromEntries(['low', 'high'].map((direction) => [direction, {
    causes: [...group[direction].causes],
    effects: [...group[direction].effects],
    corrections: [...(group[direction].corrections || [flat[direction]])],
  }]))
}

function defaultContent(definition) {
  const range = definition.referenceRanges.Meerwasser
  const custom = CUSTOM_PARAMETER_CONTENT[definition.key] || {}
  const high = custom.high || DEFAULT_PARAMETER_GUIDE.high
  const low = custom.low || DEFAULT_PARAMETER_GUIDE.low
  return {
    unit: definition.unit,
    targetMin: range.min,
    targetMax: range.max,
    precision: definition.precision,
    general: custom.general || `${definition.label} (${definition.symbol}) wird mit ${definition.source} bestimmt und in ${definition.unit} für den Kundenbericht ausgegeben.`,
    importance: custom.importance || `${definition.label} gehört zur Gruppe „${definition.group}“. Der Wert wird zusammen mit dem Zielbereich, verwandten Elementen und seinem zeitlichen Verlauf beurteilt.`,
    high,
    low,
    analytics: custom.analytics || [{ method: definition.source, lod: '', loq: '' }],
    lodDefinition: custom.lodDefinition || '',
    loqDefinition: custom.loqDefinition || '',
    attentionThreshold: custom.attentionThreshold ?? '',
    referenceConditions: custom.referenceConditions || REFERENCE_CONDITIONS,
    advice: custom.advice || groupAdvice(definition, { low, high }),
  }
}

export const DEFAULT_PARAMETER_CONTENT = Object.freeze(Object.fromEntries(
  ELEMENT_DEFINITIONS.map((definition) => [definition.key, Object.freeze(defaultContent(definition))]),
))

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function cloneDefaults() {
  return cloneValue(DEFAULT_PARAMETER_CONTENT)
}

function stringList(value) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : []
}

function normalizeAdvice(value, fallback) {
  return Object.fromEntries(['low', 'high'].map((direction) => [direction, {
    causes: stringList(value?.[direction]?.causes ?? fallback?.[direction]?.causes),
    effects: stringList(value?.[direction]?.effects ?? fallback?.[direction]?.effects),
    corrections: stringList(value?.[direction]?.corrections).length
      ? stringList(value?.[direction]?.corrections)
      : stringList(fallback?.[direction]?.corrections),
  }]))
}

function mergeStoredContent(defaultItem, storedItem = {}) {
  const merged = { ...cloneValue(defaultItem), ...storedItem }
  const adviceFallback = cloneValue(defaultItem.advice)
  if (String(storedItem.low || '').trim()) adviceFallback.low.corrections = [String(storedItem.low).trim()]
  if (String(storedItem.high || '').trim()) adviceFallback.high.corrections = [String(storedItem.high).trim()]
  merged.analytics = Array.isArray(storedItem.analytics) && storedItem.analytics.length
    ? storedItem.analytics.map((row) => ({ method: String(row?.method || ''), lod: String(row?.lod || ''), loq: String(row?.loq || '') }))
    : cloneValue(defaultItem.analytics)
  merged.advice = normalizeAdvice(storedItem.advice, adviceFallback)
  return merged
}

export function loadAnalysisContent() {
  const defaults = cloneDefaults()
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    for (const key of Object.keys(defaults)) defaults[key] = mergeStoredContent(defaults[key], stored[key])
    if (Number(stored.cobalt?.targetMin) === 0.05 && Number(stored.cobalt?.targetMax) === 0.2) {
      defaults.cobalt.targetMin = DEFAULT_PARAMETER_CONTENT.cobalt.targetMin
      defaults.cobalt.targetMax = DEFAULT_PARAMETER_CONTENT.cobalt.targetMax
    }
    return defaults
  } catch {
    return defaults
  }
}

export function saveAnalysisContent(content) {
  const safeContent = {}
  for (const parameter of ANALYSIS_PARAMETERS) {
    const item = content[parameter.key] || {}
    const fallback = DEFAULT_PARAMETER_CONTENT[parameter.key]
    const advice = normalizeAdvice(item.advice, fallback.advice)
    safeContent[parameter.key] = {
      unit: String(item.unit || parameter.unit).trim(),
      targetMin: Number.isFinite(Number(item.targetMin)) ? Number(item.targetMin) : parameter.referenceRanges.Meerwasser.min,
      targetMax: Number.isFinite(Number(item.targetMax)) ? Number(item.targetMax) : parameter.referenceRanges.Meerwasser.max,
      precision: Number.isFinite(Number(item.precision)) ? Math.max(0, Math.min(4, Number(item.precision))) : parameter.precision,
      general: String(item.general || '').trim(),
      importance: String(item.importance || '').trim(),
      high: advice.high.corrections.join(' ') || String(item.high || '').trim(),
      low: advice.low.corrections.join(' ') || String(item.low || '').trim(),
      analytics: Array.isArray(item.analytics) ? item.analytics.map((row) => ({
        method: String(row?.method || '').trim(),
        lod: String(row?.lod || '').trim(),
        loq: String(row?.loq || '').trim(),
      })).filter((row) => row.method || row.lod || row.loq) : [],
      lodDefinition: String(item.lodDefinition || '').trim(),
      loqDefinition: String(item.loqDefinition || '').trim(),
      // An empty field must stay empty: Number('') is 0, which would invent a threshold.
      attentionThreshold: item.attentionThreshold === '' || item.attentionThreshold === null || item.attentionThreshold === undefined || !Number.isFinite(Number(item.attentionThreshold))
        ? ''
        : Number(item.attentionThreshold),
      referenceConditions: String(item.referenceConditions || '').trim(),
      advice,
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeContent))
  return safeContent
}

export function resetAnalysisContent() {
  localStorage.removeItem(STORAGE_KEY)
  return cloneDefaults()
}

export function freshParameterContent(key) {
  return cloneValue(DEFAULT_PARAMETER_CONTENT[key])
}
