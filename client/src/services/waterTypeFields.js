export const WATER_TYPES = ['Meerwasser', 'Süßwasser', 'Osmosewasser', 'Meersalz', 'Aquakultur']

const targetMode = {
  key: 'target_mode',
  label: 'Auswertungsgrundlage',
  type: 'select',
  model: 'target_mode',
  options: [
    { value: 'ati', label: 'ATI Empfehlung' },
    { value: 'natural', label: 'Natürliches Wasser' },
    { value: 'custom', label: 'Eigene Zielwerte' },
  ],
}

const aquariumType = {
  key: 'aquarium_type',
  label: 'Aquarium',
  type: 'select',
  model: 'aquarium_type',
  options: ['Produkt/Custom', 'Mischbecken', 'SPS', 'LPS', 'Weichkorallen', 'Fischbecken', 'Pflanzenaquarium', 'Zuchtanlage'],
}

const dimensions = { key: 'dimensions', label: 'Abmessungen', model: 'dimensions', placeholder: '120×50×50 cm' }
const favorites = { key: 'favorite_elements', label: 'Favoriten', model: 'water_details.favorite_elements', placeholder: 'Elemente, z. B. Iod, Kalium, PO4' }
const livestock = { key: 'livestock', label: 'Besatz', model: 'water_details.livestock', placeholder: 'Korallen, Fische, Pflanzen...' }
const stockingDensity = {
  key: 'stocking_density',
  label: 'Besatzdichte',
  type: 'select',
  model: 'stocking_density',
  options: ['Gering', 'Mittel', 'Hoch'],
}
const runningSince = { key: 'running_since', label: 'Standzeit / läuft seit', model: 'water_details.running_since', placeholder: 'z. B. März 2025' }
const lightingType = {
  key: 'lighting_type',
  label: 'Lichtquelle',
  type: 'select',
  model: 'lighting_type',
  options: ['LED', 'T5', 'Hybrid', 'HQI', 'Sonstige'],
}
const lightProduct = { key: 'light_product', label: 'Beleuchtung Produkt', model: 'water_details.light_product' }
const lightCount = { key: 'light_count', label: 'Anzahl Leuchten', type: 'number', model: 'water_details.light_count' }
const lightDuration = { key: 'lighting_duration', label: 'Beleuchtungsdauer', model: 'water_details.lighting_duration', placeholder: 'z. B. 10 h' }
const lightPause = { key: 'lighting_pause', label: 'Pause?', type: 'checkbox', model: 'water_details.lighting_pause' }

