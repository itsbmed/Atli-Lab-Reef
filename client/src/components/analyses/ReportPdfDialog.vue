<template>
  <Teleport to="body">
    <Transition name="pdf" appear>
      <div v-if="open" class="pdf-backdrop" @mousedown.self="close">
        <div ref="dialog" :class="['pdf', { lite: !features.sections }]" role="dialog" aria-modal="true" aria-labelledby="pdf-title" @keydown="onKeydown">
          <!-- Kopf -->
          <header class="pdf-head">
            <span class="pdf-head-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M14 3v5h5" /><path d="M8.5 14.5h7M8.5 17.5h4.5" /></svg>
            </span>
            <div>
              <h2 id="pdf-title">PDF erstellen</h2>
              <p>{{ context.aquariumName }} · Bericht {{ context.reportNumber }}</p>
            </div>
            <button ref="closeButton" type="button" class="pdf-close" aria-label="Schließen" @click="close">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
            </button>
          </header>

          <div class="pdf-body">
            <!-- Einstellungen -->
            <div class="pdf-settings">
              <!-- Vorlage: alle drei oder vorerst nur der Kurzbericht (PDF_EXPORT_FEATURES) -->
              <section v-if="!features.presets" class="pdf-block" aria-labelledby="pdf-lite-title">
                <h3 id="pdf-lite-title">Vorlage</h3>
                <div :class="['pdf-preset', 'pdf-lite-card', startPreset.key, 'on']">
                  <span class="pdf-preset-art" aria-hidden="true">
                    <i v-for="n in Math.min(pages.length, 4)" :key="n"></i>
                  </span>
                  <span class="pdf-lite-copy">
                    <strong>{{ startPreset.label }}</strong>
                    <small>{{ startPreset.hint }} – die wichtigsten Punkte Ihres Berichts kompakt zusammengefasst.</small>
                  </span>
                  <b>{{ pages.length }} {{ pages.length === 1 ? 'Seite' : 'Seiten' }}</b>
                </div>
              </section>
              <section v-else class="pdf-block" aria-labelledby="pdf-presets">
                <h3 id="pdf-presets">Vorlage <em v-if="activePreset === 'custom'" class="pdf-custom">Eigene Auswahl</em></h3>
                <div class="pdf-presets" role="radiogroup" aria-labelledby="pdf-presets">
                  <button
                    v-for="preset in PDF_PRESETS"
                    :key="preset.key"
                    type="button"
                    role="radio"
                    :aria-checked="activePreset === preset.key"
                    :class="['pdf-preset', preset.key, { on: activePreset === preset.key, locked: !presetEnabled(preset.key) }]"
                    :disabled="!presetEnabled(preset.key)"
                    @click="applyPreset(preset.key)"
                  >
                    <span class="pdf-preset-art" aria-hidden="true">
                      <i v-for="n in presetPages[preset.key].art" :key="n"></i>
                    </span>
                    <strong>{{ preset.label }}</strong>
                    <small>{{ preset.hint }}</small>
                    <b>{{ presetPages[preset.key].count }} {{ presetPages[preset.key].count === 1 ? 'Seite' : 'Seiten' }}</b>
                  </button>
                </div>
              </section>

              <!-- Inhalt: einzeln schaltbar oder als Liste dessen, was die Vorlage enthält -->
              <section v-if="!features.sections" class="pdf-block" aria-labelledby="pdf-included">
                <h3 id="pdf-included">Enthalten</h3>
                <TransitionGroup tag="ul" name="inc" class="pdf-lite-list">
                  <li v-for="item in includedContents" :key="item.key" :class="item.key">
                    <span class="pdf-section-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path :d="ICONS[item.key]" /></svg></span>
                    <span><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span>
                    <i aria-hidden="true">✓</i>
                  </li>
                </TransitionGroup>
              </section>

              <section v-else class="pdf-block" aria-labelledby="pdf-content">
                <h3 id="pdf-content">Inhalt</h3>
                <ul class="pdf-sections">
                  <li
                    v-for="section in sections"
                    :key="section.key"
                    :class="['pdf-section', section.key, { on: settings.sections[section.key], off: !selectable[section.key] }]"
                  >
                    <div class="pdf-section-row">
                      <span class="pdf-section-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path :d="ICONS[section.key]" /></svg></span>
                      <span class="pdf-section-copy">
                        <strong>{{ section.label }} <small v-if="section.count">{{ section.count }}</small></strong>
                        <span>{{ selectable[section.key] ? section.hint : available[section.key] ? section.blocked : section.missing }}</span>
                      </span>
                      <span v-if="section.locked" class="pdf-locked">Immer dabei</span>
                      <button
                        v-else
                        type="button"
                        role="switch"
                        :class="['pdf-switch', { on: settings.sections[section.key] }]"
                        :aria-checked="settings.sections[section.key]"
                        :aria-label="section.label"
                        :disabled="!selectable[section.key]"
                        @click="toggleSection(section.key)"
                      ><i></i></button>
                    </div>

                    <!-- Feineinstellungen je Bereich -->
                    <div v-if="settings.sections[section.key] && section.key === 'values'" class="pdf-options">
                      <div class="pdf-option">
                        <span>Welche Werte?</span>
                        <div class="pdf-seg">
                          <button type="button" :class="{ on: settings.values.scope === 'all' }" @click="settings.values.scope = 'all'">Alle <small>{{ countValues('all') }}</small></button>
                          <button type="button" :class="{ on: settings.values.scope === 'issues' }" @click="settings.values.scope = 'issues'">Nur auffällige <small>{{ countValues('issues') }}</small></button>
                        </div>
                      </div>
                      <div class="pdf-option wide">
                        <span>Gruppen</span>
                        <div class="pdf-chips">
                          <button
                            v-for="group in context.groups"
                            :key="group.key"
                            type="button"
                            :class="['pdf-chip', { on: settings.values.groups.includes(group.key) }]"
                            :aria-pressed="settings.values.groups.includes(group.key)"
                            @click="toggleGroup(group.key)"
                          >
                            <i aria-hidden="true">✓</i>{{ group.label }}
                            <small>{{ settings.values.scope === 'issues' ? group.issueCount : group.total }}</small>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div v-if="settings.sections[section.key] && section.key === 'osmosis'" class="pdf-options">
                      <div class="pdf-option">
                        <span>Welche Werte?</span>
                        <div class="pdf-seg">
                          <button type="button" :class="{ on: settings.osmosis.scope === 'all' }" @click="settings.osmosis.scope = 'all'">Alle <small>{{ context.osmosisCount }}</small></button>
                          <button type="button" :class="{ on: settings.osmosis.scope === 'found' }" @click="settings.osmosis.scope = 'found'">Nur Funde <small>{{ context.osmosisFound }}</small></button>
                        </div>
                      </div>
                    </div>

                    <div v-if="settings.sections[section.key] && section.key === 'charts'" class="pdf-options">
                      <div class="pdf-option wide">
                        <span>Welche Diagramme?</span>
                        <div class="pdf-chips">
                          <button
                            v-for="chart in CHARTS.filter((item) => context.charts?.[item.key])"
                            :key="chart.key"
                            type="button"
                            :class="['pdf-chip', { on: settings.charts[chart.key] }]"
                            :aria-pressed="settings.charts[chart.key]"
                            @click="toggleChart(chart.key)"
                          ><i aria-hidden="true">✓</i>{{ chart.label }}</button>
                        </div>
                      </div>
                    </div>

                    <div v-if="settings.sections[section.key] && section.key === 'recommendations' && context.recommendationCount !== context.openRecommendationCount" class="pdf-options">
                      <label class="pdf-check">
                        <input v-model="settings.recommendations.hideDone" type="checkbox" />
                        <span>Erledigte Maßnahmen weglassen <small>{{ context.recommendationCount - context.openRecommendationCount }} erledigt</small></span>
                      </label>
                    </div>

                    <div v-if="settings.sections[section.key] && section.key === 'dosing'" class="pdf-options">
                      <label class="pdf-check">
                        <input v-model="settings.dosing.checkboxes" type="checkbox" />
                        <span>Kästchen zum Abhaken je Tag</span>
                      </label>
                    </div>
                  </li>
                </ul>
              </section>

              <section v-if="features.format" class="pdf-block" aria-labelledby="pdf-format">
                <h3 id="pdf-format">Format</h3>
                <div class="pdf-format">
                  <div class="pdf-option">
                    <span>Papier</span>
                    <div class="pdf-seg">
                      <button type="button" :class="{ on: settings.format.orientation === 'portrait' }" @click="settings.format.orientation = 'portrait'"><i class="pdf-paper" aria-hidden="true"></i>Hochformat</button>
                      <button type="button" :class="{ on: settings.format.orientation === 'landscape' }" @click="settings.format.orientation = 'landscape'"><i class="pdf-paper wide" aria-hidden="true"></i>Querformat</button>
                    </div>
                  </div>
                  <div class="pdf-option">
                    <span>Farbe</span>
                    <div class="pdf-seg">
                      <button type="button" :class="{ on: settings.format.color === 'color' }" @click="settings.format.color = 'color'"><i class="pdf-swatch" aria-hidden="true"></i>Farbig</button>
                      <button type="button" :class="{ on: settings.format.color === 'eco' }" @click="settings.format.color = 'eco'"><i class="pdf-swatch eco" aria-hidden="true"></i>Druckerfreundlich</button>
                    </div>
                  </div>
                  <label v-if="features.details" class="pdf-check">
                    <input v-model="settings.format.aquarium" type="checkbox" />
                    <span>Aquariumdaten zeigen <small>Volumen und Versorgungssystem</small></span>
                  </label>
                  <label v-if="features.details" class="pdf-check">
                    <input v-model="settings.format.barcode" type="checkbox" />
                    <span>Barcode und Probennummer zeigen</span>
                  </label>
                </div>
              </section>

              <section v-if="features.note" class="pdf-block" aria-labelledby="pdf-note">
                <h3 id="pdf-note">Persönliche Notiz <small>optional</small></h3>
                <div class="pdf-note">
                  <textarea id="pdf-note-input" v-model="settings.note" :maxlength="PDF_NOTE_LIMIT" rows="3" placeholder="Erscheint auf dem Deckblatt – z. B. „Für die Beratung bei meinem Händler am Freitag“."></textarea>
                  <small :class="{ near: settings.note.length > PDF_NOTE_LIMIT - 30 }">{{ settings.note.length }} / {{ PDF_NOTE_LIMIT }}</small>
                </div>
              </section>
            </div>

            <!-- Vorschau -->
            <aside class="pdf-preview" aria-label="Vorschau der Seiten">
              <div class="pdf-preview-head">
                <strong>Vorschau</strong>
                <span>{{ pages.length }} {{ pages.length === 1 ? 'Seite' : 'Seiten' }} · A4 {{ settings.format.orientation === 'portrait' ? 'hoch' : 'quer' }}</span>
              </div>
              <TransitionGroup tag="ol" name="pp" :class="['pdf-pages', settings.format.orientation, { eco: settings.format.color === 'eco' }]">
                <li v-for="(page, index) in pages" :key="page.id" :class="['pp', page.section, page.chart]">
                  <div class="pp-sheet" aria-hidden="true">
                    <!-- Deckblatt -->
                    <template v-if="page.section === 'cover'">
                      <span class="pp-band"><b>ATI</b><i></i></span>
                      <span class="pp-ring" :style="{ '--score': `${(context.score ?? 0) * 3.6}deg` }"><b>{{ context.score ?? '–' }}</b></span>
                      <span class="pp-title">{{ context.aquariumName }}</span>
                      <span class="pp-lines"><i></i><i class="short"></i></span>
                      <span v-if="settings.format.aquarium || settings.format.barcode" class="pp-meta">
                        <i v-if="settings.format.aquarium"></i><i v-if="settings.format.barcode" class="code"></i>
                      </span>
                      <span v-if="page.note" class="pp-sticky">{{ settings.note }}</span>
                    </template>
                    <!-- Messwerte und Osmose: kompakte Tabelle in zwei Spalten wie unter „Alle Werte“ -->
                    <template v-else-if="page.section === 'values' || page.section === 'osmosis'">
                      <span class="pp-h"></span>
                      <span class="pp-tables">
                        <span v-for="block in 2" :key="block" class="pp-block">
                          <i class="pp-block-head"></i>
                          <span v-for="n in 7" :key="n" :class="['pp-trow', page.section === 'osmosis' ? (block === 1 && n === 3 ? 'critical' : 'clean') : ROW_TONES[(n + block * 2) % ROW_TONES.length]]"><i></i><b></b></span>
                        </span>
                      </span>
                    </template>
                    <!-- Diagramme -->
                    <template v-else-if="page.chart === 'composition'">
                      <span class="pp-h"></span>
                      <span class="pp-chart">
                        <i class="band"></i>
                        <b v-for="(y, n) in [48, 52, 46, 50, 49, 55, 40, 34]" :key="n" :class="{ warn: n > 5 }" :style="{ left: `${8 + n * 12}%`, bottom: `${y}%` }"></b>
                      </span>
                      <span class="pp-lines"><i></i><i class="short"></i></span>
                    </template>
                    <template v-else-if="page.chart === 'pairs'">
                      <span class="pp-h"></span>
                      <span v-for="n in 6" :key="n" class="pp-gauge"><i :style="{ left: `${[46, 58, 50, 72, 41, 52][n - 1]}%` }"></i></span>
                    </template>
                    <!-- Empfehlungen -->
                    <template v-else-if="page.section === 'recommendations'">
                      <span class="pp-h"></span>
                      <span v-for="n in 3" :key="n" class="pp-card"><i></i><b></b><b class="short"></b></span>
                    </template>
                    <!-- Dosierplan -->
                    <template v-else-if="page.section === 'dosing'">
                      <span class="pp-h"></span>
                      <span class="pp-grid">
                        <i v-for="n in 28" :key="n" :class="{ box: page.checkboxes && n % 7 !== 1 && (n % 7) < 5, label: n % 7 === 1 }"></i>
                      </span>
                    </template>
                    <!-- Produkte -->
                    <template v-else>
                      <span class="pp-h"></span>
                      <span class="pp-products"><i v-for="n in 4" :key="n"><b></b></i></span>
                    </template>
                  </div>
                  <small><b>{{ index + 1 }}</b>{{ page.title }}</small>
                </li>
              </TransitionGroup>
            </aside>
          </div>

          <!-- Fuß -->
          <footer class="pdf-foot">
            <label v-if="features.remember" class="pdf-remember">
              <input v-model="remember" type="checkbox" />
              Auswahl für das nächste Mal merken
            </label>
            <p v-if="status === 'done'" class="pdf-status" role="status">Einstellungen übernommen – die PDF-Erstellung wird mit dem Backend verbunden.</p>
            <div class="pdf-actions">
              <button type="button" class="pdf-btn ghost" @click="close">Abbrechen</button>
              <button type="button" :class="['pdf-btn', 'primary', status]" :disabled="status === 'working'" @click="create">
                <svg v-if="status === 'done'" viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8" /></svg>
                <i v-else-if="status === 'working'" class="pdf-spinner" aria-hidden="true"></i>
                <svg v-else viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10M6 9.5l4 4 4-4M4 16.5h12" /></svg>
                {{ status === 'done' ? 'Bereit' : status === 'working' ? 'Wird vorbereitet…' : `PDF erstellen · ${pages.length} ${pages.length === 1 ? 'Seite' : 'Seiten'}` }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  PDF_EXPORT_FEATURES, PDF_NOTE_LIMIT, PDF_PRESETS, PDF_SECTIONS, availableSections, clearPdfSettings, defaultSettings,
  estimatePages, loadPdfSettings, matchPreset, presetSettings, savePdfSettings, sectionSelectable, valueRowCount,
} from '@/services/pdfExport'

