<template>
  <div class="report-page chronik-page">
    <div v-if="loading" class="loading">Wird geladen…</div>

    <EmptyState
      v-else-if="!profiles.length"
      kicker="Noch keine Historie"
      title="Chronik startet mit Ihrem ersten Aquarium"
      message="Legen Sie ein Aquarium an und registrieren Sie anschließend ein Testkit. Nach den ersten Ergebnissen wird hier der Verlauf sichtbar."
      image-theme="freshwater"
    >
      <template #actions>
        <RouterLink to="/aquariums/new" class="btn btn-primary">Aquarium anlegen</RouterLink>
        <RouterLink to="/analyses/activate" class="btn btn-ghost">Analyse registrieren</RouterLink>
      </template>
    </EmptyState>

    <EmptyState
      v-else-if="!tanks.length"
      kicker="Warten auf Ergebnisse"
      title="Noch keine abgeschlossene Analyse"
      message="Die Chronik benötigt mindestens einen ausgewerteten Laborbericht. Laufende Analysen erscheinen hier, sobald Ergebnisse verfügbar sind."
      mark="TRD"
      tone="compact"
    >
      <template #actions>
        <RouterLink to="/analyses" class="btn btn-ghost">Analyseberichte ansehen</RouterLink>
      </template>
    </EmptyState>

    <template v-else>
      <section class="ch-hero">
        <div>
          <span class="ch-kicker">Chronik</span>
          <h1>Wasserwerte im Verlauf</h1>
          <p>{{ heroLine }}</p>
        </div>
        <dl class="ch-hero-stats">
          <div><dt>Aquarien</dt><dd>{{ tanks.length }}</dd></div>
          <div><dt>Laborberichte</dt><dd>{{ reportCount }}</dd></div>
          <div><dt>Messwerte</dt><dd>{{ valueCount.toLocaleString('de-DE') }}</dd></div>
        </dl>
      </section>

      <!-- Aquarien -->
      <section class="ch-tanks" aria-labelledby="ch-tanks-title">
        <div class="ch-section-head">
          <h2 id="ch-tanks-title">Aquarien <small>{{ selectedTanks.length }} von {{ tanks.length }}</small></h2>
          <div class="ch-section-actions">
            <button type="button" :disabled="selectedIds.length === tanks.length" @click="selectedIds = tanks.map((tank) => tank.id)">Alle</button>
            <button type="button" :disabled="selectedIds.length <= 1" @click="selectedIds = [tanks[0].id]">Nur das neueste</button>
          </div>
        </div>
        <div class="ch-tank-list" role="group" aria-label="Aquarien für den Vergleich">
          <button
            v-for="tank in tanks"
            :key="tank.id"
            type="button"
            :class="['ch-tank', { on: isSelected(tank.id) }]"
            :aria-pressed="isSelected(tank.id)"
            :style="isSelected(tank.id) ? { '--tank': colorOf(tank.id) } : null"
            @click="toggleTank(tank.id)"
          >
            <span class="ch-tank-check" aria-hidden="true">{{ isSelected(tank.id) ? '✓' : '' }}</span>
            <span class="ch-tank-copy">
              <strong>{{ tank.name }}</strong>
              <small>{{ tank.reports.length }} {{ tank.reports.length === 1 ? 'Bericht' : 'Berichte' }} · {{ formatDate(tank.latest.date) }}</small>
            </span>
            <span v-if="tank.latest.score !== null" :class="['ch-tank-score', scoreTone(tank.latest.score)]" :title="`Gesamtbewertung des letzten Berichts: ${tank.latest.score} %`">{{ tank.latest.score }}</span>
          </button>
        </div>
      </section>

      <!-- Steuerung: Parameter links, Zeitraum rechts – wirkt auf alles darunter -->
      <section class="ch-controls" aria-label="Darstellung">
        <ChronikParameterPicker v-model="keys" :groups="catalog" :sets="parameterSets" :flagged-keys="flagged" />

        <div v-if="selectedMeta.length" class="ch-chips" aria-label="Gewählte Parameter">
          <button v-for="meta in visibleChips" :key="meta.key" type="button" class="ch-chip" :title="`${meta.label} entfernen`" @click="removeKey(meta.key)">
            {{ meta.label }} <span aria-hidden="true">×</span>
          </button>
          <span v-if="hiddenChips" class="ch-chip more">+{{ hiddenChips }}</span>
        </div>

        <div class="ch-range" role="radiogroup" aria-label="Zeitraum">
          <button v-for="item in RANGES" :key="item.key" type="button" role="radio" :aria-checked="range === item.key" :class="{ active: range === item.key }" @click="range = item.key">{{ item.label }}</button>
        </div>
      </section>

      <!-- Zusammenfassung -->
      <section v-if="selectedTanks.length && keys.length" class="ch-summary">
        <p class="ch-verdict">
          <strong>{{ summary.inTarget }} von {{ summary.measured }}</strong> Messwerten im Zielbereich
          <span v-if="summary.worst.length"> · am weitesten daneben: <template v-for="(item, index) in summary.worst" :key="item.id"><template v-if="index">, </template><b>{{ item.label }}</b> in {{ item.tank }}</template></span>
        </p>
        <p v-if="overflowTanks" class="ch-note">Farben für bis zu sechs Aquarien – {{ overflowTanks }} weitere {{ overflowTanks === 1 ? 'erscheint' : 'erscheinen' }} grau.</p>
      </section>

      <!-- Leere Auswahl -->
      <section v-if="!selectedTanks.length" class="ch-empty">
        <h2>Kein Aquarium gewählt</h2>
        <p>Wählen Sie oben mindestens ein Aquarium, um seine Werte zu sehen.</p>
      </section>
      <section v-else-if="!keys.length" class="ch-empty">
        <h2>Welche Werte interessieren Sie?</h2>
        <p>Starten Sie mit einer Auswahl – oder öffnen Sie oben „Parameter“ für alle 43.</p>
        <div class="ch-empty-sets">
          <button v-for="set in parameterSets.filter((item) => item.keys.length)" :key="set.key" type="button" @click="keys = sortKeys(set.keys)">{{ set.label }} <small>{{ set.keys.length }}</small></button>
        </div>
      </section>

      <ChronikTrendPanel v-else :tanks="selectedTanks" :metas="selectedMeta" :domain="trendDomain" />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { analysisApi, profileApi } from '@/services/toolsData'