export const WATER_TYPE_FIELDSETS = {
  Meerwasser: [
    { title: 'Auswertung', fields: [targetMode, favorites] },
    { title: 'Aquarium', fields: [aquariumType, dimensions] },
    { title: 'Ökodata', fields: [livestock, stockingDensity, runningSince] },
    { title: 'Dekoration', fields: [
      { key: 'decoration_type', label: 'Dekoration', model: 'water_details.decoration_type', placeholder: 'Lebendgestein, Totgestein...' },
      { key: 'decoration_kg', label: 'Menge in kg', type: 'number', model: 'water_details.decoration_kg' },
    ] },
    { title: 'Strömung', fields: [
      { key: 'flow_pump_count', label: 'Strömungspumpen Anzahl', type: 'number', model: 'water_details.flow_pump_count' },
      { key: 'flow_total_lh', label: 'Gesamtleistung l/h', type: 'number', model: 'water_details.flow_total_lh' },
      { key: 'flow_products', label: 'Produkte', model: 'water_details.flow_products' },
    ] },
    { title: 'Versorgung', fields: [
      { key: 'supply_system', label: 'Versorgungssystem', model: 'supply_system' },
      { key: 'trace_mix', label: 'Spurenmix/e', model: 'water_details.trace_mix' },
      { key: 'single_elements', label: 'Einzelelemente', model: 'water_details.single_elements', placeholder: 'Multi-Select später: Elemente eintragen' },
    ] },
    { title: 'Beleuchtung', fields: [lightingType, lightProduct, lightCount, lightDuration, lightPause] },
    { title: 'Ablegerbecken', fields: [
      { key: 'frag_tank', label: 'Ablegerbecken angeschlossen?', type: 'checkbox', model: 'water_details.frag_tank' },
      { key: 'frag_tank_volume', label: 'Liter / Abmessungen', model: 'water_details.frag_tank_volume', showWhen: { model: 'water_details.frag_tank', equals: true } },
      { key: 'frag_stone_material', label: 'Material Ablegersteine', model: 'water_details.frag_stone_material', showWhen: { model: 'water_details.frag_tank', equals: true } },
    ] },
    { title: 'Technikbecken', fields: [
      { key: 'sump', label: 'Technikbecken', type: 'checkbox', model: 'sump' },
      { key: 'sump_product', label: 'Produkt / Custom', model: 'water_details.sump_product', showWhen: { model: 'sump', equals: true } },
      { key: 'sump_volume', label: 'Liter / Abmessungen', model: 'water_details.sump_volume', showWhen: { model: 'sump', equals: true } },
      { key: 'return_pump_lh', label: 'Rückförderpumpe Leistung l/h', type: 'number', model: 'water_details.return_pump_lh', showWhen: { model: 'sump', equals: true } },
      { key: 'return_pump_product', label: 'Rückförderpumpe Produkt', model: 'water_details.return_pump_product', showWhen: { model: 'sump', equals: true } },
    ] },
    { title: 'Filter & Medien', fields: [
      { key: 'skimmer', label: 'Eiweißabschäumer', type: 'checkbox', model: 'skimmer' },
      { key: 'skimmer_model', label: 'Produkt', model: 'skimmer_model', showWhen: { model: 'skimmer', equals: true } },
      { key: 'skimmer_air_lh', label: 'Leistung l/h Luft', type: 'number', model: 'water_details.skimmer_air_lh', showWhen: { model: 'skimmer', equals: true } },
      { key: 'media_filter', label: 'Medienfilter', type: 'checkbox', model: 'water_details.media_filter' },
      { key: 'media_filter_product', label: 'Medienfilter Produkt', model: 'water_details.media_filter_product', showWhen: { model: 'water_details.media_filter', equals: true } },
      { key: 'activated_carbon', label: 'Aktivkohle', type: 'select', model: 'water_details.activated_carbon', options: ['Nein', 'regelmässig', 'sporadisch'] },
      { key: 'activated_carbon_product', label: 'Aktivkohle Produkt', model: 'water_details.activated_carbon_product' },
      { key: 'activated_carbon_amount', label: 'Aktivkohle Menge', model: 'water_details.activated_carbon_amount' },
      { key: 'po4_adsorber', label: 'PO4 Adsorber', type: 'select', model: 'water_details.po4_adsorber', options: ['Nein', 'regelmässig', 'sporadisch'] },
      { key: 'po4_adsorber_type', label: 'Typ: Eisen / Alu', model: 'water_details.po4_adsorber_type' },
      { key: 'po4_adsorber_product', label: 'PO4 Produkt', model: 'water_details.po4_adsorber_product' },
      { key: 'po4_adsorber_amount', label: 'PO4 Menge', model: 'water_details.po4_adsorber_amount' },
      { key: 'zeolite', label: 'Zeolith', type: 'checkbox', model: 'water_details.zeolite' },
      { key: 'zeolite_product', label: 'Zeolith Produkt', model: 'water_details.zeolite_product', showWhen: { model: 'water_details.zeolite', equals: true } },
      { key: 'refugium', label: 'Algenrefugium', type: 'checkbox', model: 'refugium' },
      { key: 'refugium_location', label: 'intern / extern', model: 'water_details.refugium_location', showWhen: { model: 'refugium', equals: true } },
      { key: 'refugium_species', label: 'Art / Arten', model: 'water_details.refugium_species', showWhen: { model: 'refugium', equals: true } },
      { key: 'other_media', label: 'Sonstiges', model: 'water_details.other_media', placeholder: 'z. B. Polyfilter' },
    ] },
  ],
  Süßwasser: [
    { title: 'Auswertung', fields: [targetMode, favorites] },
    { title: 'Aquarium', fields: [aquariumType, dimensions] },
    { title: 'Ökodata', fields: [livestock, stockingDensity, runningSince] },
    { title: 'CO2 & Versorgung', fields: [
      { key: 'co2_system', label: 'CO2 Anlage?', type: 'checkbox', model: 'water_details.co2_system' },
      { key: 'npk_fertilizer', label: 'NPK Dünger', model: 'water_details.npk_fertilizer' },
      { key: 'element_additives', label: 'Elementzusätze', model: 'water_details.element_additives' },
    ] },
    { title: 'Beleuchtung', fields: [lightingType, lightProduct, lightCount, lightDuration, lightPause] },
    { title: 'Filter', fields: [
      { key: 'filter_type', label: 'Innen-/Außenfilter/Technikbecken', type: 'select', model: 'water_details.filter_type', options: ['Innenfilter', 'Außenfilter', 'Technikbecken', 'Sonstige'] },
      { key: 'filter_product', label: 'Produkt', model: 'water_details.filter_product' },
      { key: 'filter_size', label: 'Größe', model: 'water_details.filter_size' },
      { key: 'filter_flow_lh', label: 'Leistung l/h', type: 'number', model: 'water_details.filter_flow_lh' },
    ] },
    { title: 'Filtermedien', fields: [
      { key: 'activated_carbon', label: 'Aktivkohle', type: 'select', model: 'water_details.activated_carbon', options: ['Nein', 'regelmässig', 'sporadisch'] },
      { key: 'activated_carbon_product', label: 'Produkt', model: 'water_details.activated_carbon_product' },
      { key: 'activated_carbon_amount', label: 'Menge', model: 'water_details.activated_carbon_amount' },
      { key: 'po4_adsorber', label: 'PO4 Adsorber', type: 'select', model: 'water_details.po4_adsorber', options: ['Nein', 'regelmässig', 'sporadisch'] },
      { key: 'po4_adsorber_type', label: 'Typ: Eisen / Alu', model: 'water_details.po4_adsorber_type' },
      { key: 'po4_adsorber_product', label: 'Produkt', model: 'water_details.po4_adsorber_product' },
      { key: 'po4_adsorber_amount', label: 'Menge', model: 'water_details.po4_adsorber_amount' },
      { key: 'other_media', label: 'Sonstiges', model: 'water_details.other_media', placeholder: 'z. B. Polyfilter' },
    ] },
  ],
  Osmosewasser: [
    { title: 'Osmoseanlage', fields: [
      { key: 'ro_product', label: 'Produkt', model: 'water_details.ro_product' },
      { key: 'ro_capacity_lpd', label: 'Leistung l/Tag', type: 'number', model: 'water_details.ro_capacity_lpd' },
      { key: 'resin_filter', label: 'Harzfilter', type: 'checkbox', model: 'water_details.resin_filter' },
      { key: 'resin_product', label: 'Harzfilter Produkt', model: 'water_details.resin_product', showWhen: { model: 'water_details.resin_filter', equals: true } },
      { key: 'resin_volume_l', label: 'Harzfilter Volumen in l', type: 'number', model: 'water_details.resin_volume_l', showWhen: { model: 'water_details.resin_filter', equals: true } },
    ] },
    { title: 'Vorratstank', fields: [
      { key: 'storage_tank', label: 'Vorratstank', type: 'checkbox', model: 'water_details.storage_tank' },
      { key: 'storage_volume_l', label: 'Volumen in l', type: 'number', model: 'water_details.storage_volume_l', showWhen: { model: 'water_details.storage_tank', equals: true } },
    ] },
  ],
  Meersalz: [
    { title: 'Produkt', fields: [
      { key: 'salt_product', label: 'Produkt', model: 'water_details.salt_product' },
      targetMode,
      favorites,
    ] },
  ],
  Aquakultur: [
    { title: 'Auswertung', fields: [targetMode, favorites] },
    { title: 'Ökodata', fields: [livestock, stockingDensity] },
  ],
}

export function ensureWaterTypeDetails(form) {
  if (!form.water_details || typeof form.water_details !== 'object') form.water_details = {}
  return form
}