const props = defineProps({
  open: { type: Boolean, default: false },
  // Was der Bericht enthält: Gruppen mit Anzahl, Osmose, Diagramme, Empfehlungen, Dosierung, Produkte
  context: { type: Object, required: true },
  ownerId: { type: String, default: 'guest' },
  // Welche Teile des Dialogs freigegeben sind (siehe PDF_EXPORT_FEATURES)
  features: { type: Object, default: () => PDF_EXPORT_FEATURES },
})
const emit = defineEmits(['close', 'create'])

const CHARTS = [
  { key: 'composition', label: 'Zusammensetzung' },
  { key: 'ratios', label: 'Elementverhältnisse' },
  { key: 'growth', label: 'Wachstumsfaktoren' },
]
const ROW_TONES = ['good', 'good', 'watch', 'good', 'critical', 'good']
const ICONS = {
  cover: 'M5 2.5h7l3.5 3.5v11.5h-10.5zM10 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  values: 'M3 5.5h14M3 10h14M3 14.5h14M7 4v3M13 8.5v3M9 13v3',
  osmosis: 'M10 2.5c3 3.8 4.8 6.6 4.8 9a4.8 4.8 0 0 1-9.6 0c0-2.4 1.8-5.2 4.8-9z',
  charts: 'M3 16.5h14M5.5 12l3-3 3 2 4.5-5',
  recommendations: 'M10 2.5l1.8 4.6 4.7.4-3.6 3.1 1.1 4.7L10 12.8l-4 2.5 1.1-4.7-3.6-3.1 4.7-.4z',
  dosing: 'M3.5 5h13v11.5h-13zM3.5 8.5h13M7 3v3.5M13 3v3.5M7 12l1.5 1.5 3-3',
  products: 'M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM12 12h1.5v1.5H12zM15 15h1.5v1.5H15zM12 15.5h1.5M15.5 12h1',
}

