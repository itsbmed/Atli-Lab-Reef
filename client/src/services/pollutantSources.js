// Known entry paths for unwanted elements. `elements` lists what a source typically
// introduces, which is what lets a report show only the sources worth checking.
export const POLLUTANT_SOURCES = Object.freeze([
  {
    key: 'activated-carbon',
    name: 'Aktivkohle',
    category: 'Filtermedien',
    elements: ['aluminium', 'phosphorus', 'phosphate', 'arsenic', 'nickel'],
    description: 'Günstige oder nicht gespülte Aktivkohle gibt Aluminium und Phosphat ab, besonders in den ersten Tagen nach dem Wechsel.',
    checks: [
      'Kohle vor dem Einsatz gründlich mit Osmosewasser spülen.',
      'Nur hochwertige, für Meerwasser freigegebene Kohle verwenden.',
      'Standzeit begrenzen und Kohle nicht überdosieren.',
    ],
  },
  {
    key: 'phosphate-adsorber',
    name: 'Phosphatadsorber',
    category: 'Filtermedien',
    elements: ['lanthanum', 'aluminium', 'iron'],
    description: 'Flüssige Adsorber auf Lanthanbasis hinterlassen Lanthan im Wasser. Eisen- und aluminiumbasierte Granulate geben ihr Trägermaterial ab.',
    checks: [
      'Produkttyp prüfen: lanthan-, eisen- oder aluminiumbasiert.',
      'Bei erhöhtem Lanthan auf einen eisenbasierten Adsorber wechseln.',
      'Adsorber nie im freien Wasser, sondern im Filterbeutel einsetzen.',
    ],
  },
  {
    key: 'osmosis-water',
    name: 'Osmose- und Nachfüllwasser',
    category: 'Wasseraufbereitung',
    elements: ['silicon', 'copper', 'nickel', 'boron', 'nitrate', 'phosphate'],
    description: 'Erschöpfte Membranen oder verbrauchtes Mischbettharz lassen Silikat und Spurenmetalle durch. Häufigste Quelle für schleichende Einträge.',
    checks: [
      'Leitwert direkt nach dem Harz messen, nicht nur im Vorratsbehälter.',
      'Membran und Mischbettharz nach Standzeit tauschen.',
      'Osmosewasser separat als Probe einsenden.',
    ],
  },
  {
    key: 'tap-water',
    name: 'Leitungswasser',
    category: 'Wasseraufbereitung',
    elements: ['lead', 'copper', 'zinc', 'nitrate', 'silicon', 'arsenic'],
    description: 'Direkt eingesetztes Leitungswasser bringt Kupfer und Blei aus der Hausinstallation sowie Nitrat und Silikat ein.',
    checks: [
      'Kein Leitungswasser zum Nachfüllen oder für Wasserwechsel verwenden.',
      'Alte Kupfer- oder Bleileitungen im Haus ausschließen.',
    ],
  },
  {
    key: 'corrosion',
    name: 'Korrosion an Technik',
    category: 'Technik',
    elements: ['iron', 'nickel', 'chromium', 'zinc', 'copper', 'manganese'],
    description: 'Pumpenwellen, Heizstäbe, Schlauchschellen und Magnete geben bei beschädigter Beschichtung Metalle ab.',
    checks: [
      'Heizstäbe, Pumpen und Magnethalter auf Rost und Absplitterungen prüfen.',
      'Edelstahlteile ohne Meerwasserfreigabe entfernen.',
      'Defekte Pumpe sofort tauschen, nicht weiterlaufen lassen.',
    ],
  },
  {
    key: 'lighting',
    name: 'Beleuchtung und Kühlkörper',
    category: 'Technik',
    elements: ['aluminium', 'zinc'],
    description: 'Unbeschichtete Aluminium-Kühlkörper über dem Becken korrodieren im Salznebel und tropfen ab.',
    checks: [
      'Kühlkörper auf weiße, pulvrige Korrosion prüfen.',
      'Abstand zur Wasseroberfläche erhöhen oder abdecken.',
    ],
  },
  {
    key: 'adhesives',
    name: 'Klebstoffe, Silikon und Kunststoffe',
    category: 'Material',
    elements: ['tin', 'zinc', 'titanium', 'antimony', 'bismuth'],
    description: 'Nicht aquarientaugliches Silikon, Kleber und Weichmacher lösen Zinn und Antimon als Stabilisatoren heraus.',
    checks: [
      'Nur ausdrücklich aquarientaugliche Kleber und Silikone verwenden.',
      'Neu verklebte Teile vor dem Einsetzen wässern.',
      'Zeitlichen Zusammenhang mit einem Umbau prüfen.',
    ],
  },
  {
    key: 'rock-sand',
    name: 'Gestein, Sand und Dekoration',
    category: 'Material',
    elements: ['barium', 'aluminium', 'arsenic', 'strontium', 'silicon'],
    description: 'Trockengestein und mineralische Dekoration lösen über Monate Barium, Aluminium und Silikat.',
    checks: [
      'Herkunft von neu eingebrachtem Gestein prüfen.',
      'Neues Material vor dem Einsetzen wässern und testen.',
    ],
  },
  {
    key: 'salt-mix',
    name: 'Salzmischung',
    category: 'Versorgung',
    elements: ['barium', 'boron', 'lithium', 'strontium', 'bromine', 'aluminium'],
    description: 'Jede Salzmarke hat ihr eigenes Spurenprofil. Ein Chargen- oder Markenwechsel verschiebt mehrere Werte gleichzeitig.',
    checks: [
      'Marke und Charge des aktuellen Salzes notieren.',
      'Frisch angesetztes Meerwasser als eigene Probe messen.',
      'Nach einem Salzwechsel engmaschiger kontrollieren.',
    ],
  },
  {
    key: 'supplements',
    name: 'Zusatzmittel und Spurenelemente',
    category: 'Versorgung',
    elements: ['iodine', 'lithium', 'vanadium', 'molybdenum', 'nickel', 'boron', 'bromine'],
    description: 'Überdosierte Spurenelementlösungen oder mehrere parallel laufende Systeme summieren sich unbemerkt auf.',
    checks: [
      'Alle laufenden Zusatzmittel auflisten und auf Überschneidungen prüfen.',
      'Nicht zwei Versorgungssysteme gleichzeitig fahren.',
      'Dosierpumpen kalibrieren.',
    ],
  },
  {
    key: 'food',
    name: 'Futter',
    category: 'Versorgung',
    elements: ['arsenic', 'cadmium', 'mercury', 'phosphate', 'phosphorus', 'nitrate'],
    description: 'Frost- und Trockenfutter tragen neben Nährstoffen auch Schwermetalle aus marinen Rohstoffen ein.',
    checks: [
      'Frostfutter abspülen und Auftauwasser verwerfen.',
      'Fütterungsmenge und Futtersorten dokumentieren.',
    ],
  },
  {
    key: 'coatings',
    name: 'Farben und Beschichtungen',
    category: 'Material',
    elements: ['titanium', 'lead', 'cadmium', 'zinc', 'silver'],
    description: 'Lackierte Unterschränke, beschichtete Abdeckungen und Pigmente geben bei Kontakt mit Salzwasser Metalle ab.',
    checks: [
      'Lackierte Flächen mit Spritzwasserkontakt prüfen.',
      'Silberhaltige Antibakterien-Beschichtungen ausschließen.',
    ],
  },
])

export const POLLUTANT_SOURCE_MAP = Object.freeze(Object.fromEntries(POLLUTANT_SOURCES.map((source) => [source.key, source])))

// Sources worth checking for the given elements, most matches first.
export function sourcesForElements(elementKeys = []) {
  const wanted = new Set(elementKeys)
  if (!wanted.size) return []
  return POLLUTANT_SOURCES
    .map((source) => ({ ...source, matches: source.elements.filter((key) => wanted.has(key)) }))
    .filter((source) => source.matches.length)
    .sort((a, b) => b.matches.length - a.matches.length || a.name.localeCompare(b.name, 'de'))
}

// Elements a report should hunt a source for: anything unwanted sitting above its window.
export function suspectElements(parameters = []) {
  return parameters
    .filter((parameter) => (parameter.groupKey === 'pollutants' || parameter.groupKey === 'trace') && (parameter.evaluation?.score ?? 5) >= 6)
    .map((parameter) => parameter.key)
}
