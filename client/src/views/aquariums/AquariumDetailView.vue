<template>
  <div class="aqd">
    <RouterLink to="/aquariums" class="back-link">← Zurück zu den Aquarien</RouterLink>

    <div v-if="!aquarium" class="aqd-missing">
      <h2>Aquarium nicht gefunden</h2>
      <p>Dieses Aquarium existiert nicht (mehr).</p>
      <RouterLink to="/aquariums" class="btn btn-primary">Zur Übersicht</RouterLink>
    </div>

    <template v-else>
      <section class="aqd-hero">
        <div :class="`aqd-hero-thumb ${aquarium.image_theme}`"></div>
        <div class="aqd-hero-copy">
          <span :class="['aqd-hero-badge', waterClass(aquarium.water_type)]">{{ aquarium.water_type }}</span>
          <h1>{{ aquarium.name }}</h1>
          <p>{{ aquarium.net_volume ? `${aquarium.net_volume} L` : 'Volumen offen' }}<template v-if="aquarium.aquarium_type"> · {{ aquarium.aquarium_type }}</template></p>
          <span class="aqd-hero-date">Angelegt: {{ formatDate(aquarium.createdAt) }}</span>
          <div v-if="!editing" class="aqd-hero-actions">
            <button class="btn btn-primary" type="button" @click="startEdit">Bearbeiten</button>
            <button class="aqd-delete-btn" type="button" @click="confirmDelete = true">Löschen</button>
          </div>
        </div>
      </section>

      <div v-if="!editing" class="aqd-read">
      <div class="aqd-grid">
        <div class="aqd-fact"><span>Wassertyp</span><strong>{{ aquarium.water_type }}</strong></div>
        <div class="aqd-fact"><span>Nettovolumen</span><strong>{{ aquarium.net_volume ? `${aquarium.net_volume} L` : '—' }}</strong></div>
        <div class="aqd-fact"><span>Beckentyp</span><strong>{{ aquarium.aquarium_type || '—' }}</strong></div>
        <div class="aqd-fact"><span>Maße</span><strong>{{ aquarium.dimensions || '—' }}</strong></div>
        <div class="aqd-fact"><span>Zielwerte</span><strong>{{ targetLabel }}</strong></div>
        <div class="aqd-fact"><span>Besatzdichte</span><strong>{{ aquarium.stocking_density || '—' }}</strong></div>
        <div class="aqd-fact"><span>Beleuchtung</span><strong>{{ aquarium.lighting_type || '—' }}</strong></div>
        <div class="aqd-fact"><span>Versorgungssystem</span><strong>{{ aquarium.supply_system || '—' }}</strong></div>
      </div>

      <div class="aqd-tech">
        <span class="aqd-section-label">Technik</span>
        <div class="aqd-chips">
          <span v-if="aquarium.sump" class="aqd-chip">Technikbecken</span>
          <span v-if="aquarium.refugium" class="aqd-chip">Algenrefugium</span>
          <span v-if="aquarium.skimmer" class="aqd-chip">Eiweißabschäumer<template v-if="aquarium.skimmer_model"> · {{ aquarium.skimmer_model }}</template></span>
          <span v-if="!aquarium.sump && !aquarium.refugium && !aquarium.skimmer" class="aqd-chip aqd-chip-muted">Keine Angaben</span>
        </div>
      </div>

      <div v-if="aquarium.notes" class="aqd-notes">
        <span class="aqd-section-label">Notizen</span>
        <p>{{ aquarium.notes }}</p>
      </div>
      </div>

      <section v-else class="aqd-edit">
        <p v-if="error" class="aqd-alert">{{ error }}</p>
        <form @submit.prevent="saveEdit">
          <div class="form-group">
            <label>Name</label>
            <input v-model="editForm.name" type="text" required />
          </div>
          <div class="form-row">
            <div class="form-group"><label>Wassertyp</label>
              <select v-model="editForm.water_type"><option>Meerwasser</option><option>Süßwasser</option><option>Osmosewasser</option><option>Meersalz</option></select>
            </div>
            <div class="form-group"><label>Nettovolumen (L)</label><input v-model.number="editForm.net_volume" type="number" min="1" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Beckentyp</label>
              <select v-model="editForm.aquarium_type"><option value="">Bitte wählen</option><option>Mischbecken</option><option>SPS</option><option>LPS</option><option>Weichkorallen</option><option>Fischbecken</option></select>
            </div>
            <div class="form-group"><label>Maße</label><input v-model="editForm.dimensions" type="text" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Zielwerte</label>
              <select v-model="editForm.target_mode"><option value="ati">ATI Empfehlung</option><option value="natural">Natürliches Meerwasser</option><option value="custom">Eigene Zielwerte</option></select>
            </div>
            <div class="form-group"><label>Besatzdichte</label>
              <select v-model="editForm.stocking_density"><option value="">Bitte wählen</option><option>Gering</option><option>Mittel</option><option>Hoch</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Beleuchtung</label>
              <select v-model="editForm.lighting_type"><option value="">Bitte wählen</option><option>LED</option><option>T5</option><option>Hybrid</option><option>Halogen</option></select>
            </div>
            <div class="form-group"><label>Versorgungssystem</label><input v-model="editForm.supply_system" type="text" /></div>
          </div>
          <div class="check-grid">
            <label :class="{ on: editForm.sump }"><input v-model="editForm.sump" type="checkbox" /> Technikbecken</label>
            <label :class="{ on: editForm.refugium }"><input v-model="editForm.refugium" type="checkbox" /> Algenrefugium</label>
            <label :class="{ on: editForm.skimmer }"><input v-model="editForm.skimmer" type="checkbox" /> Eiweißabschäumer</label>
          </div>
          <div v-if="editForm.skimmer" class="form-group"><label>Abschäumer Modell</label><input v-model="editForm.skimmer_model" type="text" /></div>
          <div class="form-group"><label>Notizen</label><textarea v-model="editForm.notes" rows="2"></textarea></div>

          <div class="aqd-edit-foot">
            <button type="button" class="btn btn-ghost" @click="cancelEdit">Abbrechen</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Wird gespeichert…' : 'Speichern' }}</button>
          </div>
        </form>
      </section>

      <div v-if="confirmDelete" class="aqd-confirm-overlay" @click.self="confirmDelete = false">
        <div class="aqd-confirm">
          <h3>Aquarium löschen?</h3>
          <p>„{{ aquarium.name }}“ wird dauerhaft entfernt. Das kann nicht rückgängig gemacht werden.</p>
          <div class="aqd-confirm-foot">
            <button type="button" class="btn btn-ghost" @click="confirmDelete = false">Abbrechen</button>
            <button type="button" class="aqd-delete-btn" @click="removeAquarium">Endgültig löschen</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAquariumsStore } from '@/stores/aquariums'