const available = computed(() => availableSections(props.context))
// Was sich gerade schalten lässt: vorhanden und – bei den Produkten – mit Empfehlungen.
const selectable = computed(() => Object.fromEntries(PDF_SECTIONS.map((section) => [section.key, sectionSelectable(section.key, settings.value, props.context)])))
const sections = computed(() => PDF_SECTIONS.map((section) => ({
  ...section,
  count: {
    values: countValues(settings.value.values.scope),
    osmosis: props.context.osmosisCount,
    recommendations: props.context.recommendationCount,
    dosing: props.context.dosingCount,
    products: props.context.productCount,
  }[section.key] || null,
  missing: {
    osmosis: 'Mit diesem Bericht wurde keine Osmoseprobe geprüft',
    charts: 'Für diesen Bericht gibt es keine Diagramme',
    recommendations: 'Keine Maßnahme nötig',
    dosing: 'Keine Dosierung erforderlich',
    products: 'Keine Produktempfehlung',
  }[section.key] || '',
  blocked: section.key === 'products' ? 'Nur zusammen mit den Empfehlungen – die Produkte stammen daraus' : '',
})))

const settings = ref(defaultSettings(props.context))
const remember = ref(true)
const startPreset = PDF_PRESETS.find((preset) => preset.key === props.features.startPreset) || PDF_PRESETS[0]
// Was die gewählte Vorlage enthält – zur Information, solange die Bereiche nicht einzeln schaltbar sind.
const includedContents = computed(() => {
  const { sections: on, values, osmosis, charts, recommendations, dosing } = settings.value
  const context = props.context
  const items = [{ key: 'cover', label: 'Deckblatt & Gesamtbewertung', detail: 'Aquarium und Bewertung auf einen Blick' }]
  if (on.values) {
    const groups = values.groups.length
    items.push(values.scope === 'issues'
      ? { key: 'values', label: 'Auffällige Messwerte', detail: `${countValues('issues')} Werte außerhalb des Zielbereichs, als Tabelle` }
      : { key: 'values', label: 'Alle Messwerte', detail: `${countValues('all')} Werte in ${groups} ${groups === 1 ? 'Gruppe' : 'Gruppen'}, als Tabelle` })
  }
  if (on.osmosis) {
    items.push({ key: 'osmosis', label: 'Osmosewasser', detail: osmosis.scope === 'found' ? `${context.osmosisFound} nachweisbare ${context.osmosisFound === 1 ? 'Element' : 'Elemente'}` : `Alle ${context.osmosisCount} Werte der Osmoseprobe` })
  }
  if (on.charts) {
    const names = CHARTS.filter((chart) => charts[chart.key] && context.charts?.[chart.key]).map((chart) => chart.label)
    items.push({ key: 'charts', label: 'Diagramme', detail: names.join(', ') })
  }
  if (on.recommendations) {
    items.push(recommendations.hideDone
      ? { key: 'recommendations', label: 'Offene Empfehlungen', detail: `${context.openRecommendationCount} Maßnahmen mit Begründung` }
      : { key: 'recommendations', label: 'Empfehlungen', detail: `${context.recommendationCount} Maßnahmen mit Begründung und Produkten` })
  }
  if (on.dosing) items.push({ key: 'dosing', label: 'Dosierungsplan', detail: dosing.checkboxes ? 'Tag für Tag mit Mengen und Kästchen zum Abhaken' : 'Tag für Tag mit Mengen und Tageslimits' })
  if (on.products) items.push({ key: 'products', label: 'Produkte mit QR-Code', detail: `${context.productCount} Produkte aus den Empfehlungen – scannen und direkt im Shop öffnen` })
  return items
})
const status = ref('idle')

