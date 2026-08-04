const STORAGE_KEY = 'ati_support_content:v1'

export const DEFAULT_SUPPORT_FAQS = Object.freeze([
  { id: 'analysis-availability', category: 'Analyse', question: 'Wann ist mein Analysebericht verfügbar?', answer: 'Der Status Ihrer Probe wird unter Analysen angezeigt. Sobald die Laborbewertung abgeschlossen ist, öffnet sich dort der vollständige Bericht mit Messwerten und Empfehlungen.' },
  { id: 'element-colors', category: 'Messwerte', question: 'Was bedeuten die Farben an einem Element?', answer: 'Die Farbe des Zielbalkens zeigt die Entfernung zum empfohlenen Bereich. Die Gruppierungsfarbe am Kartenrand ordnet das Element seiner Laborgruppe zu; der ausgeschriebene Status zeigt die Bewertung.' },
  { id: 'group-recommendations', category: 'Empfehlungen', question: 'Warum betrifft eine Empfehlung mehrere Elemente?', answer: 'Elemente derselben Gruppe können dieselbe Ursache oder Maßnahme teilen. Der Pflegeplan fasst identische Empfehlungen zusammen und nennt alle betroffenen Werte.' },
  { id: 'register-barcode', category: 'Testkit', question: 'Wo registriere ich meinen Barcode?', answer: 'Unter Analysen wählen Sie Analyse registrieren. Dort scannen oder erfassen Sie den Barcode und ordnen die Probe dem passenden Aquarium zu.' },
  { id: 'change-password', category: 'Konto', question: 'Wie ändere ich mein Passwort?', answer: 'Im Profil finden Sie den Bereich Sicherheit. Geben Sie dort Ihr aktuelles und das neue Passwort ein und bestätigen Sie die Änderung.' },
])

function cloneDefaults() {
  return { faqs: DEFAULT_SUPPORT_FAQS.map((item) => ({ ...item })) }
}

function normalizeFaq(item, index) {
  return {
    id: String(item?.id || `faq-${Date.now()}-${index}`),
    category: String(item?.category || 'Allgemein').trim(),
    question: String(item?.question || '').trim(),
    answer: String(item?.answer || '').trim(),
  }
}

export function loadSupportContent() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!stored || !Array.isArray(stored.faqs)) return cloneDefaults()
    return { faqs: stored.faqs.map(normalizeFaq).filter((item) => item.question && item.answer) }
  } catch {
    return cloneDefaults()
  }
}

export function saveSupportContent(content) {
  const faqs = (content?.faqs || [])
    .map(normalizeFaq)
    .filter((item) => item.question && item.answer)
  const safeContent = { faqs }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeContent))
  return safeContent
}

export function createSupportFaq() {
  return {
    id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: 'Allgemein',
    question: '',
    answer: '',
  }
}