const route = useRoute()
const router = useRouter()
const aquariums = useAquariumsStore()
onMounted(() => { if (!aquariums.items.length) aquariums.load() })

const aquarium = computed(() => aquariums.byId(route.params.id))

// ── Bearbeiten ──
const editing = ref(false)
const editForm = ref({})
const saving = ref(false)
const error = ref('')

function themeFor(f) {
  if (f.aquarium_type === 'SPS') return 'reef-sps'
  return { 'Meerwasser': 'reef-mixed', 'Süßwasser': 'freshwater', 'Osmosewasser': 'osmosis', 'Meersalz': 'reef-sps' }[f.water_type] || 'reef-mixed'
}

function startEdit() {
  editForm.value = { ...aquarium.value }
  error.value = ''
  editing.value = true
}
function cancelEdit() { editing.value = false }

// ── Löschen ──
const confirmDelete = ref(false)
function removeAquarium() {
  aquariums.remove(aquarium.value.id)
  router.push('/aquariums')
}
function saveEdit() {
  error.value = ''
  if (!editForm.value.name?.trim()) { error.value = 'Bitte einen Namen angeben.'; return }
  if (!editForm.value.net_volume || editForm.value.net_volume < 1) { error.value = 'Bitte ein gültiges Nettovolumen angeben.'; return }
  saving.value = true
  try {
    aquariums.update(aquarium.value.id, { ...editForm.value, image_theme: themeFor(editForm.value) })
    editing.value = false
  } catch (e) {
    error.value = e.error || 'Fehler beim Speichern.'
  } finally {
    saving.value = false
  }
}

const TARGET_LABELS = { ati: 'ATI Empfehlung', natural: 'Natürliches Meerwasser', custom: 'Eigene Zielwerte' }
const targetLabel = computed(() => TARGET_LABELS[aquarium.value?.target_mode] || '—')

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Wassertyp → sichere CSS-Klasse für die Badge-Färbung (einheitlich mit der Liste).
function waterClass(type) {
  return { 'Meerwasser': 'wt-sea', 'Süßwasser': 'wt-fresh', 'Osmosewasser': 'wt-osmo', 'Meersalz': 'wt-salt' }[type] || 'wt-sea'
}
</script>

<style scoped>
.back-link { display: inline-flex; margin-bottom: 16px; color: var(--text-muted); font-size: 13px; font-weight: var(--fw-semibold); text-decoration: none; }
.back-link:hover { color: var(--brand-blue); }