const pages = computed(() => estimatePages(settings.value, props.context))
const activePreset = computed(() => matchPreset(settings.value, props.context))
const presetPages = computed(() => Object.fromEntries(PDF_PRESETS.map((preset) => {
  const count = estimatePages(presetSettings(preset.key, props.context, settings.value), props.context).length
  return [preset.key, { count, art: Math.min(count, 4) }]
})))

function countValues(scope) {
  return valueRowCount({ ...settings.value, values: { ...settings.value.values, scope } }, props.context)
}
// Vorlagen, die noch nicht freigegeben sind, bleiben sichtbar, lassen sich aber nicht wählen.
function presetEnabled(key) {
  return !props.features.enabledPresets || props.features.enabledPresets.includes(key)
}
function applyPreset(key) {
  if (!presetEnabled(key)) return
  settings.value = presetSettings(key, props.context, settings.value)
}
function toggleSection(key) {
  if (!selectable.value[key]) return
  settings.value.sections[key] = !settings.value.sections[key]
  // Ohne Empfehlungen keine Produkte – sie stammen daraus.
  if (key === 'recommendations' && !settings.value.sections.recommendations) settings.value.sections.products = false
}
// Mindestens eine Gruppe bzw. ein Diagramm bleibt gewählt – sonst wäre der Bereich leer.
function toggleGroup(key) {
  const groups = settings.value.values.groups
  if (groups.includes(key)) {
    if (groups.length > 1) settings.value.values.groups = groups.filter((item) => item !== key)
  } else {
    const order = props.context.groups.map((group) => group.key)
    settings.value.values.groups = order.filter((item) => item === key || groups.includes(item))
  }
}
function toggleChart(key) {
  const next = { ...settings.value.charts, [key]: !settings.value.charts[key] }
  if (CHARTS.some((chart) => props.context.charts?.[chart.key] && next[chart.key])) settings.value.charts = next
}

let doneTimer = null
function create() {
  if (props.features.remember) {
    if (remember.value) savePdfSettings(localStorage, props.ownerId, settings.value)
    else clearPdfSettings(localStorage, props.ownerId)
  }
  status.value = 'working'
  // Kurzer Moment, damit der Klick sichtbar ankommt; erzeugt wird später im Backend.
  doneTimer = setTimeout(() => {
    status.value = 'done'
    emit('create', { settings: JSON.parse(JSON.stringify(settings.value)), pages: pages.value.length })
    doneTimer = setTimeout(close, 1600)
  }, 700)
}

// Öffnen: letzte Auswahl laden, Fokus in den Dialog, Seite dahinter festhalten.
const dialog = ref(null)
const closeButton = ref(null)
let returnFocus = null
watch(() => props.open, async (open) => {
  if (open) {
    returnFocus = document.activeElement
    settings.value = (props.features.remember && loadPdfSettings(localStorage, props.ownerId, props.context))
      || (props.features.sections && props.features.presets ? defaultSettings(props.context) : presetSettings(startPreset.key, props.context))
    status.value = 'idle'
    document.documentElement.style.overflow = 'hidden'
    await nextTick()
    closeButton.value?.focus()
  } else {
    clearTimeout(doneTimer)
    document.documentElement.style.overflow = ''
    returnFocus?.focus?.()
  }
}, { immediate: true })
onBeforeUnmount(() => { document.documentElement.style.overflow = ''; clearTimeout(doneTimer) })