import { loadAnalysisContent } from '@/services/analysisContent'
import { useAnalysesStore } from '@/stores/analyses'
import {
  DEFAULT_PARAMETERS, PARAMETER_SETS, RANGES, assignColors, buildTanks, colorFor, flaggedParameters,
  formatDate, parameterCatalog, position, rangeStart, readQuery, reportsInRange,
} from '@/services/chronik'
import '@/assets/styles/report-base.css'
import '@/assets/styles/chronik.css'
import EmptyState from '@/components/ui/EmptyState.vue'
import ChronikTrendPanel from '@/components/chronik/ChronikTrendPanel.vue'
import ChronikParameterPicker from '@/components/chronik/ChronikParameterPicker.vue'

const MAX_CHIPS = 10

const route = useRoute()
const router = useRouter()
const analysesStore = useAnalysesStore()

const loading = ref(true)
const profiles = ref([])
const analyses = ref([])
const content = loadAnalysisContent()
const catalog = parameterCatalog(content)
const metaByKey = Object.fromEntries(catalog.flatMap((group) => group.items.map((item) => [item.key, item])))
const catalogOrder = catalog.flatMap((group) => group.items.map((item) => item.key))
const sortKeys = (list) => catalogOrder.filter((key) => list.includes(key))

const tanks = computed(() => buildTanks(analyses.value, profiles.value))
const selectedIds = ref([])
const keys = ref([])
const range = ref('all')
const slots = ref({})

watch(selectedIds, (ids) => { slots.value = assignColors(ids, slots.value) }, { immediate: true })

