const STORAGE_KEY = 'ati_analysis_content:v1'

export const ANALYSIS_PARAMETERS = Object.freeze([
  { key: 'salinity', label: 'Salinität', symbol: 'PSU', group: 'Basiswerte' },
  { key: 'kh', label: 'KH', symbol: 'KH', group: 'Basiswerte' },
  { key: 'calcium', label: 'Calcium', symbol: 'Ca', group: 'Mengenelemente' },
  { key: 'magnesium', label: 'Magnesium', symbol: 'Mg', group: 'Mengenelemente' },
  { key: 'nitrate', label: 'Nitrat', symbol: 'NO₃', group: 'Nährstoffe' },
  { key: 'phosphate', label: 'Phosphat', symbol: 'PO₄', group: 'Nährstoffe' },
])

export const DEFAULT_PARAMETER_CONTENT = Object.freeze({
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
})

export const DEFAULT_PARAMETER_GUIDE = Object.freeze({
  general: 'Dieser Laborparameter beschreibt die gemessene Konzentration eines für das Aquariensystem relevanten Stoffes.',
  importance: 'Der Wert sollte zusammen mit seiner Elementgruppe, dem Zielbereich und dem zeitlichen Verlauf beurteilt werden.',
  high: 'Mögliche Eintragsquellen und Dosierungen prüfen. Den Wert langsam korrigieren und die Wirkung durch eine erneute Messung kontrollieren.',
  low: 'Verbrauch und Versorgung prüfen. Eine notwendige Ergänzung in kleinen Schritten vornehmen und zeitnah nachmessen.',
})

function cloneDefaults() {
  return Object.fromEntries(Object.entries(DEFAULT_PARAMETER_CONTENT).map(([key, value]) => [key, { ...value }]))
}

export function loadAnalysisContent() {
  const defaults = cloneDefaults()
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    for (const key of Object.keys(defaults)) defaults[key] = { ...defaults[key], ...(stored[key] || {}) }
    return defaults
  } catch {
    return defaults
  }
}

export function saveAnalysisContent(content) {
  const safeContent = {}
  for (const parameter of ANALYSIS_PARAMETERS) {
    const item = content[parameter.key] || {}
    safeContent[parameter.key] = {
      general: String(item.general || '').trim(),
      importance: String(item.importance || '').trim(),
      high: String(item.high || '').trim(),
      low: String(item.low || '').trim(),
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeContent))
  return safeContent
}

export function resetAnalysisContent() {
  localStorage.removeItem(STORAGE_KEY)
  return cloneDefaults()
}