function close() {
  emit('close')
}
// Escape schließt, Tab bleibt im Dialog.
function onKeydown(event) {
  if (event.key === 'Escape') { event.stopPropagation(); close(); return }
  if (event.key !== 'Tab' || !dialog.value) return
  const items = [...dialog.value.querySelectorAll('button:not(:disabled), input, textarea')].filter((el) => el.offsetParent)
  if (!items.length) return
  const first = items[0]
  const last = items.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
</script>

<style scoped>
.pdf-backdrop {
  position: fixed; z-index: 200; inset: 0; display: grid; place-items: center; padding: 24px;
  background: rgba(6, 18, 44, 0.52); backdrop-filter: blur(6px);
}
.pdf {
  --ink: var(--text, #14213d); --muted: var(--text-muted, #5b6b80); --line: var(--border, rgba(10,27,67,0.12)); --blue: var(--brand-blue, #0072ce);
  display: grid; grid-template-rows: auto minmax(0, 1fr) auto; width: min(1080px, 100%); height: min(780px, 100%);
  overflow: hidden; border-radius: 24px; background: #fff; box-shadow: 0 40px 100px rgba(6, 18, 44, 0.35), 0 0 0 1px rgba(255,255,255,0.08);
}

/* Kopf */
.pdf-head { display: flex; align-items: center; gap: 14px; padding: 18px 20px 16px 22px; border-bottom: 1px solid var(--line); }
.pdf-head-icon { display: grid; flex: none; place-items: center; width: 44px; height: 44px; border-radius: 13px; background: linear-gradient(135deg, #0a63c9, #003a80); box-shadow: 0 8px 18px rgba(0, 90, 190, 0.3); }
.pdf-head-icon svg { width: 24px; height: 24px; fill: none; stroke: #fff; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.pdf-head div { min-width: 0; }
.pdf-head h2 { color: var(--ink); font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.pdf-head p { margin-top: 2px; overflow: hidden; color: var(--muted); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.pdf-close { display: grid; flex: none; place-items: center; width: 38px; height: 38px; margin-left: auto; border: 1px solid var(--line); border-radius: 11px; background: #fff; cursor: pointer; transition: background .15s, transform .15s; }
.pdf-close:hover { background: #f3f6fa; transform: rotate(90deg); }
.pdf-close svg { width: 16px; height: 16px; stroke: var(--ink); stroke-width: 1.8; stroke-linecap: round; }

/* Körper: Einstellungen links, Vorschau rechts */
.pdf-body { display: grid; grid-template-columns: minmax(0, 1fr) 340px; min-height: 0; }
.pdf-settings { display: grid; align-content: start; gap: 22px; min-height: 0; padding: 20px 22px 28px; overflow-y: auto; overscroll-behavior: contain; }
.pdf-block h3 { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: var(--muted); font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.pdf-block h3 small { color: #9aa8b8; font-size: 11px; font-weight: 600; letter-spacing: 0; text-transform: none; }
.pdf-custom { padding: 2px 8px; border-radius: 999px; background: #fff4e0; color: #9a6400; font-size: 10.5px; font-style: normal; letter-spacing: 0; text-transform: none; animation: pdf-pop .25s ease-out; }

/* Vorlagen */
.pdf-presets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.pdf-preset { position: relative; display: grid; justify-items: start; gap: 3px; padding: 12px 12px 12px; border: 1px solid var(--line); border-radius: 16px; background: #fff; color: inherit; text-align: left; cursor: pointer; transition: border-color .15s, box-shadow .2s, transform .15s; }
.pdf-preset:hover { border-color: #b9cde2; transform: translateY(-1px); }
.pdf-preset.locked { opacity: .55; cursor: not-allowed; }
.pdf-preset.locked:hover { border-color: var(--line); transform: none; }
.pdf-preset.on { border-color: var(--blue); box-shadow: 0 0 0 1.5px var(--blue) inset, 0 10px 24px rgba(0, 114, 206, 0.14); }
.pdf-preset:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.pdf-preset-art { display: flex; height: 38px; margin-bottom: 6px; }
.pdf-preset-art i { width: 26px; height: 36px; margin-right: -12px; border: 1px solid #d5e1ec; border-radius: 4px; background: linear-gradient(#e8f1fb 0 22%, #fff 22%); box-shadow: 0 2px 5px rgba(10,27,67,0.08); transition: transform .25s; }
.pdf-preset-art i:nth-child(2) { transform: translateY(1px) rotate(4deg); }
.pdf-preset-art i:nth-child(3) { transform: translateY(2px) rotate(8deg); }
.pdf-preset-art i:nth-child(4) { transform: translateY(3px) rotate(12deg); }
.pdf-preset.on .pdf-preset-art i { border-color: #9cc4ec; background: linear-gradient(#cfe3f8 0 22%, #fff 22%); }
.pdf-preset.dosing .pdf-preset-art i { width: 36px; height: 26px; margin-top: 8px; }
.pdf-preset strong { color: var(--ink); font-size: 14px; font-weight: 800; }
.pdf-preset small { color: var(--muted); font-size: 11.5px; line-height: 1.35; }
.pdf-preset b { margin-top: 6px; padding: 2px 8px; border-radius: 999px; background: #eef4fa; color: var(--muted); font-size: 10.5px; font-weight: 700; }
.pdf-preset.on b { background: #e3f0fc; color: var(--blue); }

/* Bereiche */
.pdf-sections { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.pdf-section { --tint: var(--blue); border: 1px solid var(--line); border-radius: 16px; background: #fff; transition: border-color .2s, background .2s, box-shadow .2s; }
.pdf-section.values { --tint: #0072ce; }
.pdf-section.osmosis { --tint: #0e7490; }
.pdf-section.charts { --tint: #1baf7a; }
.pdf-section.recommendations { --tint: #e08a00; }
.pdf-section.dosing { --tint: #7c3aed; }
.pdf-section.products { --tint: #0a1b43; }
.pdf-section.on { border-color: color-mix(in srgb, var(--tint) 32%, transparent); box-shadow: 0 6px 16px rgba(10,27,67,0.05); }
.pdf-section.off { background: #fafbfc; }
.pdf-section-row { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 11px 12px 11px 11px; }
.pdf-section-icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; background: color-mix(in srgb, var(--tint) 10%, #fff); transition: background .2s; }
.pdf-section.on .pdf-section-icon { background: var(--tint); }
.pdf-section-icon svg { width: 19px; height: 19px; fill: none; stroke: var(--tint); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; transition: stroke .2s; }
.pdf-section.on .pdf-section-icon svg { stroke: #fff; }
.pdf-section.off .pdf-section-icon { filter: grayscale(1); opacity: .5; }
.pdf-section-copy { display: grid; gap: 2px; min-width: 0; }
.pdf-section-copy strong { color: var(--ink); font-size: 14px; font-weight: 700; }
.pdf-section-copy strong small { margin-left: 4px; padding: 1px 7px; border-radius: 999px; background: #eef3f8; color: var(--muted); font-size: 11px; font-weight: 700; }
.pdf-section-copy > span { color: var(--muted); font-size: 12px; line-height: 1.4; }
.pdf-section.off .pdf-section-copy strong { color: #8a97a6; }
.pdf-locked { padding: 4px 9px; border-radius: 999px; background: #eef3f8; color: var(--muted); font-size: 11px; font-weight: 700; white-space: nowrap; }

.pdf-switch { position: relative; flex: none; width: 44px; height: 26px; padding: 0; border: 0; border-radius: 999px; background: #d3dce6; cursor: pointer; transition: background .2s; }
.pdf-switch i { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(10,27,67,0.25); transition: transform .22s cubic-bezier(.3,1.4,.5,1); }
.pdf-switch.on { background: var(--tint); }
.pdf-switch.on i { transform: translateX(18px); }
.pdf-switch:disabled { opacity: .45; cursor: not-allowed; }
.pdf-switch:focus-visible { outline: none; box-shadow: var(--shadow-focus); }

.pdf-options { display: flex; flex-wrap: wrap; gap: 12px 18px; margin: 0 12px 12px 61px; padding-top: 12px; border-top: 1px dashed var(--line); animation: pdf-open .22s ease-out; }
.pdf-option { display: grid; gap: 6px; min-width: 0; }
.pdf-option.wide { flex-basis: 100%; }
.pdf-option > span { color: var(--muted); font-size: 11px; font-weight: 700; }
.pdf-seg { display: inline-flex; flex-wrap: wrap; gap: 3px; padding: 3px; border-radius: 11px; background: #eef3f8; }
.pdf-seg button { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 12px; border: 0; border-radius: 8px; background: transparent; color: var(--muted); font-size: 12.5px; font-weight: 700; white-space: nowrap; cursor: pointer; transition: background .15s, color .15s; }
.pdf-seg button small { color: #9aa8b8; font-size: 11px; }
.pdf-seg button.on { background: #fff; color: var(--blue); box-shadow: 0 1px 3px rgba(10,27,67,0.12); }
.pdf-seg button.on small { color: var(--blue); }
.pdf-seg button:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.pdf-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pdf-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 11px 0 9px; border: 1px solid #dbe5ef; border-radius: 999px; background: #fff; color: var(--muted); font-size: 12.5px; font-weight: 600; cursor: pointer; transition: border-color .15s, background .15s, color .15s; }
.pdf-chip i { display: grid; place-items: center; width: 16px; height: 16px; border: 1.5px solid #c5d2df; border-radius: 50%; color: transparent; font-size: 9px; font-style: normal; font-weight: 900; transition: background .15s, border-color .15s, color .15s; }
.pdf-chip small { color: #9aa8b8; font-size: 11px; font-weight: 700; }
.pdf-chip.on { border-color: color-mix(in srgb, var(--tint, var(--blue)) 45%, transparent); background: color-mix(in srgb, var(--tint, var(--blue)) 7%, #fff); color: var(--ink); }
.pdf-chip.on i { border-color: var(--tint, var(--blue)); background: var(--tint, var(--blue)); color: #fff; }
.pdf-chip:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.pdf-check { display: inline-flex; align-items: flex-start; gap: 9px; color: var(--ink); font-size: 13px; font-weight: 600; cursor: pointer; }
.pdf-check input { flex: none; width: 17px; height: 17px; margin: 1px 0 0; accent-color: var(--tint, var(--blue)); }
.pdf-check small { display: block; margin-top: 1px; color: var(--muted); font-size: 11.5px; font-weight: 500; }

.pdf-format { display: flex; flex-wrap: wrap; gap: 14px 22px; padding: 14px; border: 1px solid var(--line); border-radius: 16px; }
.pdf-format .pdf-check { flex-basis: 100%; }
.pdf-paper { width: 10px; height: 13px; border: 1.5px solid currentColor; border-radius: 2px; }
.pdf-paper.wide { width: 14px; height: 10px; }
.pdf-swatch { width: 12px; height: 12px; border-radius: 50%; background: conic-gradient(#e0503f 0 25%, #f5b301 0 50%, #1baf7a 0 75%, #0072ce 0); }
.pdf-swatch.eco { background: conic-gradient(#333 0 50%, #bbb 0); }

.pdf-note { position: relative; }
.pdf-note textarea { width: 100%; min-height: 84px; padding: 12px 14px 22px; resize: vertical; border: 1px solid var(--line); border-radius: 14px; color: var(--ink); font: inherit; font-size: 13.5px; line-height: 1.5; }
.pdf-note textarea:focus { border-color: var(--blue); outline: none; box-shadow: var(--shadow-focus); }
.pdf-note small { position: absolute; right: 12px; bottom: 8px; color: #9aa8b8; font-size: 11px; font-variant-numeric: tabular-nums; }
.pdf-note small.near { color: #b45309; }

/* Vorschau */
.pdf-preview { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; border-left: 1px solid var(--line); background: radial-gradient(120% 80% at 100% 0%, #e7f1fc 0%, transparent 60%), linear-gradient(180deg, #f3f7fb, #e9eff6); }
.pdf-preview-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 16px 18px 10px; }
.pdf-preview-head strong { color: var(--ink); font-size: 13px; font-weight: 800; }
.pdf-preview-head span { color: var(--muted); font-size: 12px; font-weight: 600; }
.pdf-pages { position: relative; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; gap: 16px 14px; margin: 0; padding: 6px 18px 22px; overflow-y: auto; list-style: none; }
.pdf-pages.landscape { grid-template-columns: 1fr 1fr; }
.pdf-pages.eco .pp-sheet { filter: grayscale(1) contrast(1.05); }
.pp { display: grid; gap: 6px; min-width: 0; }
.pp small { display: flex; align-items: center; gap: 6px; overflow: hidden; color: var(--muted); font-size: 10.5px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.pp small b { display: grid; flex: none; place-items: center; width: 16px; height: 16px; border-radius: 50%; background: #fff; color: var(--ink); font-size: 9.5px; box-shadow: 0 1px 2px rgba(10,27,67,0.12); }

.pp-sheet { position: relative; display: flex; flex-direction: column; gap: 5%; aspect-ratio: 210 / 297; padding: 9% 9% 8%; overflow: hidden; border-radius: 4px; background: #fff; box-shadow: 0 1px 2px rgba(10,27,67,0.08), 0 8px 18px rgba(10,27,67,0.10); transition: transform .2s, box-shadow .2s, filter .3s; }
.landscape .pp-sheet { aspect-ratio: 297 / 210; gap: 4%; padding: 6% 7%; }
.pp:hover .pp-sheet { transform: translateY(-2px) rotate(-0.6deg); box-shadow: 0 2px 4px rgba(10,27,67,0.1), 0 14px 26px rgba(10,27,67,0.16); }
.pp-h { flex: none; width: 46%; height: 6px; border-radius: 3px; background: #0a1b43; opacity: .85; }
.pp.values .pp-h { background: #0072ce; }
.pp.osmosis .pp-h { background: #0e7490; }
.pp.charts .pp-h { background: #1baf7a; }
.pp.recommendations .pp-h { background: #e08a00; }
.pp.dosing .pp-h { background: #7c3aed; }

/* Deckblatt */
.pp.cover .pp-sheet { align-items: center; padding-top: 0; }
.pp-band { display: flex; flex: none; align-items: center; justify-content: space-between; align-self: stretch; height: 17%; margin: 0 -11%; padding: 0 14%; background: linear-gradient(120deg, #0a1b43, #003f88); }
.pp-band b { color: #fff; font-size: 9px; font-style: italic; font-weight: 900; letter-spacing: .02em; }
.pp-band i { width: 28%; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.4); }
.pp-ring { --score: 0deg; display: grid; flex: none; place-items: center; width: 38%; aspect-ratio: 1; margin-top: 6%; border-radius: 50%; background: conic-gradient(#e85d4f var(--score), #e9eef4 0); }
.pp-ring::before { content: ''; grid-area: 1 / 1; width: 76%; aspect-ratio: 1; border-radius: 50%; background: #fff; }
.pp-ring b { grid-area: 1 / 1; position: relative; color: var(--ink); font-size: 11px; font-weight: 900; }
.pp-title { max-width: 100%; overflow: hidden; color: var(--ink); font-size: 9px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.pp-lines { display: grid; gap: 4px; align-self: stretch; }
.pp-lines i { height: 3px; border-radius: 2px; background: #e3e9f0; }
.pp-lines i.short { width: 62%; }
.pp-meta { display: flex; gap: 6%; align-self: stretch; }
.pp-meta i { flex: 1; height: 9px; border-radius: 2px; background: #eef3f8; }
.pp-meta i.code { flex: .7; background: repeating-linear-gradient(90deg, #1d2b45 0 1px, transparent 1px 3px, #1d2b45 3px 5px, transparent 5px 6px); opacity: .7; }
.pp-sticky { position: absolute; right: 7%; bottom: 7%; width: 52%; max-height: 30%; padding: 5px 6px; overflow: hidden; border-radius: 2px; background: #fff3b8; box-shadow: 0 2px 4px rgba(120, 90, 0, 0.18); color: #6b5300; font-size: 6.5px; line-height: 1.3; transform: rotate(-3deg); animation: pdf-pop .3s ease-out; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; }

/* Messwerte und Osmose: kompakte Tabelle */
.pp-tables { display: grid; grid-template-columns: 1fr 1fr; align-items: start; gap: 6%; }
.pp-block { display: grid; gap: 4px; padding: 4px; border: 1px solid #e3e9f0; border-radius: 3px; }
.pp-block-head { width: 55%; height: 3px; border-radius: 2px; background: #9fb0c2; }
.pp-trow { display: grid; grid-template-columns: 4px 1fr 34%; align-items: center; gap: 4px; }
.pp-trow::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: #1baf7a; }
.pp-trow i { height: 2.5px; border-radius: 2px; background: #c8d3df; }
.pp-trow b { height: 5px; border-radius: 2px; background: #d5f2e5; }
.pp-trow.watch::before { background: #f5b301; }
.pp-trow.watch b { background: #ffe2a8; }
.pp-trow.critical::before { background: #e0503f; }
.pp-trow.critical b { background: #fbc9c1; }
.pp-trow.clean b { background: #e6ebf1; }

/* Diagramme */
.pp-chart { position: relative; flex: 1 1 auto; max-height: 52%; border-bottom: 1px solid #d5dee8; border-left: 1px solid #d5dee8; }
.pp-chart .band { position: absolute; right: 0; left: 0; bottom: 40%; height: 20%; background: rgba(27,175,122,0.14); }
.pp-chart b { position: absolute; width: 5px; height: 5px; background: #1baf7a; transform: translate(-50%, 50%) rotate(45deg); }
.pp-chart b.warn { background: #e9a21b; }
.pp-gauge { position: relative; height: 4px; border-radius: 2px; background: linear-gradient(90deg, #e0503f, #f5b301 25%, #1baf7a 40% 60%, #f5b301 75%, #e0503f); }
.pp-gauge i { position: absolute; top: 50%; width: 5px; height: 5px; border: 1px solid #fff; border-radius: 50%; background: #0a1b43; transform: translate(-50%, -50%); }

/* Empfehlungen */
.pp-card { display: grid; gap: 3px; padding: 6% 7%; border-left: 2px solid #e08a00; border-radius: 3px; background: #fff8ec; }
.pp-card i { width: 40%; height: 4px; border-radius: 2px; background: #c47a00; opacity: .7; }
.pp-card b { height: 3px; border-radius: 2px; background: #f0dcc0; }
.pp-card b.short { width: 70%; }

/* Dosierplan */
.pp-grid { display: grid; flex: 1 1 auto; grid-template-columns: 1.8fr repeat(6, 1fr); grid-auto-rows: minmax(0, 1fr); max-height: 60%; border: 1px solid #ddd6fe; border-radius: 3px; }
.pp-grid i { position: relative; border-right: 1px solid #ede9fe; border-bottom: 1px solid #ede9fe; }
.pp-grid i.label { background: #f5f3ff; }
.pp-grid i.box::after { content: ''; position: absolute; top: 50%; left: 50%; width: 5px; height: 5px; border: 1px solid #7c3aed; border-radius: 1.5px; transform: translate(-50%, -50%); }

/* Produkte */
.pp-products { display: grid; grid-template-columns: 1fr 1fr; gap: 6%; }
.pp-products i { display: grid; place-items: center; aspect-ratio: 1; border: 1px solid #e3e9f0; border-radius: 3px; }
.pp-products b { width: 46%; aspect-ratio: 1; background: conic-gradient(#0a1b43 0 25%, transparent 0 50%, #0a1b43 0 75%, transparent 0) 0 0 / 40% 40%; opacity: .85; }

/* Querformat: flachere Blätter, Inhalt entsprechend dichter */
.landscape .pp-band { height: 15%; }
.landscape .pp-ring { width: 22%; margin-top: 2%; }
.landscape .pp-ring b { font-size: 9px; }
.landscape .pp-sticky { right: 5%; bottom: 8%; width: 36%; -webkit-line-clamp: 3; }
.landscape .pp-meta { width: 56%; align-self: flex-start; }
.landscape .pp-meta i { height: 6px; }
.landscape .pp-products { grid-template-columns: repeat(4, 1fr); gap: 5%; }
.landscape .pp-tables { gap: 4%; }

/* Vorerst nur Kurzbericht: kleinerer Dialog, Inhalt nur als Liste */
.pdf.lite { width: min(940px, 100%); height: min(760px, 100%); }
.pdf-lite-card { grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 16px; padding: 16px 18px; cursor: default; }
.pdf-lite-card:hover { transform: none; }
.pdf-lite-card .pdf-preset-art { margin: 0 6px 0 0; }
.pdf-lite-card b { margin: 0; }
.pdf-lite-copy { display: grid; gap: 3px; min-width: 0; }
.pdf-lite-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.pdf-lite-list li { --tint: var(--blue); display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 10px 14px 10px 11px; border: 1px solid var(--line); border-radius: 14px; background: #fff; animation: pdf-open .3s ease-out both; }
.pdf-lite-list li:nth-child(2) { animation-delay: .04s; }
.pdf-lite-list li:nth-child(3) { animation-delay: .08s; }
.pdf-lite-list li:nth-child(4) { animation-delay: .12s; }
.pdf-lite-list li:nth-child(5) { animation-delay: .16s; }
.pdf-lite-list li.osmosis { --tint: #0e7490; }
.pdf-lite-list li.recommendations { --tint: #e08a00; }
.pdf-lite-list li.dosing { --tint: #7c3aed; }
.pdf-lite-list li.charts { --tint: #1baf7a; }
.pdf-lite-list li.products { --tint: #0a1b43; }
.inc-enter-active { transition: opacity .25s ease, transform .25s ease; }
.inc-enter-from { opacity: 0; transform: translateY(-4px); }
.inc-leave-active { display: none; }
.inc-move { transition: transform .3s cubic-bezier(.2,.9,.3,1); }
.pdf-lite-list .pdf-section-icon { background: var(--tint); }
.pdf-lite-list .pdf-section-icon svg { stroke: #fff; }
.pdf-lite-list li > span:nth-child(2) { display: grid; gap: 2px; min-width: 0; }
.pdf-lite-list strong { color: var(--ink); font-size: 14px; font-weight: 700; }
.pdf-lite-list small { color: var(--muted); font-size: 12px; }
.pdf-lite-list li > i { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #e7f7ef; color: #0b8f62; font-size: 12px; font-style: normal; font-weight: 900; }

/* Fuß */
.pdf-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; padding: 14px 20px; border-top: 1px solid var(--line); background: #fbfcfe; }
.pdf-remember { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12.5px; font-weight: 600; cursor: pointer; }
.pdf-remember input { width: 16px; height: 16px; margin: 0; accent-color: var(--blue); }
.pdf-status { flex: 1 1 200px; color: #047857; font-size: 12.5px; font-weight: 600; animation: pdf-pop .25s ease-out; }
.pdf-actions { display: flex; gap: 8px; margin-left: auto; }
.pdf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 18px; border-radius: 12px; font-size: 14px; font-weight: 700; white-space: nowrap; cursor: pointer; transition: transform .15s, box-shadow .2s, background .2s; }
.pdf-btn.ghost { border: 1px solid var(--line); background: #fff; color: var(--ink); }
.pdf-btn.ghost:hover { background: #f3f6fa; }
.pdf-btn.primary { min-width: 220px; border: 0; background: linear-gradient(180deg, #1584e6, #0062bd); color: #fff; box-shadow: 0 10px 22px rgba(0, 114, 206, 0.3); }
.pdf-btn.primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(0, 114, 206, 0.36); }
.pdf-btn.primary.done { background: linear-gradient(180deg, #19b47e, #0b8f62); box-shadow: 0 10px 22px rgba(11, 143, 98, 0.3); }
.pdf-btn.primary:disabled { cursor: progress; }
.pdf-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.pdf-btn:focus-visible, .pdf-remember input:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.pdf-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: pdf-spin .7s linear infinite; }

/* Bewegung */
.pdf-enter-active, .pdf-leave-active { transition: opacity .25s ease; }
.pdf-enter-active .pdf, .pdf-leave-active .pdf { transition: transform .32s cubic-bezier(.2,.9,.3,1.1), opacity .25s ease; }
.pdf-enter-from, .pdf-leave-to { opacity: 0; }
.pdf-enter-from .pdf, .pdf-leave-to .pdf { opacity: 0; transform: translateY(18px) scale(.97); }
.pp-enter-active, .pp-leave-active { transition: opacity .25s ease, transform .3s cubic-bezier(.2,.9,.3,1.2); }
.pp-enter-from, .pp-leave-to { opacity: 0; transform: scale(.85) translateY(8px); }
.pp-leave-active { position: absolute; }
.pp-move { transition: transform .35s cubic-bezier(.2,.9,.3,1); }
@keyframes pdf-open { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
@keyframes pdf-pop { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: none; } }
@keyframes pdf-spin { to { transform: rotate(360deg); } }

/* Tablet: Vorschau schmaler */
@media (max-width: 960px) {
  .pdf-body { grid-template-columns: minmax(0, 1fr) 260px; }
  .pdf-pages { grid-template-columns: 1fr 1fr; gap: 12px 10px; padding-inline: 14px; }
}
/* Telefon: Blatt von unten, Vorschau als Leiste oben */
@media (max-width: 720px) {
  .pdf-backdrop { place-items: end stretch; padding: 0; }
  .pdf { width: 100%; height: calc(100dvh - 24px); border-radius: 22px 22px 0 0; }
  .pdf-head { padding: 14px 16px 12px; }
  .pdf-head-icon { width: 38px; height: 38px; border-radius: 11px; }
  .pdf-head h2 { font-size: 18px; }
  .pdf-body { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
  .pdf-preview { grid-row: 1; grid-template-rows: auto auto; border-bottom: 1px solid var(--line); border-left: 0; }
  .pdf-preview-head { padding: 10px 16px 4px; }
  .pdf-pages, .pdf-pages.landscape { display: flex; gap: 10px; padding: 6px 16px 12px; overflow-x: auto; overflow-y: hidden; scroll-padding-inline: 16px; scroll-snap-type: x proximity; }
  .pp { flex: none; width: 64px; scroll-snap-align: start; }
  .landscape .pp { width: 92px; }
  .pp small { font-size: 9.5px; }
  .pp small b { display: none; }
  .pp-sticky { font-size: 4px; }
  .pdf-settings { padding: 16px 16px 24px; }
  .pdf-presets { gap: 8px; }
  .pdf-preset { padding: 10px; }
  .pdf-preset small { display: none; }
  .pdf-options { margin-left: 12px; }
  .pdf-foot { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); }
  .pdf-remember { flex-basis: 100%; }
  .pdf-actions { flex-basis: 100%; }
  .pdf-btn.ghost { flex: none; }
  .pdf-btn.primary { flex: 1; min-width: 0; }
  .pdf.lite { height: auto; max-height: calc(100dvh - 24px); }
  .pdf-lite-card { grid-template-columns: minmax(0, 1fr) auto; }
  .pdf-lite-card .pdf-preset-art { display: none; }
  .pdf-lite-card small { display: block; }
}
@media (max-width: 380px) {
  .pdf-preset-art { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .pdf-enter-active, .pdf-leave-active, .pdf-enter-active .pdf, .pdf-leave-active .pdf,
  .pp-enter-active, .pp-leave-active, .pp-move { transition: none; }
  .pdf-options, .pdf-custom, .pdf-status, .pp-sticky, .pdf-lite-list li { animation: none; }
}
</style>
