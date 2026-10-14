// NYOS-Produkte für das Versorgungssystem, von der offiziellen Herstellerseite
// nyos.info (Nyos Aquatics GmbH) übernommen, geprüft am 14.10.2026.
// NYOS hat keinen eigenen Shop – die Produktseiten führen zu den Händlern.
// Das Versorgungssystem ist die ION-B Methode: zwei Komponenten (CA/MG+ und ALK/PH+),
// wahlweise flüssig oder als Pulver zum Anmischen, dazu drei ION ELEMENTS mit Spurenelementen.

const SITE = 'https://www.nyos.info/de/ionb/'
const IMAGES = 'https://www.nyos.info/assets/img/produkte/'

export const NYOS_DEALER_URL = 'https://www.nyos.info/de/haendler'
export const NYOS_LINK_LABEL = 'Bei NYOS ansehen'

// Richtwert der Produktseite: 5–10 ml je 100 l und Tag.
export const NYOS_DAILY_ML_PER_100_LITERS = Object.freeze([5, 10])

export const NYOS_SUPPLY_LINES = Object.freeze([
  {
    key: 'ION-B liquid',
    label: 'ION-B liquid',
    description: 'Gebrauchsfertig in Kanistern zu 2.000 und 5.000 ml',
    parts: [
      { key: 'calcium', name: 'ION-B CA/MG+ liquid', note: 'erhöht Calcium und Magnesium', url: `${SITE}ion-b-ca-mg-liquid`, image: `${IMAGES}ION_Elements_Ca_Mg_Liquid_5000ml_800x942_white.jpg` },
      { key: 'kh', name: 'ION-B ALK/PH+ liquid', note: 'erhöht Alkalinität und pH-Wert', url: `${SITE}ion-b-alk-ph-liquid`, image: `${IMAGES}ION_Elements_ALK_PH_Liquid_5000ml_800x942_white.jpg` },
    ],
  },
  {
    key: 'ION-B powder mix',
    label: 'ION-B powder mix',
    description: 'Pulver zum Anmischen mit Osmosewasser',
    parts: [
      { key: 'calcium', name: 'ION-B CA/MG+ powder mix', note: 'erhöht Calcium und Magnesium', url: `${SITE}ion-b-ca-mg-powder`, image: `${IMAGES}ION_B_CA_MG_Powder_800x942_white.jpg` },
      { key: 'kh', name: 'ION-B ALK/PH+ powder mix', note: 'erhöht Alkalinität und pH-Wert', url: `${SITE}ion-b-alk-ph-powder-mix`, image: `${IMAGES}ION_B_ALK_PH_Powder_800x942_white.jpg` },
    ],
  },
])

export const NYOS_ION_ELEMENTS = Object.freeze([
  { key: 'ion-elements-1', name: 'ION ELEMENTS 1 CA/MG', note: 'Molybdän, Rubidium, Strontium', url: `${SITE}ion-elements-1`, image: `${IMAGES}ION_Elements_1_800x942_white.jpg` },
  { key: 'ion-elements-2', name: 'ION ELEMENTS 2 CA/MG', note: 'Chrom, Eisen, Kobalt, Kupfer, Mangan, Nickel, Vanadium, Zink', url: `${SITE}ion-elements-2-ca-mg`, image: `${IMAGES}ION_Elements_2_800x942_white.jpg` },
  { key: 'ion-elements-3', name: 'ION ELEMENTS 3 ALK/PH', note: 'Fluor, Iod, Kalium, Selen', url: `${SITE}ion-elements-3-alk-ph`, image: `${IMAGES}ION_Elements_3_800x942_white.jpg` },
])

export function nyosLine(key) {
  return NYOS_SUPPLY_LINES.find((line) => line.key === key) || null
}

// Für die Empfehlung „Elementversorgung anpassen“: die beiden Komponenten der gewählten
// Form, bei Bedarf die ION ELEMENTS; die andere Form bleibt als Alternative erreichbar.
// Ohne gewählte Form zeigen wir die gebrauchsfertige Variante.
export function nyosRecommendation(lineKey = '', { trace = false } = {}) {
  const line = nyosLine(lineKey) || NYOS_SUPPLY_LINES[0]
  const other = NYOS_SUPPLY_LINES.find((item) => item !== line)
  return {
    line,
    products: [...line.parts, ...(trace ? NYOS_ION_ELEMENTS : [])],
    alternatives: [...other.parts.map(({ name, url }) => ({ name, url })), { name: 'NYOS Händler finden', url: NYOS_DEALER_URL }],
  }
}
