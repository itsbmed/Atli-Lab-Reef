export const WATER_TYPES = ['Meerwasser', 'Süßwasser', 'Osmosewasser', 'Meersalz', 'Aquakultur']

// Karten für die Wassertyp-Auswahl: Kurzbeschreibung und Farbton (wie die Badges in der Liste).
export const WATER_TYPE_CARDS = [
  { value: 'Meerwasser', tone: 'sea', description: 'Riff- oder Fischbecken mit Salzwasser' },
  { value: 'Süßwasser', tone: 'fresh', description: 'Gesellschafts-, Pflanzen- oder Zuchtbecken' },
  { value: 'Osmosewasser', tone: 'osmo', description: 'Reines RO/DI-Wasser aus der Osmoseanlage' },
  { value: 'Meersalz', tone: 'salt', description: 'Frisch angesetztes Salzwasser prüfen' },
  { value: 'Aquakultur', tone: 'aqua', description: 'Zucht- und Hälterungsanlagen' },
]

// Auswahl für Favoriten und Einzelelemente; gespeichert wird wie bisher ein kommagetrennter Text.
export const ELEMENT_OPTIONS = ['Iod', 'Kalium', 'Strontium', 'Magnesium', 'Calcium', 'Bor', 'Fluor', 'Eisen', 'Mangan', 'Zink', 'Molybdän', 'Barium', 'Lithium', 'Nitrat', 'Phosphat']

