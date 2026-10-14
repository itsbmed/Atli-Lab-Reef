// Versorgungssystem eines Meerwasserbeckens.
// Wege: keine Versorgung, ATI Essentials, NYOS ION-B oder ein anderes Produkt –
// beim anderen Produkt zählt vor allem, auf wie viele Flaschen es sich verteilt.
// `supply_system` bleibt der lesbare Text, den Bericht und Dosierplan anzeigen.

export const SUPPLY_MODES = [
  { value: 'none', label: 'Keine Versorgung', description: 'Es wird nichts dosiert – nur Wasserwechsel.' },
  { value: 'ati', label: 'ATI Essentials', description: 'Zwei-Komponenten-System von ATI, passend zu den Empfehlungen.' },
  { value: 'nyos', label: 'NYOS ION-B', description: 'Zwei-Komponenten-System von NYOS, flüssig oder als Pulver.' },
  { value: 'other', label: 'Anderes Produkt', description: 'Ein Versorgungssystem eines anderen Herstellers.' },
]

// Nur beim fremden Produkt fragen wir nach der Zahl der Flaschen; ATI und NYOS sind bekannt.
export function asksForBottles(mode) {
  return mode === 'other'
}

// Bei ATI und NYOS wählt man die Produktlinie.
export function asksForLine(mode) {
  return mode === 'ati' || mode === 'nyos'
}

export const ATI_SUPPLY_LINES = ['Essentials SPS', 'Essentials Mixed Reef']

export const SUPPLY_BOTTLES = [
  { value: 1, label: '1 Flasche', description: 'All-in-One' },
  { value: 2, label: '2 Flaschen', description: 'KH und Calcium getrennt' },
  { value: 3, label: '3 Flaschen', description: 'Balling-Methode' },
]

export function supportsSupplySystem(waterType) {
  return waterType === 'Meerwasser'
}

export function describeSupply(form) {
  if (form.supply_mode === 'none') return 'Keine Versorgung'
  if (form.supply_mode === 'ati') return form.supply_line ? `ATI ${form.supply_line}` : 'ATI Essentials'
  if (form.supply_mode === 'nyos') return form.supply_line ? `NYOS ${form.supply_line}` : 'NYOS ION-B'
  if (asksForBottles(form.supply_mode)) {
    const bottles = SUPPLY_BOTTLES.find((option) => option.value === form.supply_bottles)
    const parts = [form.supply_product?.trim() || 'Anderes Produkt']
    if (bottles) parts.push(`${bottles.label} (${bottles.description})`)
    return parts.join(' · ')
  }
  return ''
}

// Teile des Versorgungssystems, wie die Auswertung (V2.2, „Vers. Sys. Teile“) sie zählt:
// 0 = keines, 1 = All-in-one, 2 = KH und Ca/Mg getrennt, 3 = KH, Ca und Mg getrennt.
// Ohne Angabe: null.
export function supplyParts(form) {
  if (form?.supply_mode === 'none') return 0
  // ATI Essentials und NYOS ION-B sind beide Zwei-Komponenten-Systeme.
  if (form?.supply_mode === 'ati' || form?.supply_mode === 'nyos') return 2
  if (asksForBottles(form?.supply_mode)) return [1, 2, 3].includes(Number(form.supply_bottles)) ? Number(form.supply_bottles) : null
  return null
}
