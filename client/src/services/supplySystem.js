// Versorgungssystem eines Meerwasserbeckens.
// Drei Wege: keine Versorgung, ATI Essentials oder ein anderes Produkt –
// beim anderen Produkt zählt vor allem, auf wie viele Flaschen es sich verteilt.
// `supply_system` bleibt der lesbare Text, den Bericht und Dosierplan anzeigen.

export const SUPPLY_MODES = [
  { value: 'none', label: 'Keine Versorgung', description: 'Es wird nichts dosiert – nur Wasserwechsel.' },
  { value: 'ati', label: 'ATI Essentials', description: 'Zwei-Komponenten-System von ATI, passend zu den Empfehlungen.' },
  { value: 'other', label: 'Anderes Produkt', description: 'Ein Versorgungssystem eines anderen Herstellers.' },
]

export const ATI_SUPPLY_LINES = ['Essentials Pro', 'Essentials SPS', 'Essentials Mixed Reef']

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
  if (form.supply_mode === 'other') {
    const bottles = SUPPLY_BOTTLES.find((option) => option.value === form.supply_bottles)
    const parts = [form.supply_product?.trim() || 'Anderes Produkt']
    if (bottles) parts.push(`${bottles.label} (${bottles.description})`)
    return parts.join(' · ')
  }
  return ''
}
