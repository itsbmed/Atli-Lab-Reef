<template>
  <div>
    <RouterLink to="/aquariums" class="back-link">Zurück zu Meine Aquarien</RouterLink>

    <div v-if="!profile" class="missing-card card">
      <h2>Aquarium nicht gefunden</h2>
      <p>Dieses Aquarium existiert nicht mehr oder wurde entfernt.</p>
      <RouterLink to="/aquariums" class="btn btn-primary">Zur Übersicht</RouterLink>
    </div>

    <template v-else>
      <section class="tank-hero">
        <div class="tank-hero-visual">
          <img v-if="profile.image" :src="profile.image" alt="" />
          <div v-else :class="`tank-thumb ${profile.image_theme || 'reef-sps'}`"></div>
          <span>{{ profile.water_type }}</span>
        </div>
        <div class="tank-hero-copy">
          <div class="hero-kicker">Aquarium-Profil · #{{ shortId }}</div>
          <h1>{{ profile.name }}</h1>
          <p>{{ profile.notes || 'Noch keine Notizen hinterlegt.' }}</p>
          <div class="hero-actions">
            <button class="btn btn-primary" @click="startEdit">Profil bearbeiten</button>
            <RouterLink :to="`/analyses/activate?aquarium_id=${profile.id}`" class="btn btn-ghost">Analyse registrieren</RouterLink>
          </div>
        </div>
        <div class="tank-health-card">
          <div class="health-ring" :style="healthRingStyle">
            <strong>{{ latestScore ?? '—' }}</strong>
            <span>{{ latestScore === null ? '' : '%' }}</span>
          </div>
          <div>
            <span>Letzter Lab Score</span>
            <strong>{{ healthLabel }}</strong>
            <em>{{ latestAnalysis ? `${latestAnalysis.issueCount || 0} Hinweise · ${formatDate(latestAnalysis.createdAt)}` : 'Keine Analyse vorhanden' }}</em>
          </div>
        </div>
      </section>

      <section class="metric-grid">
        <div v-for="metric in profileMetrics" :key="metric.label" class="metric-card">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <em>{{ metric.caption }}</em>
        </div>
      </section>

      <div v-if="!editing" class="detail-layout">
        <main class="main-column">
          <section class="card lab-panel">
            <div class="section-header">
              <div>
                <div class="section-title">Laborverlauf</div>
                <p class="section-sub">Die letzten Analysen dieses Aquariums mit Score und Hinweisen.</p>
              </div>
              <RouterLink to="/analyses" class="section-link">Alle Berichte</RouterLink>
            </div>

            <div class="score-chart">
              <Line :data="scoreChartData" :options="scoreChartOptions" />
            </div>

            <div v-if="profileAnalyses.length" class="analysis-timeline">
              <RouterLink v-for="a in profileAnalyses" :key="a.id" :to="`/analyses/${a.id}`" :class="['timeline-row', analysisTone(a)]">
                <span class="timeline-dot"></span>
                <div>
                  <strong>{{ formatDate(a.createdAt) }}</strong>
                  <em>{{ a.barcode }} · {{ a.packageLabel }}</em>
                </div>
                <b>{{ a.score ?? '—' }}<template v-if="a.score !== null">%</template></b>
                <small>{{ a.issueCount || 0 }} Hinweise</small>
              </RouterLink>
            </div>
            <div v-else class="timeline-empty">
              <strong>Noch keine Analysen</strong>
              <span>Registrieren Sie ein Testkit, um Score, Verlauf und Hinweise hier zu sehen.</span>
            </div>
          </section>

          <section class="card target-panel">
            <div class="section-header">
              <div>
                <div class="section-title">Zielwert-Profil</div>
                <p class="section-sub">Dummy-Zielbereiche für schnelle Produkt- und Reporttests.</p>
              </div>
              <span class="badge badge-created">ATI Defaults</span>
            </div>

            <div class="target-grid">
              <div v-for="target in targetValues" :key="target.name" class="target-card">
                <span>{{ target.name }}</span>
                <strong>{{ target.range }}</strong>
                <em>{{ target.note }}</em>
              </div>
            </div>
          </section>

          <section class="card water-detail-panel">
            <div class="section-header">
              <div>
                <div class="section-title">Wassertyp-Angaben</div>
                <p class="section-sub">Erfasste Angaben aus dem kundenspezifischen Fragebogen.</p>
              </div>
              <button class="section-link as-button" type="button" @click="startEdit">Bearbeiten</button>
            </div>

            <div v-if="waterDetailSummary.length" class="water-summary-grid">
              <div v-for="item in waterDetailSummary" :key="item.key" class="water-summary-card">
                <span>{{ item.group }}</span>
                <strong>{{ item.label }}</strong>
                <em>{{ item.value }}</em>
              </div>
            </div>
            <div v-else class="timeline-empty">
              <strong>Noch keine wassertyp-spezifischen Angaben</strong>
              <span>Öffnen Sie die Profilbearbeitung, um den Fragebogen für {{ profile.water_type }} auszufüllen.</span>
            </div>
          </section>
        </main>

        <aside class="side-column">
          <section class="card system-card">
            <div class="section-title">Systemdaten</div>
            <div class="spec-list">
              <div v-for="spec in systemSpecs" :key="spec.label">
                <span>{{ spec.label }}</span>
                <strong>{{ spec.value }}</strong>
              </div>
            </div>
          </section>

          <section v-if="profile.water_type !== 'Osmosewasser'" class="card source-card">
            <div class="section-title">Osmosequelle</div>
            <div v-if="linkedOsmosisSource" class="source-box">
              <span>{{ linkedOsmosisSource.water_type }}</span>
              <strong>{{ linkedOsmosisSource.name }}</strong>
              <em>{{ osmosisSourceMeta(linkedOsmosisSource) }}</em>
              <RouterLink :to="`/aquariums/${linkedOsmosisSource.id}`">Quelle öffnen</RouterLink>
            </div>
            <div v-else class="source-empty">
              <strong>Keine Quelle verknüpft</strong>
              <span>In der Bearbeitung kann eine Osmoseanlage zugeordnet werden.</span>
            </div>
          </section>

          <section class="card attention-card">
            <div class="section-title">Aufmerksamkeit</div>
            <div v-if="topIssues.length" class="issue-list">
              <div v-for="issue in topIssues" :key="issue.label" :class="['issue-pill', issue.tone]">
                <span>{{ issue.label }}</span>
                <strong>{{ issue.value }}</strong>
              </div>
            </div>
            <div v-else class="clean-note">
              <strong>Keine aktuellen Auffälligkeiten</strong>
              <span>Letzte Analyse wirkt stabil.</span>
            </div>
          </section>

          <section class="card action-card">
            <div class="section-title">Schnellaktionen</div>
            <div class="quick-actions">
              <RouterLink to="/analyses">Berichte filtern</RouterLink>
              <RouterLink :to="`/analyses/activate?aquarium_id=${profile.id}`">Analyse registrieren</RouterLink>
              <RouterLink to="/dashboard">Trenddiagramm</RouterLink>
            </div>
          </section>
        </aside>
      </div>

      <section v-else class="card edit-card">
        <div class="section-header">
          <div>
            <div class="section-title">Profil bearbeiten</div>
            <p class="section-sub">Basisdaten und optionale technische Angaben.</p>
          </div>
          <button class="btn btn-ghost" @click="editing = false">Abbrechen</button>
        </div>

        <p v-if="saveError" class="alert alert-error">{{ saveError }}</p>

        <form @submit.prevent="save">
          <div class="form-grid">
            <div class="form-group">
              <label>Name</label>
              <input v-model="editForm.name" type="text" required />
            </div>
            <div class="form-group">
              <label>Wassertyp</label>
              <select v-model="editForm.water_type">
                <option v-for="type in WATER_TYPES" :key="type">{{ type }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Nettovolumen (L)</label>
              <input v-model.number="editForm.net_volume" type="number" min="1" required />
            </div>
            <div class="form-group wide">
              <OsmosisSourcePicker :form="editForm" :sources="availableOsmosisSources" />
            </div>
            <div class="form-group wide">
              <WaterTypeFields :form="editForm" />
            </div>
            <div class="form-group wide">
              <label>Foto</label>
              <div class="photo-edit">
                <div class="photo-preview">
                  <img v-if="editForm.image" :src="editForm.image" alt="" />
                  <div v-else :class="`tank-thumb ${editForm.image_theme || 'reef-mixed'}`"></div>
                </div>
                <div class="photo-edit-side">
                  <div class="photo-edit-copy">
                    <strong>{{ editPhotoLabel }}</strong>
                    <span>Eigenes Foto hochladen oder ein Motiv aus der Galerie wählen.</span>
                  </div>
                  <div class="photo-edit-actions">
                    <label class="photo-upload-btn">
                      {{ editForm.image ? 'Foto ändern' : 'Foto hochladen' }}
                      <input type="file" accept="image/*" hidden @change="onEditPhoto" />
                    </label>
                    <button type="button" class="photo-gallery-btn" @click="showEditPresetPicker = true">Galerie</button>
                    <button v-if="editForm.image" type="button" class="photo-remove" @click="clearEditPhoto">Entfernen</button>
                  </div>
                  <p v-if="photoError" class="alert alert-error">{{ photoError }}</p>
                </div>
              </div>
            </div>
            <div class="form-group wide">
              <label>Notizen</label>
              <textarea v-model="editForm.notes" rows="4"></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Speichern...' : 'Änderungen speichern' }}</button>
            <button type="button" class="btn btn-ghost" @click="cancelEdit">Abbrechen</button>
            <button type="button" class="btn btn-danger" @click="confirmDelete = true">Profil löschen</button>
          </div>
        </form>
      </section>

      <div v-if="confirmDelete" class="confirm-overlay" @click.self="confirmDelete = false">
        <div class="confirm-card card">
          <h3>Profil wirklich löschen?</h3>
          <p>„{{ profile.name }}“ wird dauerhaft entfernt. Das kann nicht rückgängig gemacht werden.</p>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" @click="confirmDelete = false">Abbrechen</button>
            <button type="button" class="btn btn-danger" @click="deleteProfile">Profil löschen</button>
          </div>
        </div>
      </div>

      <div v-if="showEditPresetPicker" class="preset-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-preset-title" @click.self="showEditPresetPicker = false">
        <div class="preset-card">
          <div class="preset-head">
            <div>
              <span>Galerie</span>
              <h3 id="edit-preset-title">Aquarium-Bild wählen</h3>
            </div>
            <button type="button" class="preset-close" aria-label="Schließen" @click="showEditPresetPicker = false">×</button>
          </div>
          <div class="preset-grid">
            <button
              v-for="preset in AQUARIUM_PRESETS"
              :key="preset.id"
              type="button"
              :class="['preset-option', { active: editForm.image === preset.dataUrl }]"
              :aria-pressed="editForm.image === preset.dataUrl"
              @click="selectEditPreset(preset)"
            >
              <img :src="preset.dataUrl" :alt="preset.name" />
              <span>{{ preset.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
import OsmosisSourcePicker from '@/components/aquariums/OsmosisSourcePicker.vue'
import WaterTypeFields from '@/components/aquariums/WaterTypeFields.vue'
import { useAquariumsStore } from '@/stores/aquariums'
import { useAnalysesStore } from '@/stores/analyses'
import { AQUARIUM_PRESETS } from '@/services/aquariumPresets'
import { fileToResizedDataUrl } from '@/services/imageUtil'
import { WATER_TYPES, waterTypeSummary } from '@/services/waterTypeFields'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const route = useRoute()
const router = useRouter()
const aquariums = useAquariumsStore()
const analysesStore = useAnalysesStore()
const editing = ref(false)
const saving = ref(false)
const saveError = ref('')
const photoError = ref('')
const editForm = ref({})
const confirmDelete = ref(false)
const showEditPresetPicker = ref(false)

onMounted(() => {
  aquariums.load()
  analysesStore.load()
})

const profile = computed(() => aquariums.byId(route.params.id))
const shortId = computed(() => profile.value?.id?.slice(-6) || route.params.id)
const profileAnalyses = computed(() => analysesStore.items.filter((a) => a.aquariumId === profile.value?.id || a.aquariumName === profile.value?.name))
const latestAnalysis = computed(() => profileAnalyses.value[0] || null)
const latestScore = computed(() => latestAnalysis.value?.score ?? null)
const healthLabel = computed(() => {
  if (latestScore.value === null) return 'Noch offen'
  if (latestScore.value >= 96) return 'Sehr stabil'
  if (latestScore.value >= 88) return 'Beobachten'
  return 'Korrektur nötig'
})
const healthRingStyle = computed(() => {
  const score = latestScore.value ?? 0
  const color = score >= 96 ? '#10b981' : score >= 88 ? '#f59e0b' : '#e85d4f'
  return { background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.18) 0deg)` }
})
const editPhotoLabel = computed(() => {
  if (!editForm.value.image) return 'Noch kein Foto ausgewählt'
  return AQUARIUM_PRESETS.some((preset) => preset.dataUrl === editForm.value.image) ? 'Galerie-Motiv ausgewählt' : 'Eigenes Foto ausgewählt'
})

const profileMetrics = computed(() => [
  { label: 'Volumen', value: `${profile.value.net_volume || '—'} L`, caption: 'Nettovolumen' },
  { label: 'Analysen', value: profileAnalyses.value.length, caption: 'Laborberichte' },
  { label: 'Letzter Score', value: latestScore.value === null ? '—' : `${latestScore.value}%`, caption: healthLabel.value },
  { label: 'Intervall', value: analysisInterval.value, caption: 'zwischen Checks' },
])
const waterDetailSummary = computed(() => profile.value ? waterTypeSummary(profile.value) : [])
const availableOsmosisSources = computed(() => aquariums.osmosisSources.filter((source) => source.id !== profile.value?.id))
const linkedOsmosisSource = computed(() => {
  if (!profile.value?.osmosis_source_id) return null
  return aquariums.byId(profile.value.osmosis_source_id)
})
const analysisInterval = computed(() => {
  if (profileAnalyses.value.length < 2) return '—'
  const [latest, previous] = profileAnalyses.value
  const days = Math.round((new Date(latest.createdAt) - new Date(previous.createdAt)) / 86400000)
  return `${Math.abs(days)} Tage`
})
const systemSpecs = computed(() => [
  { label: 'Wassertyp', value: profile.value.water_type },
  { label: 'Beckentyp', value: profile.value.aquarium_type || 'Nicht gesetzt' },
  { label: 'Abmessungen', value: profile.value.dimensions || 'Nicht gesetzt' },
  { label: 'Zielwerte', value: profile.value.target_mode === 'custom' ? 'Eigene Zielwerte' : 'ATI Defaults' },
  { label: 'Besatzdichte', value: profile.value.stocking_density || 'Nicht gesetzt' },
  { label: 'Technikbecken', value: profile.value.sump ? 'Ja' : 'Nein' },
  { label: 'Algenrefugium', value: profile.value.refugium ? 'Ja' : 'Nein' },
  { label: 'Abschäumer', value: profile.value.skimmer ? (profile.value.skimmer_model || 'Ja') : 'Nein' },
  { label: 'Erstellt', value: formatDate(profile.value.createdAt) },
  { label: 'Osmosequelle', value: osmosisSpecValue.value },
  { label: 'Versorgung', value: profile.value.water_type === 'Osmosewasser' ? 'RO/DI Kontrolle' : (profile.value.supply_system || 'ATI Essentials Pro') },
  { label: 'Licht', value: profile.value.lighting_type || (profile.value.aquarium_type === 'SPS' ? 'High PAR' : 'Standard Profil') },
])
const osmosisSpecValue = computed(() => {
  if (profile.value.water_type === 'Osmosewasser') return 'Ist Quelle'
  return linkedOsmosisSource.value?.name || 'Nicht verknüpft'
})
const topIssues = computed(() => {
  const latest = latestAnalysis.value
  if (!latest?.issueCount) return []
  const labels = latest.score < 86 ? ['NO3 / PO4', 'Silikat'] : ['Jod', 'Eisen / Mangan']
  return labels.map((label, index) => ({
    label,
    value: index === 0 ? 'Priorität' : 'Prüfen',
    tone: latest.score < 86 ? 'critical' : 'watch',
  }))
})
const targetValues = computed(() => {
  if (profile.value.water_type === 'Osmosewasser') {
    return [
      { name: 'Silikat', range: '0-0.08 mg/L', note: 'Harzfilter Indikator' },
      { name: 'Phosphat', range: '0-0.03 mg/L', note: 'RO Reinheit' },
      { name: 'Salinität', range: '0-0.1 ppt', note: 'keine Beimischung' },
      { name: 'Metalle', range: '< LOD', note: 'Leitungswasser-Check' },
    ]
  }
  if (profile.value.water_type === 'Süßwasser') {
    return [
      { name: 'Nitrat', range: '5-30 mg/L', note: 'Pflanzenversorgung' },
      { name: 'Phosphat', range: '0.05-0.8 mg/L', note: 'Makro Balance' },
      { name: 'Calcium', range: '50-120 mg/L', note: 'GH Baustein' },
      { name: 'Magnesium', range: '15-40 mg/L', note: 'Pflanzenstoffwechsel' },
    ]
  }
  return [
    { name: 'Calcium', range: '380-450 mg/L', note: 'Korallenwachstum' },
    { name: 'Magnesium', range: '1200-1400 mg/L', note: 'Ionische Stabilität' },
    { name: 'Alkalinität', range: '7-9.5 dKH', note: 'pH Puffer' },
    { name: 'Phosphat', range: '0.01-0.1 mg/L', note: 'Nährstoffkontrolle' },
  ]
})
const chartAnalyses = computed(() => {
  const scored = profileAnalyses.value.filter((a) => a.score !== null && a.score !== undefined)
  if (scored.length) return scored
  return [
    { createdAt: new Date(Date.now() - 1000 * 86400 * 60).toISOString(), score: 82 },
    { createdAt: new Date(Date.now() - 1000 * 86400 * 35).toISOString(), score: 88 },
    { createdAt: new Date(Date.now() - 1000 * 86400 * 12).toISOString(), score: latestScore.value || 90 },
  ]
})
const scoreChartData = computed(() => ({
  labels: [...chartAnalyses.value].reverse().map(a => new Date(a.createdAt).toLocaleDateString('de-DE', { month: 'short', day: '2-digit' })),
  datasets: [{
    data: [...chartAnalyses.value].reverse().map(a => a.score),
    borderColor: '#0072CE',
    backgroundColor: 'rgba(136,193,233,0.08)',
    borderWidth: 3,
    fill: true,
    tension: 0.35,
    pointRadius: 5,
    pointBackgroundColor: '#fff',
    pointBorderColor: '#0072CE',
    pointBorderWidth: 2,
  }],
}))
const scoreChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#5b7a99', font: { size: 11 } } },
    y: { min: 70, max: 100, grid: { color: '#e9f1fb' }, ticks: { color: '#5b7a99', callback: v => `${v}%` } },
  },
}

function startEdit() {
  editForm.value = { ...profile.value }
  saveError.value = ''
  photoError.value = ''
  showEditPresetPicker.value = false
  editing.value = true
}
function cancelEdit() {
  editing.value = false
  showEditPresetPicker.value = false
  photoError.value = ''
}
function selectEditPreset(preset) {
  editForm.value.image = preset.dataUrl
  photoError.value = ''
  showEditPresetPicker.value = false
}
function clearEditPhoto() {
  editForm.value.image = null
  photoError.value = ''
}
async function onEditPhoto(e) {
  const file = e.target.files?.[0]
  if (!file) return
  photoError.value = ''
  try {
    editForm.value.image = await fileToResizedDataUrl(file)
  } catch (err) {
    photoError.value = err.error || 'Foto konnte nicht geladen werden.'
  }
  e.target.value = ''
}
function themeFor(f) {
  if (f.aquarium_type === 'SPS') return 'reef-sps'
  return { 'Meerwasser': 'reef-mixed', 'Süßwasser': 'freshwater', 'Osmosewasser': 'osmosis', 'Meersalz': 'reef-sps', 'Aquakultur': 'freshwater' }[f.water_type] || 'reef-mixed'
}
function save() {
  saving.value = true
  saveError.value = ''
  try {
    aquariums.update(profile.value.id, { ...editForm.value, image_theme: themeFor(editForm.value) })
    editing.value = false
    showEditPresetPicker.value = false
  } catch (e) {
    saveError.value = e.error || 'Speichern fehlgeschlagen'
  } finally {
    saving.value = false
  }
}
function deleteProfile() {
  aquariums.remove(profile.value.id)
  router.push('/aquariums')
}
function analysisTone(a) {
  if ((a.score ?? 100) < 86 || (a.issueCount || 0) >= 3) return 'critical'
  if ((a.score ?? 100) < 96 || (a.issueCount || 0) > 0) return 'watch'
  return 'good'
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }
function osmosisSourceMeta(source) {
  const details = source?.water_details || {}
  return [
    details.ro_product,
    details.ro_capacity_lpd ? `${details.ro_capacity_lpd} l/Tag` : '',
    details.resin_filter ? 'Harzfilter' : '',
  ].filter(Boolean).join(' · ') || `${source?.net_volume || '—'} L`
}
</script>

<style scoped>
.back-link { display: inline-flex; margin-bottom: 16px; color: var(--teal-700); font-weight: var(--fw-extra-bold, 800); }
.missing-card { max-width: 460px; padding: 24px; text-align: center; }
.tank-thumb { width: 100%; height: 100%; background: linear-gradient(150deg, var(--brand-blue), var(--brand-cyan)); }
.tank-thumb.reef-sps { background: linear-gradient(150deg, #0a1b43, var(--brand-cyan)); }
.tank-thumb.freshwater { background: linear-gradient(150deg, #0f766e, #34d399); }
.tank-thumb.osmosis { background: linear-gradient(150deg, #164e63, #67e8f9); }
.card { border-radius: var(--radius); background: rgba(255,255,255,0.9); border: 1px solid rgba(136,193,233,0.18); box-shadow: var(--shadow); }
.tank-hero {
  display: grid;
  grid-template-columns: minmax(min(100%, 220px), 270px) minmax(min(100%, 420px), 1fr) minmax(min(100%, 300px), 330px);
  gap: 24px;
  align-items: stretch;
  padding: 26px;
  margin-bottom: 18px;
  border-radius: 30px;
  background:
    linear-gradient(105deg, rgba(10,27,67,0.98), rgba(10,27,67,0.9) 45%, rgba(10,27,67,0.54)),
    url('/reef-tank.webp') center bottom / cover;
  color: #fff;
  box-shadow: 0 30px 86px rgba(10,27,67,0.24);
  overflow: hidden;
  position: relative;
  width: 100%;
  min-width: 0;
}
.tank-hero::after { content: ''; position: absolute; right: 34%; top: 0; bottom: 0; width: 1px; background: linear-gradient(transparent, rgba(136,193,233,0.42), transparent); }
.tank-hero-visual,
.tank-hero-copy,
.tank-health-card { position: relative; z-index: 1; min-width: 0; }
.tank-hero-visual { min-height: 230px; border-radius: 24px; overflow: hidden; box-shadow: 0 28px 80px rgba(0,0,0,0.28); }
.tank-hero-visual img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tank-hero-visual span { position: absolute; left: 16px; top: 16px; padding: 6px 11px; border-radius: 999px; background: rgba(10,27,67,0.58); color: #fff; font-size: 11px; font-weight: 800; backdrop-filter: blur(12px); }
.tank-hero-copy { align-self: center; }
.hero-kicker { color: var(--teal-200); font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 8px; }
.tank-hero h1 { max-width: 100%; overflow-wrap: anywhere; font-size: clamp(34px, 4.5vw, 56px); line-height: 0.98; font-weight: 800; letter-spacing: -0.055em; margin-bottom: 12px; }
.tank-hero p { max-width: 580px; overflow-wrap: anywhere; color: rgba(255,255,255,0.72); font-size: 15px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.btn-ghost { background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.18); }
.btn-danger { background: #e85d4f; color: #fff; border: 0; }
.tank-health-card { align-self: center; display: grid; grid-template-columns: 122px 1fr; gap: 16px; align-items: center; padding: 20px; border-radius: 24px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.16); backdrop-filter: blur(18px); }
.health-ring { width: 122px; height: 122px; border-radius: 50%; display: grid; place-items: center; position: relative; }
.health-ring::after { content: ''; position: absolute; inset: 11px; border-radius: 50%; background: linear-gradient(rgba(10,27,67,0.9), rgba(10,27,67,0.94)), url('/reef-tank.webp') center / cover; }
.health-ring strong,
.health-ring span { position: relative; z-index: 1; }
.health-ring strong { align-self: end; font-size: 38px; font-weight: 800; letter-spacing: -0.06em; }
.health-ring span { align-self: start; margin-top: -8px; color: rgba(255,255,255,0.62); font-size: 12px; font-weight: 800; }
.tank-health-card span { display: block; color: var(--teal-200); font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.tank-health-card strong { display: block; margin-top: 5px; font-size: 22px; line-height: 1.05; font-weight: 800; }
.tank-health-card em { display: block; margin-top: 8px; color: rgba(255,255,255,0.66); font-size: 12px; font-style: normal; font-weight: 800; }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); gap: 14px; width: 100%; min-width: 0; margin-bottom: 20px; }
.metric-card { padding: 18px; border-radius: var(--radius); background: rgba(255,255,255,0.76); border: 1px solid rgba(255,255,255,0.78); box-shadow: var(--shadow); }
.metric-card span { display: block; color: var(--text-muted); font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.metric-card strong { display: block; margin-top: 5px; color: var(--text); font-size: 28px; line-height: 1; font-weight: 800; letter-spacing: -0.04em; }
.metric-card em { display: block; margin-top: 6px; color: var(--teal-700); font-size: 12px; font-style: normal; font-weight: 700; }
.detail-layout { display: grid; grid-template-columns: minmax(min(100%, 560px), 1fr) minmax(min(100%, 320px), 0.42fr); gap: 22px; align-items: start; width: 100%; min-width: 0; }
.main-column,
.side-column { display: grid; gap: 18px; min-width: 0; }
.side-column { position: sticky; top: 98px; }
.lab-panel,
.target-panel,
.system-card,
.source-card,
.attention-card,
.action-card,
.edit-card { padding: 20px; }
.section-header { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; margin-bottom: 16px; }
.section-title { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.025em; }
.section-sub { color: var(--text-muted); font-size: 12px; font-weight: 700; margin-top: 2px; }
.section-link { color: var(--brand-blue); font-size: 13px; font-weight: 800; white-space: nowrap; }
.section-link.as-button { border: 0; background: none; cursor: pointer; padding: 0; }
.score-chart { height: 280px; margin-bottom: 18px; }
.analysis-timeline { display: grid; gap: 9px; }
.timeline-row { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 13px; border-radius: 18px; color: inherit; text-decoration: none; background: rgba(255,255,255,0.68); border: 1px solid var(--border); }
.timeline-row:hover { background: var(--teal-50); }
.timeline-dot { width: 10px; height: 10px; border-radius: 50%; background: #10b981; }
.timeline-row.watch .timeline-dot { background: #f59e0b; }
.timeline-row.critical .timeline-dot { background: #e85d4f; }
.timeline-row strong { display: block; color: var(--text); font-size: 13px; font-weight: 800; }
.timeline-row em { display: block; color: var(--text-muted); font-size: 11px; font-style: normal; font-weight: 700; }
.timeline-row b { color: var(--text); font-size: 14px; }
.timeline-row small { color: var(--text-muted); font-weight: 800; }
.timeline-empty { padding: 18px; border-radius: 18px; background: rgba(136,193,233,0.1); border: 1px dashed rgba(136,193,233,0.42); }
.timeline-empty strong,
.timeline-empty span { display: block; }
.timeline-empty span { margin-top: 5px; color: var(--text-muted); font-size: 13px; }
.target-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); gap: 12px; }
.target-card { padding: 14px; border-radius: 18px; background: rgba(236,255,251,0.76); border: 1px solid var(--border); }
.target-card span { display: block; color: var(--text-muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
.target-card strong { display: block; margin-top: 5px; color: var(--text); font-size: 16px; font-weight: 800; }
.target-card em { display: block; margin-top: 5px; color: var(--teal-700); font-size: 12px; font-style: normal; font-weight: 800; }
.water-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.water-summary-card { padding: 14px; border-radius: 18px; background: rgba(238,245,251,0.72); border: 1px solid var(--border); }
.water-summary-card span,
.water-summary-card strong,
.water-summary-card em { display: block; }
.water-summary-card span { color: var(--teal-700); font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.water-summary-card strong { margin-top: 5px; color: var(--text); font-size: 13px; font-weight: 800; }
.water-summary-card em { margin-top: 4px; color: var(--text-muted); font-size: 12px; font-style: normal; font-weight: 700; overflow-wrap: anywhere; }
.badge { display: inline-flex; padding: 6px 10px; border-radius: 999px; background: var(--teal-100); color: var(--teal-800); font-size: 11px; font-weight: 800; }
.spec-list { display: grid; gap: 10px; margin-top: 14px; }
.spec-list div { display: flex; justify-content: space-between; gap: 14px; padding: 12px; border-radius: 14px; background: rgba(255,255,255,0.66); border: 1px solid var(--border); }
.spec-list span { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.spec-list strong { color: var(--text); font-size: 13px; text-align: right; }
.source-box { display: grid; gap: 6px; margin-top: 14px; padding: 15px; border-radius: 18px; background: linear-gradient(135deg, rgba(236,255,251,0.9), rgba(238,245,251,0.86)); border: 1px solid rgba(136,193,233,0.35); }
.source-box span { color: var(--teal-700); font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.source-box strong { color: var(--text); font-size: 15px; font-weight: 800; }
.source-box em { color: var(--text-muted); font-size: 12px; font-style: normal; font-weight: 700; }
.source-box a { margin-top: 4px; color: var(--brand-blue); font-size: 12px; font-weight: 800; }
.source-empty { margin-top: 14px; padding: 14px; border-radius: 18px; background: rgba(136,193,233,0.1); border: 1px dashed rgba(136,193,233,0.42); }
.source-empty strong,
.source-empty span { display: block; }
.source-empty strong { color: var(--text); font-size: 13px; font-weight: 800; }
.source-empty span { margin-top: 4px; color: var(--text-muted); font-size: 12px; line-height: 1.45; }
.issue-list { display: grid; gap: 9px; margin-top: 14px; }
.issue-pill { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border-radius: 16px; background: #fff7ed; border: 1px solid #fde68a; }
.issue-pill.critical { background: #fdecea; border-color: #f8c9c4; }
.issue-pill span { color: var(--text); font-size: 13px; font-weight: 800; }
.issue-pill strong { color: var(--text-muted); font-size: 12px; }
.clean-note { margin-top: 14px; padding: 14px; border-radius: 18px; background: #dcfce7; color: #065f46; }
.clean-note strong,
.clean-note span { display: block; }
.clean-note span { margin-top: 4px; font-size: 12px; }
.quick-actions { display: grid; gap: 9px; margin-top: 14px; }
.quick-actions a { display: block; padding: 12px; border-radius: 15px; background: rgba(255,255,255,0.68); border: 1px solid var(--border); color: var(--teal-700); font-size: 13px; font-weight: 800; }
.quick-actions a:hover { background: var(--teal-50); }
.edit-card { max-width: 980px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 7px; }
.form-group.wide { grid-column: 1 / -1; }
.form-group label { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.form-group input,
.form-group select,
.form-group textarea { width: 100%; min-height: 46px; padding: 0 13px; border: 1px solid var(--border); border-radius: 13px; background: #fff; color: var(--text); font-size: 14px; outline: 0; }
.form-group textarea { padding: 12px 13px; resize: vertical; }
.check-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 10px; }
.check-grid.wide { grid-column: 1 / -1; }
.check-grid label { display: flex; gap: 8px; align-items: center; padding: 11px 12px; border: 1px solid var(--border); border-radius: 14px; background: rgba(255,255,255,0.66); color: var(--text); font-size: 13px; font-weight: var(--fw-semibold); }
.check-grid input { accent-color: var(--teal-500); }
.photo-edit { display: flex; align-items: center; gap: 16px; padding: 14px; border: 1px solid rgba(136,193,233,0.28); border-radius: 18px; background: linear-gradient(180deg, #fff, rgba(136,193,233,0.07)); }
.photo-preview { width: 132px; height: 94px; flex-shrink: 0; overflow: hidden; border-radius: 16px; border: 1px solid rgba(136,193,233,0.35); box-shadow: 0 12px 26px rgba(10,27,67,0.1); }
.photo-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.photo-edit-side { min-width: 0; display: flex; flex: 1; flex-direction: column; align-items: flex-start; gap: 10px; }
.photo-edit-copy { display: flex; flex-direction: column; gap: 3px; }
.photo-edit-copy strong { color: var(--text); font-size: 14px; font-weight: 800; }
.photo-edit-copy span { color: var(--text-muted); font-size: 12.5px; line-height: 1.4; }
.photo-edit-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.form-group .photo-upload-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 14px; border: 0; border-radius: 999px; background: linear-gradient(135deg, var(--brand-blue), var(--teal-500)); color: #fff; font-size: 12px; font-weight: 800; line-height: 1; cursor: pointer; box-shadow: 0 10px 22px rgba(0,133,220,0.22); }
.form-group .photo-upload-btn:hover { color: #fff; filter: brightness(1.03); }
.photo-gallery-btn { min-height: 38px; padding: 0 13px; border: 1px solid var(--border); border-radius: 999px; background: #fff; color: var(--brand-blue); font-size: 12px; font-weight: 800; cursor: pointer; }
.photo-gallery-btn:hover { border-color: var(--teal-400); color: var(--teal-600); }
.photo-remove { min-height: 38px; padding: 0 10px; border: 0; background: none; color: #c5392c; font-size: 12px; font-weight: 800; cursor: pointer; }
.form-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.confirm-overlay { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; padding: 20px; background: rgba(10,27,67,0.52); }
.confirm-card { max-width: 420px; padding: 22px; }
.confirm-card h3 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
.confirm-card p { color: var(--text-muted); line-height: 1.55; }
.preset-overlay { position: fixed; inset: 0; z-index: 320; display: grid; place-items: center; padding: 24px; background: rgba(10,27,67,0.42); backdrop-filter: blur(6px); }
.preset-card { width: min(780px, 100%); max-height: min(760px, calc(100vh - 48px)); overflow: auto; border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.28); box-shadow: 0 28px 70px rgba(10,27,67,0.28); }
.preset-head { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 20px 22px 16px; background: rgba(255,255,255,0.96); border-bottom: 1px solid var(--border); }
.preset-head span { display: block; margin-bottom: 4px; color: var(--brand-blue); font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.preset-head h3 { color: var(--text); font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
.preset-close { display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0; border: 1px solid var(--border); border-radius: 12px; background: #fff; color: var(--text); font-size: 24px; line-height: 1; cursor: pointer; }
.preset-close:hover { border-color: var(--teal-400); color: var(--brand-blue); }
.preset-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 18px 22px 22px; }
.preset-option { position: relative; min-width: 0; height: 130px; overflow: hidden; border: 2px solid transparent; border-radius: 14px; background: #fff; cursor: pointer; box-shadow: 0 10px 24px rgba(10,27,67,0.08); transition: border-color 0.16s, transform 0.16s, box-shadow 0.16s; }
.preset-option:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(10,27,67,0.12); }
.preset-option.active { border-color: var(--teal-400); box-shadow: 0 0 0 3px rgba(136,193,233,0.24), 0 14px 28px rgba(10,27,67,0.12); }
.preset-option img { width: 100%; height: 100%; object-fit: cover; display: block; }
.preset-option span { position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 1; padding: 4px 7px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,0.92); color: var(--text); font-size: 10.5px; font-weight: 800; line-height: 1.1; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 1180px) {
  .tank-hero,
  .detail-layout { grid-template-columns: 1fr; }
  .tank-hero::after { display: none; }
  .tank-hero-visual { min-height: 220px; }
  .tank-health-card { width: 100%; max-width: 460px; }
  .side-column { position: static; }
}
@media (max-width: 760px) {
  .tank-hero { gap: 18px; padding: 18px; border-radius: 24px; }
  .tank-hero-visual { width: 100%; min-height: 190px; border-radius: 20px; }
  .tank-hero h1 { font-size: 34px; line-height: 1.02; }
  .hero-actions { flex-direction: column; }
  .hero-actions .btn { width: 100%; }
  .tank-health-card { grid-template-columns: 100px minmax(0, 1fr); gap: 14px; padding: 16px; border-radius: 20px; }
  .health-ring { width: 100px; height: 100px; }
  .tank-health-card strong { font-size: 19px; }
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .metric-card { min-width: 0; padding: 15px; }
  .metric-card strong { font-size: 24px; }
  .lab-panel,
  .target-panel,
  .system-card,
  .source-card,
  .attention-card,
  .action-card,
  .edit-card { width: 100%; min-width: 0; padding: 16px; }
  .section-header { flex-wrap: wrap; }
  .score-chart { height: 220px; }
  .timeline-row { grid-template-columns: 12px 1fr auto; }
  .timeline-row small { grid-column: 2 / -1; }
  .photo-edit { align-items: flex-start; }
  .photo-preview { width: 108px; height: 86px; }
  .preset-overlay { padding: 14px; align-items: end; }
  .preset-card { max-height: min(720px, calc(100vh - 28px)); border-radius: 22px 22px 0 0; }
  .preset-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 14px; gap: 10px; }
  .preset-option { height: 112px; }
}
</style>