const targetMode = {
  key: 'target_mode',
  label: 'Zielwerte',
  hint: 'Gegen welche Zielwerte die Messwerte verglichen werden.',
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
const favorites = { key: 'favorite_elements', label: 'Favoriten', type: 'tags', model: 'water_details.favorite_elements', options: ELEMENT_OPTIONS, hint: 'Diese Elemente heben wir im Bericht hervor.' }
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
const lightPause = { key: 'lighting_pause', label: 'Beleuchtungspause', type: 'checkbox', model: 'water_details.lighting_pause' }

export const WATER_TYPE_FIELDSETS = {
  Meerwasser: [
    { title: 'Auswertung', fields: [targetMode, favorites] },
    { title: 'Aquarium', fields: [aquariumType, dimensions] },
    { title: 'Ökodata', fields: [livestock, stockingDensity, runningSince] },
    { title: 'Dekoration', fields: [
      { key: 'decoration_type', label: 'Dekoration', model: 'water_details.decoration_type', placeholder: 'Lebendgestein, Totgestein...' },
      { key: 'decoration_kg', label: 'Menge', type: 'number', unit: 'kg', model: 'water_details.decoration_kg' },
    ] },
    { title: 'Strömung', fields: [
      { key: 'flow_pump_count', label: 'Anzahl Pumpen', type: 'number', model: 'water_details.flow_pump_count' },
      { key: 'flow_total_lh', label: 'Gesamtleistung', type: 'number', unit: 'l/h', model: 'water_details.flow_total_lh' },
      { key: 'flow_products', label: 'Produkte', model: 'water_details.flow_products' },
    ] },
    { title: 'Spurenelemente & Zusätze', fields: [
      { key: 'trace_mix', label: 'Spurenmix/e', model: 'water_details.trace_mix' },
      { key: 'single_elements', label: 'Einzelelemente', type: 'tags', model: 'water_details.single_elements', options: ELEMENT_OPTIONS },
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
      { key: 'return_pump_lh', label: 'Rückförderpumpe Leistung', type: 'number', unit: 'l/h', model: 'water_details.return_pump_lh', showWhen: { model: 'sump', equals: true } },
      { key: 'return_pump_product', label: 'Rückförderpumpe Produkt', model: 'water_details.return_pump_product', showWhen: { model: 'sump', equals: true } },
    ] },
    { title: 'Filter & Medien', fields: [
      { key: 'skimmer', label: 'Eiweißabschäumer', type: 'checkbox', model: 'skimmer' },
      { key: 'skimmer_model', label: 'Produkt', model: 'skimmer_model', showWhen: { model: 'skimmer', equals: true } },
      { key: 'skimmer_air_lh', label: 'Luftleistung', type: 'number', unit: 'l/h', model: 'water_details.skimmer_air_lh', showWhen: { model: 'skimmer', equals: true } },
      { key: 'media_filter', label: 'Medienfilter', type: 'checkbox', model: 'water_details.media_filter' },
      { key: 'media_filter_product', label: 'Medienfilter Produkt', model: 'water_details.media_filter_product', showWhen: { model: 'water_details.media_filter', equals: true } },
      { key: 'activated_carbon', label: 'Aktivkohle', type: 'select', model: 'water_details.activated_carbon', options: ['Nein', 'regelmässig', 'sporadisch'] },
      { key: 'activated_carbon_product', label: 'Aktivkohle Produkt', model: 'water_details.activated_carbon_product', showWhen: { model: 'water_details.activated_carbon', notIn: ['', 'Nein'] } },
      { key: 'activated_carbon_amount', label: 'Aktivkohle Menge', model: 'water_details.activated_carbon_amount', showWhen: { model: 'water_details.activated_carbon', notIn: ['', 'Nein'] } },
      { key: 'po4_adsorber', label: 'PO4 Adsorber', type: 'select', model: 'water_details.po4_adsorber', options: ['Nein', 'regelmässig', 'sporadisch'] },
      { key: 'po4_adsorber_type', label: 'PO4 Adsorber Typ', type: 'select', model: 'water_details.po4_adsorber_type', options: ['Eisen', 'Aluminium'], showWhen: { model: 'water_details.po4_adsorber', notIn: ['', 'Nein'] } },
      { key: 'po4_adsorber_product', label: 'PO4 Produkt', model: 'water_details.po4_adsorber_product', showWhen: { model: 'water_details.po4_adsorber', notIn: ['', 'Nein'] } },
      { key: 'po4_adsorber_amount', label: 'PO4 Menge', model: 'water_details.po4_adsorber_amount', showWhen: { model: 'water_details.po4_adsorber', notIn: ['', 'Nein'] } },
      { key: 'zeolite', label: 'Zeolith', type: 'checkbox', model: 'water_details.zeolite' },
      { key: 'zeolite_product', label: 'Zeolith Produkt', model: 'water_details.zeolite_product', showWhen: { model: 'water_details.zeolite', equals: true } },
      { key: 'refugium', label: 'Algenrefugium', type: 'checkbox', model: 'refugium' },
      { key: 'refugium_location', label: 'Lage', type: 'select', options: ['intern', 'extern'], model: 'water_details.refugium_location', showWhen: { model: 'refugium', equals: true } },
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
      { key: 'filter_flow_lh', label: 'Leistung', type: 'number', unit: 'l/h', model: 'water_details.filter_flow_lh' },
    ] },
    { title: 'Filtermedien', fields: [
      { key: 'activated_carbon', label: 'Aktivkohle', type: 'select', model: 'water_details.activated_carbon', options: ['Nein', 'regelmässig', 'sporadisch'] },
      { key: 'activated_carbon_product', label: 'Produkt', model: 'water_details.activated_carbon_product', showWhen: { model: 'water_details.activated_carbon', notIn: ['', 'Nein'] } },
      { key: 'activated_carbon_amount', label: 'Menge', model: 'water_details.activated_carbon_amount', showWhen: { model: 'water_details.activated_carbon', notIn: ['', 'Nein'] } },
      { key: 'po4_adsorber', label: 'PO4 Adsorber', type: 'select', model: 'water_details.po4_adsorber', options: ['Nein', 'regelmässig', 'sporadisch'] },
      { key: 'po4_adsorber_type', label: 'Typ: Eisen / Alu', model: 'water_details.po4_adsorber_type' },
      { key: 'po4_adsorber_product', label: 'Produkt', model: 'water_details.po4_adsorber_product', showWhen: { model: 'water_details.po4_adsorber', notIn: ['', 'Nein'] } },
      { key: 'po4_adsorber_amount', label: 'Menge', model: 'water_details.po4_adsorber_amount', showWhen: { model: 'water_details.po4_adsorber', notIn: ['', 'Nein'] } },
      { key: 'other_media', label: 'Sonstiges', model: 'water_details.other_media', placeholder: 'z. B. Polyfilter' },
    ] },
  ],
  Osmosewasser: [
    { title: 'Osmoseanlage', fields: [
      { key: 'ro_product', label: 'Produkt', model: 'water_details.ro_product' },
      { key: 'ro_capacity_lpd', label: 'Leistung', type: 'number', unit: 'l/Tag', model: 'water_details.ro_capacity_lpd' },
      { key: 'resin_filter', label: 'Harzfilter', type: 'checkbox', model: 'water_details.resin_filter' },
      { key: 'resin_product', label: 'Harzfilter Produkt', model: 'water_details.resin_product', showWhen: { model: 'water_details.resin_filter', equals: true } },
      { key: 'resin_volume_l', label: 'Harzfilter Volumen', type: 'number', unit: 'l', model: 'water_details.resin_volume_l', showWhen: { model: 'water_details.resin_filter', equals: true } },
    ] },
    { title: 'Vorratstank', fields: [
      { key: 'storage_tank', label: 'Vorratstank', type: 'checkbox', model: 'water_details.storage_tank' },
      { key: 'storage_volume_l', label: 'Volumen', type: 'number', unit: 'l', model: 'water_details.storage_volume_l', showWhen: { model: 'water_details.storage_tank', equals: true } },
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

export function waterTypeGroups(type) {
  return WATER_TYPE_FIELDSETS[type] || []
}

export function readWaterFieldValue(form, path) {
  if (path.startsWith('water_details.')) {
    return form.water_details?.[path.replace('water_details.', '')]
  }
  return form[path]
}

export function normalizeFieldOptions(options = []) {
  return options.map((option) => typeof option === 'string' ? { value: option, label: option } : option)
}

export function isWaterFieldVisible(form, field) {
  if (!field.showWhen) return true
  const value = readWaterFieldValue(form, field.showWhen.model)
  if (field.showWhen.notIn) return !field.showWhen.notIn.includes(value ?? '')
  return value === field.showWhen.equals
}

export function formatWaterFieldValue(form, field) {
  const value = readWaterFieldValue(form, field.model)
  if (field.type === 'checkbox') return value ? 'Ja' : ''
  if (value === null || value === undefined || value === '') return ''
  if (field.type === 'select') {
    return normalizeFieldOptions(field.options).find((option) => option.value === value)?.label || value
  }
  return field.unit ? `${value} ${field.unit}` : String(value)
}

export function waterTypeSummary(form) {
  return waterTypeGroups(form.water_type).flatMap((group) =>
    group.fields
      .filter((field) => isWaterFieldVisible(form, field))
      .map((field) => ({
        key: `${group.title}-${field.key}`,
        group: group.title,
        label: field.label,
        value: formatWaterFieldValue(form, field),
      }))
      .filter((item) => item.value)
  )
}

export function waterTypeCompletion(form) {
  const fields = waterTypeGroups(form.water_type).flatMap((group) => group.fields.filter((field) => isWaterFieldVisible(form, field)))
  const optionalBooleanFields = fields.filter((field) => field.type === 'checkbox')
  const answerableFields = fields.filter((field) => field.type !== 'checkbox')
  const answered = answerableFields.filter((field) => formatWaterFieldValue(form, field)).length + optionalBooleanFields.filter((field) => readWaterFieldValue(form, field.model)).length
  const total = answerableFields.length + optionalBooleanFields.length
  return {
    answered,
    total,
    percent: total ? Math.round((answered / total) * 100) : 0,
  }
}
