// Funktionen und Bildschirme für die Suche in der Kopfleiste. Ohne Vue, damit sie sich testen lässt.
// Jeder Eintrag hat Alltagswörter als Stichworte – Kundinnen suchen „Wasserwechsel“ oder „Passwort“,
// nicht den Namen des Bildschirms.

export const SEARCH_FUNCTIONS = Object.freeze([
  // Bildschirme
  { key: 'dashboard', group: 'Bereich', title: 'Übersicht', hint: 'Becken, offene Maßnahmen und Laborstatus', to: '/dashboard', icon: 'home',
    keywords: ['start', 'dashboard', 'home', 'startseite', 'maßnahmen', 'status'] },
  { key: 'aquariums', group: 'Bereich', title: 'Aquarien', hint: 'Alle Becken und Osmosequellen', to: '/aquariums', icon: 'tank',
    keywords: ['becken', 'aquarium', 'meerwasser', 'osmose', 'profil'] },
  { key: 'analyses', group: 'Bereich', title: 'Analysen', hint: 'Testkits und Laborberichte verfolgen', to: '/analyses', icon: 'chart',
    keywords: ['bericht', 'laborbericht', 'icp', 'test', 'ergebnis', 'probe', 'barcode'] },
  { key: 'chronik', group: 'Bereich', title: 'Chronik', hint: 'Alle Werte über die Zeit vergleichen', to: '/chronik', icon: 'clock',
    keywords: ['verlauf', 'historie', 'entwicklung', 'trend', 'zeit', 'vergleich', 'favoriten'] },
  { key: 'tools', group: 'Bereich', title: 'Tools', hint: 'Simulator, Rezeptfinder, Verläufe, Quellen', to: '/tools', icon: 'tool',
    keywords: ['werkzeuge', 'rechner'] },
  { key: 'account', group: 'Bereich', title: 'Profil', hint: 'Konto, Sicherheit und Benachrichtigungen', to: '/account', icon: 'user',
    keywords: ['konto', 'account', 'einstellungen', 'name', 'e-mail', 'email', 'sprache', 'land'] },
  { key: 'support', group: 'Bereich', title: 'Hilfe & Support', hint: 'Häufige Fragen und Kontakt zum Laborteam', to: '/support', icon: 'help',
    keywords: ['hilfe', 'faq', 'fragen', 'kontakt', 'support', 'labor', 'anfrage'] },
  { key: 'settings', group: 'Bereich', title: 'Einstellungen', hint: 'Bewertung, Empfehlungen und Benutzer verwalten', to: '/settings', icon: 'settings',
    keywords: ['admin', 'verwaltung', 'benutzer', 'rollen', 'regeln', 'vorlagen', 'skalen'], roles: ['admin', 'subadmin'] },

  // Aufgaben
  { key: 'activate', group: 'Aufgabe', title: 'Analyse registrieren', hint: 'Testkit aktivieren und Probe zuordnen', to: '/analyses/activate', icon: 'plus',
    keywords: ['testkit', 'kit', 'barcode', 'aktivieren', 'probe', 'einsenden', 'registrieren', 'neue analyse'] },
  { key: 'aquarium-new', group: 'Aufgabe', title: 'Aquarium anlegen', hint: 'Neues Becken mit Volumen und Ausstattung', to: '/aquariums/new', icon: 'plus',
    keywords: ['neues aquarium', 'becken anlegen', 'hinzufügen', 'erstellen', 'volumen', 'liter', 'gallonen'] },
  { key: 'password', group: 'Aufgabe', title: 'Passwort ändern', hint: 'Im Profil unter Sicherheit', to: '/account', icon: 'user',
    keywords: ['passwort', 'kennwort', 'sicherheit', 'login', 'anmelden'] },
  { key: 'reminder', group: 'Aufgabe', title: 'Analyse-Erinnerung', hint: 'Im Profil: wann wir Sie an den nächsten Test erinnern', to: '/account', icon: 'user',
    keywords: ['erinnerung', 'benachrichtigung', 'intervall', 'newsletter', 'mail'] },
  { key: 'pdf', group: 'Aufgabe', title: 'Bericht als PDF', hint: 'Im Laborbericht über „PDF erstellen“', to: '/analyses', icon: 'chart',
    keywords: ['pdf', 'drucken', 'export', 'herunterladen', 'download', 'ausdrucken'] },
  { key: 'dosing', group: 'Aufgabe', title: 'Dosierplan', hint: 'Im Laborbericht: was Sie wie viel dosieren', to: '/analyses', icon: 'chart',
    keywords: ['dosierung', 'dosieren', 'dosis', 'empfehlung', 'produkte', 'zugabe', 'nachdosieren'] },

  // Tools
  { key: 'tool-waterchange', group: 'Tool', title: 'Wasserwechsel-Simulator', hint: 'Werte nach einem oder mehreren Wechseln', to: '/tools?tool=waterchange', icon: 'tool',
    keywords: ['wasserwechsel', 'ww', 'simulator', 'simulation', 'salz', 'neuwasser', 'wechsel'] },
  { key: 'tool-consumption', group: 'Tool', title: 'Rezeptfinder', hint: 'Verbrauch je Element aus zwei Berichten', to: '/tools?tool=consumption', icon: 'tool',
    keywords: ['verbrauch', 'rezept', 'stabilisieren', 'täglich', 'dosis', 'dosierung'] },
  { key: 'tool-trends', group: 'Tool', title: 'Verläufe', hint: 'Eine Parametergruppe über alle Berichte', to: '/tools?tool=trends', icon: 'tool',
    keywords: ['verlauf', 'diagramm', 'kurve', 'entwicklung', 'trend', 'grafik'] },
  { key: 'tool-sources', group: 'Tool', title: 'Mögliche Quellen', hint: 'Woher unerwünschte Elemente kommen', to: '/tools?tool=sources', icon: 'tool',
    keywords: ['quelle', 'ursache', 'eintrag', 'schwermetall', 'metall', 'unerwünscht', 'kupfer', 'zinn', 'aluminium'] },
])