const isSelected = (id) => selectedIds.value.includes(id)
const colorOf = (id) => colorFor(slots.value[id] ?? -1)
function toggleTank(id) {
  // Reihenfolge bleibt die der Liste, damit Karten und Spalten nicht springen.
  const next = isSelected(id) ? selectedIds.value.filter((item) => item !== id) : [...selectedIds.value, id]
  selectedIds.value = tanks.value.map((tank) => tank.id).filter((item) => next.includes(item))
}

// Ausgewählte Aquarien mit ihren Berichten im Zeitraum – Grundlage aller Ansichten.
const selectedTanks = computed(() => tanks.value
  .filter((tank) => isSelected(tank.id))
  .map((tank) => {
    const reports = reportsInRange(tank, range.value)
    return { ...tank, reports, latestReport: reports.at(-1) || null, color: colorOf(tank.id) }
  }))
const overflowTanks = computed(() => selectedTanks.value.filter((tank) => (slots.value[tank.id] ?? -1) < 0).length)

const selectedMeta = computed(() => keys.value.map((key) => metaByKey[key]).filter(Boolean))
const visibleChips = computed(() => selectedMeta.value.slice(0, MAX_CHIPS))
const hiddenChips = computed(() => Math.max(0, selectedMeta.value.length - MAX_CHIPS))
const removeKey = (key) => { keys.value = keys.value.filter((item) => item !== key) }

const flagged = computed(() => flaggedParameters(selectedTanks.value.filter((tank) => tank.latestReport).map((tank) => ({ ...tank, latest: tank.latestReport })), content))
const parameterSets = computed(() => [
  { key: 'flagged', label: 'Außerhalb des Ziels', keys: flagged.value, hint: 'Parameter, die in mindestens einem gewählten Aquarium außerhalb des Zielbereichs liegen' },
  { key: 'favorites', label: 'Favoriten', keys: analysesStore.favoriteParameters.filter((key) => metaByKey[key]), hint: 'Im Bericht mit ★ gemerkte Parameter' },
  ...PARAMETER_SETS.map((set) => ({ ...set, hint: set.keys.map((key) => metaByKey[key]?.label).join(', ') })),
])

// Eine Zeitachse für alle Linien des Verlaufs.
const trendDomain = computed(() => {
  const times = selectedTanks.value.flatMap((tank) => tank.reports.map((report) => report.time))
  const now = Date.now()
  const day = 86400000
  if (range.value !== 'all') return [rangeStart(range.value, now), now]
  if (!times.length) return [now - 90 * day, now]
  const start = Math.min(...times)
  const end = Math.max(now, ...times)
  const pad = Math.max(7 * day, (end - start) * 0.04)
  return [start - pad, end + pad / 2]
})

const reportCount = computed(() => tanks.value.reduce((sum, tank) => sum + tank.reports.length, 0))
const valueCount = computed(() => tanks.value.reduce((sum, tank) => sum + tank.reports.reduce((inner, report) => inner + Object.keys(report.values).length, 0), 0))
const heroLine = computed(() => {
  const latest = tanks.value[0]?.latest
  return `Verfolgen Sie mehrere Aquarien und Parameter in einem Diagramm – auch mit verschiedenen Einheiten. Letzte Probe: ${latest ? formatDate(latest.date, 'long') : '—'}.`
})

const summary = computed(() => {
  let measured = 0
  let inTarget = 0
  const misses = []
  for (const tank of selectedTanks.value) {
    for (const meta of selectedMeta.value) {
      const item = tank.latestReport?.values[meta.key]
      if (!item || item.undetectable) continue
      measured += 1
      const where = position(item.value, meta.min, meta.max)
      if (where === 'in') { inTarget += 1; continue }
      const span = meta.max - meta.min || Math.abs(meta.max) || 1
      const off = (item.value < meta.min ? meta.min - item.value : item.value - meta.max) / span
      misses.push({ id: `${tank.id}:${meta.key}`, label: meta.label, tank: tank.name, off })
    }
  }
  misses.sort((a, b) => b.off - a.off)
  return { measured, inTarget, worst: misses.slice(0, 2) }
})

