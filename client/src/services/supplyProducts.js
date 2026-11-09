import { essentialsFor } from './atiProductCatalog.js'
import { NYOS_ION_ELEMENTS, NYOS_LINK_LABEL, nyosLine, NYOS_SUPPLY_LINES } from './nyosProductCatalog.js'

// Welches Produkt hinter einem Kanal der täglichen Versorgung steht. Kanäle kommen aus
// der Empfehlung „Elementversorgung anpassen“: kh, calcium (bei zwei Teilen Ca/Mg),
// magnesium, all (All-in-one) und trace (Spurenelemente, gesteuert über Zink).
// Ohne gewähltes System gilt wie bei den Produktvorschlägen die ATI-Linie zum Beckentyp;
// ein fremdes System und „keine Versorgung“ haben kein Produkt von uns. Einzelne ICP-Elemente
// gehören nicht zum Versorgungssystem, ein Kanal ohne Flasche der Linie bleibt ohne Produkt.
export function supplyChannelProduct(channel, { mode = '', line = '', aquariumType = '' } = {}) {
  if (mode === 'other' || mode === 'none') return null
  if (mode === 'nyos') {
    const parts = (nyosLine(line) || NYOS_SUPPLY_LINES[0]).parts
    if (channel === 'trace') {
      // ION ELEMENTS 2 trägt das Zink, nach dem sich die Spurenelemente richten.
      const zinc = NYOS_ION_ELEMENTS.find((item) => item.key === 'ion-elements-2')
      return { name: zinc.name, url: zinc.url, image: zinc.image, linkLabel: NYOS_LINK_LABEL }
    }
    const part = parts.find((item) => item.key === channel)
    return part ? { name: part.name, url: part.url, image: part.image, linkLabel: NYOS_LINK_LABEL } : null
  }
  const essentials = essentialsFor(aquariumType, mode === 'ati' ? line : '')
  const component = essentials.components.find((item) => item.key === channel)
  if (component) {
    // „Essentials SPS #1 (KH)“ statt „Essentials SPS #1 KH 2.700ml“: die Flasche, nicht das Gebinde.
    const name = channel === 'kh' ? `${essentials.label} #1 (KH)` : `${essentials.label} #2 (Ca/Mg)`
    return { name, url: component.url, image: component.image }
  }
  return null
}