// Was ohne Eingabe als Schnellzugriff erscheint.
export const QUICK_FUNCTIONS = Object.freeze(['activate', 'tool-waterchange', 'chronik', 'aquarium-new'])

// Kleinschreibung, Umlaute und ß wie getippt ohne Sonderzeichen („ubersicht“, „massnahmen“).
export function foldText(text) {
  return String(text || '').toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function allowed(item, role) {
  return !item.roles || item.roles.includes(role)
}

// Jedes Suchwort muss irgendwo vorkommen. Treffer am Titelanfang zählen am meisten, dann im Titel,
// dann am Anfang eines Stichworts, dann irgendwo.
function score(item, words) {
  const title = foldText(item.title)
  const fields = [title, ...item.keywords.map(foldText), foldText(item.hint)]
  let total = 0
  for (const word of words) {
    if (title.startsWith(word)) total += 40
    else if (title.split(/[\s-]+/).some((part) => part.startsWith(word))) total += 30
    else if (item.keywords.some((keyword) => foldText(keyword).split(/\s+/).some((part) => part.startsWith(word)))) total += 20
    else if (fields.some((field) => field.includes(word))) total += 8
    else return 0
  }
  return total
}

export function searchFunctions(query, { role = '', limit = 5 } = {}) {
  const words = foldText(query).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return SEARCH_FUNCTIONS
    .filter((item) => allowed(item, role))
    .map((item, index) => ({ item, index, value: score(item, words) }))
    .filter((hit) => hit.value > 0)
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .slice(0, limit)
    .map((hit) => hit.item)
}

export function quickFunctions({ role = '' } = {}) {
  return QUICK_FUNCTIONS.map((key) => SEARCH_FUNCTIONS.find((item) => item.key === key)).filter((item) => item && allowed(item, role))
}