function scoreTone(score) {
  return score >= 85 ? 'good' : score >= 70 ? 'watch' : 'critical'
}

// Auswahl ↔ Adresszeile
let ready = false
watch([selectedIds, keys, range], () => {
  if (!ready) return
  const query = { tanks: selectedIds.value.join(','), params: keys.value.join(','), range: range.value }
  if (JSON.stringify(query) !== JSON.stringify({ tanks: route.query.tanks, params: route.query.params, range: route.query.range })) {
    router.replace({ query })
  }
})

onMounted(async () => {
  try {
    const [profileRes, analysisRes] = await Promise.all([profileApi.list(), analysisApi.list({ status: 'completed' })])
    profiles.value = profileRes
    analyses.value = analysisRes
    const state = readQuery(route.query, tanks.value)
    selectedIds.value = state.tankIds
    const favorites = analysesStore.favoriteParameters.filter((key) => metaByKey[key])
    keys.value = sortKeys(state.keys.length ? state.keys : favorites.length ? favorites : DEFAULT_PARAMETERS)
    range.value = state.range
  } finally {
    loading.value = false
    ready = true
  }
})
</script>

<style scoped>
.chronik-page { display: grid; gap: 20px; }
/* Rasterkinder dürfen schrumpfen – sonst schiebt die waagerecht scrollende Aquarienleiste die ganze Seite breit. */
.chronik-page > * { min-width: 0; }