.aqd-missing { max-width: 460px; margin: 40px auto; text-align: center; }
.aqd-missing h2 { font-size: 24px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
.aqd-missing p { color: var(--text-muted); margin-bottom: 20px; }

.aqd-hero { display: flex; gap: 22px; align-items: stretch; margin-bottom: 22px; padding: 20px; border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.aqd-hero-thumb { position: relative; overflow: hidden; width: 180px; flex-shrink: 0; border-radius: 18px; background: linear-gradient(150deg, var(--brand-blue), #0a1b43); }
.aqd-hero-thumb::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(10,27,67,0.25)); }
.aqd-hero-thumb.reef-mixed { background: linear-gradient(150deg, var(--brand-blue), var(--brand-cyan)); }
.aqd-hero-thumb.reef-sps { background: linear-gradient(150deg, #0a1b43, var(--brand-cyan)); }
.aqd-hero-thumb.freshwater { background: linear-gradient(150deg, #0f766e, #34d399); }
.aqd-hero-thumb.osmosis { background: linear-gradient(150deg, #164e63, #67e8f9); }
.aqd-hero-copy { display: flex; flex-direction: column; justify-content: center; gap: 6px; }
.aqd-hero-badge { align-self: flex-start; padding: 4px 11px; border-radius: 999px; background: rgba(136,193,233,0.16); color: var(--brand-blue); font-size: 11px; font-weight: 800; }
.aqd-hero-badge.wt-sea { color: var(--brand-blue); }
.aqd-hero-badge.wt-fresh { color: #0f766e; }
.aqd-hero-badge.wt-osmo { color: #0e7490; }
.aqd-hero-badge.wt-salt { color: #7c3aed; }
.aqd-hero-copy h1 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; letter-spacing: -0.03em; color: var(--text); }
.aqd-hero-copy p { color: var(--text-muted); font-size: 15px; }
.aqd-hero-date { color: var(--text-muted); font-size: 12px; }

.aqd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: 12px; margin-bottom: 22px; }
.aqd-fact { padding: 16px; border-radius: 16px; background: #fff; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 5px; }
.aqd-fact span { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-muted); }
.aqd-fact strong { font-size: 15px; font-weight: 700; color: var(--text); }

.aqd-section-label { display: block; margin-bottom: 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand-blue); }
.aqd-tech { margin-bottom: 22px; }
.aqd-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.aqd-chip { padding: 8px 14px; border-radius: 999px; background: rgba(136,193,233,0.12); border: 1px solid rgba(136,193,233,0.24); color: var(--brand-blue); font-size: 13px; font-weight: 700; }
.aqd-chip-muted { background: none; border-color: var(--border); color: var(--text-muted); }

.aqd-notes { padding: 18px; border-radius: 18px; background: #fff; border: 1px solid var(--border); }
.aqd-notes p { color: var(--text); font-size: 14px; line-height: 1.6; }

/* Bearbeiten */
.aqd-hero-actions { margin-top: 8px; }
.aqd-edit { padding: clamp(20px, 3vw, 28px); border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.aqd-alert { margin-bottom: 14px; padding: 11px 14px; border-radius: 12px; background: #fdecea; color: #c5392c; font-size: 13px; font-weight: 600; }
.aqd-edit .form-group { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }
.aqd-edit label { font-size: 12px; font-weight: var(--fw-semibold); color: var(--text-muted); }
.aqd-edit input, .aqd-edit select, .aqd-edit textarea { width: 100%; height: 46px; padding: 0 13px; border: 1px solid var(--border); border-radius: 12px; background: #fff; color: var(--text); font-size: 14px; outline: 0; transition: border-color 0.18s, box-shadow 0.18s; }
.aqd-edit textarea { height: auto; padding: 11px 13px; resize: vertical; }
.aqd-edit input:focus, .aqd-edit select:focus, .aqd-edit textarea:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.aqd-edit .form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.aqd-edit .check-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 4px 0 14px; }
.aqd-edit .check-grid label { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border: 1px solid var(--border); border-radius: 12px; color: var(--text); font-size: 13px; font-weight: var(--fw-semibold); cursor: pointer; }
.aqd-edit .check-grid label.on { border-color: var(--teal-400); background: rgba(136,193,233,0.12); color: var(--brand-blue); }
.aqd-edit .check-grid input { width: auto; height: auto; accent-color: var(--teal-500); }
.aqd-edit-foot { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
@media (max-width: 560px) { .aqd-edit .form-row, .aqd-edit .check-grid { grid-template-columns: 1fr; } }

/* Löschen */
.aqd-delete-btn { height: 42px; padding: 0 18px; border-radius: 12px; border: 1px solid #e85d4f; background: #fdecea; color: #c5392c; font-size: 14px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
.aqd-delete-btn:hover { background: #e85d4f; color: #fff; }
.aqd-confirm-overlay { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; padding: 20px; background: rgba(10,27,67,0.45); backdrop-filter: blur(4px); }
.aqd-confirm { width: min(420px, 100%); padding: 26px; border-radius: 22px; background: #fff; box-shadow: 0 28px 80px rgba(10,27,67,0.3); }
.aqd-confirm h3 { font-size: 20px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
.aqd-confirm p { color: var(--text-muted); font-size: 14px; line-height: 1.6; margin-bottom: 22px; }
.aqd-confirm-foot { display: flex; justify-content: flex-end; gap: 12px; }

@media (max-width: 620px) {
  .aqd-hero { flex-direction: column; }
  .aqd-hero-thumb { width: 100%; height: 120px; }
}
</style>