.ch-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding: clamp(22px, 3vw, 30px); border-radius: 24px; color: #fff; background: linear-gradient(120deg, rgba(10,27,67,0.96), rgba(0,51,102,0.84)), url('/reef-tank.webp') center / cover; box-shadow: var(--shadow); }
.ch-kicker { display: block; margin-bottom: 7px; color: var(--brand-sky); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.ch-hero h1 { margin-bottom: 6px; font-size: clamp(26px, 3.4vw, 38px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; }
.ch-hero p { max-width: 560px; color: rgba(255,255,255,0.74); font-size: 14px; line-height: 1.55; }
.ch-hero-stats { display: flex; gap: 10px; margin: 0; }
.ch-hero-stats div { min-width: 96px; padding: 12px 14px; border: 1px solid rgba(255,255,255,0.14); border-radius: 14px; background: rgba(255,255,255,0.07); }
.ch-hero-stats dt { color: var(--brand-sky); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.ch-hero-stats dd { margin: 4px 0 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }

.ch-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.ch-section-head h2 { color: var(--text); font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.ch-section-head h2 small { margin-left: 6px; color: var(--text-muted); font-size: 12px; font-weight: 600; letter-spacing: 0; text-transform: none; }
.ch-section-actions { display: flex; gap: 4px; }
.ch-section-actions button { padding: 6px 8px; border: 0; background: none; color: var(--brand-blue); font-size: 12.5px; font-weight: 700; cursor: pointer; }
.ch-section-actions button:disabled { color: #a8b4c2; cursor: default; }

.ch-tank-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
.ch-tank { position: relative; display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 62px; padding: 10px 12px; overflow: hidden; border: 1px solid var(--border); border-radius: 14px; background: #fff; color: inherit; text-align: left; cursor: pointer; transition: border-color .15s, box-shadow .15s, background .15s; }
.ch-tank::before { position: absolute; top: 0; bottom: 0; left: 0; width: 4px; background: var(--tank, transparent); content: ''; }
.ch-tank:hover { border-color: #b9cde2; }
.ch-tank:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.ch-tank.on { border-color: color-mix(in srgb, var(--tank) 45%, transparent); background: color-mix(in srgb, var(--tank) 5%, #fff); }
.ch-tank-check { display: grid; place-items: center; width: 20px; height: 20px; border: 1.5px solid #c5d2df; border-radius: 6px; color: #fff; font-size: 12px; font-weight: 800; }
.ch-tank.on .ch-tank-check { border-color: var(--tank); background: var(--tank); }
.ch-tank-copy { min-width: 0; }
.ch-tank-copy strong { display: block; overflow: hidden; color: var(--text); font-size: 13.5px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.ch-tank-copy small { display: block; margin-top: 2px; overflow: hidden; color: var(--text-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.ch-tank-score { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
.ch-tank-score.good { background: #ecfdf5; color: #047857; }
.ch-tank-score.watch { background: #fff7ed; color: #9a4d0a; }
.ch-tank-score.critical { background: #fef2f2; color: #b42318; }

.ch-controls { position: sticky; z-index: 20; top: 76px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--border); border-radius: 16px; background: rgba(255,255,255,0.92); box-shadow: 0 10px 30px rgba(10,27,67,0.06); backdrop-filter: blur(10px); }
.ch-range { display: inline-flex; gap: 3px; padding: 3px; border-radius: 12px; background: #eef3f8; }
.ch-range button { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 0 13px; border: 0; border-radius: 9px; background: transparent; color: var(--text-muted); font-size: 12.5px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.ch-range button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 1px 3px rgba(10,27,67,0.12); }
.ch-range button:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.ch-range { margin-left: auto; }
/* Gewählte Parameter in derselben Zeile, einzeilig: passt es nicht, scrollt der Streifen seitlich. */
.ch-chips { display: flex; flex: 1 1 200px; flex-wrap: nowrap; align-items: center; gap: 6px; min-width: 0; overflow-x: auto; scrollbar-width: none; -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); padding-right: 24px; }
.ch-chips::-webkit-scrollbar { display: none; }
.ch-chip { flex: none; }
.ch-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 0 10px; border: 1px solid #dbe5ef; border-radius: 999px; background: #f6f9fc; color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer; }
.ch-chip span { color: var(--text-muted); font-size: 14px; line-height: 1; }
.ch-chip:hover { border-color: #e0503f; }
.ch-chip:hover span { color: #e0503f; }
.ch-chip.more { border-style: dashed; color: var(--text-muted); cursor: default; }

.ch-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 22px; padding: 2px 4px; }
.ch-verdict { color: var(--text-muted); font-size: 13px; }
.ch-verdict strong, .ch-verdict b { color: var(--text); font-weight: 700; }
.ch-note { flex-basis: 100%; color: var(--text-muted); font-size: 11.5px; }


.ch-empty { display: grid; justify-items: start; gap: 8px; padding: 30px; border: 1px dashed #c9d6e3; border-radius: 18px; background: #fbfcfe; }
.ch-empty h2 { color: var(--text); font-size: 18px; font-weight: 800; }
.ch-empty p { color: var(--text-muted); font-size: 13.5px; }
.ch-empty-sets { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.ch-empty-sets button { display: inline-flex; gap: 6px; min-height: 36px; align-items: center; padding: 0 14px; border: 1px solid #dbe5ef; border-radius: 999px; background: #fff; color: var(--text); font-size: 13px; font-weight: 700; cursor: pointer; }
.ch-empty-sets button:hover { border-color: var(--brand-blue); }
.ch-empty-sets small { color: var(--text-muted); }

@media (max-width: 900px) {
  .ch-hero { align-items: flex-start; flex-direction: column; }
  .ch-controls { top: 64px; }
  .ch-range { margin-left: 0; }
}
@media (max-width: 600px) {
  .ch-hero-stats { width: 100%; }
  .ch-hero-stats div { flex: 1; min-width: 0; }
  .ch-tank-list { display: flex; margin: 0 -16px; padding: 0 16px 4px; overflow-x: auto; scroll-snap-type: x mandatory; }
  .ch-tank { flex: 0 0 78%; scroll-snap-align: start; }
  .ch-controls { position: static; }
  .ch-range { flex: 1 1 100%; }
  .ch-range button { flex: 1; justify-content: center; padding: 0 6px; }
  .ch-chips { display: none; }
}
</style>
