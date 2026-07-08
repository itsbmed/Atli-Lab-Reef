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
        <div class="aqd-hero-thumb" :class="!aquarium.image && aquarium.image_theme">
          <img v-if="aquarium.image" :src="aquarium.image" alt="Aquarium-Foto" />
        </div>
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
        <div class="aqd-health">
          <div class="health-ring"><strong>—</strong></div>
          <div class="health-copy">
            <span>Letzter Lab-Score</span>
            <strong>Noch keine Analyse</strong>
            <em>Reichen Sie eine Wasserprobe ein.</em>
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

      <div class="aqd-history">
        <span class="aqd-section-label">Laborverlauf</span>
        <div class="aqd-history-empty">
          <span class="aqd-history-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M4 4v16h16"/><path d="M8 14l3-3 3 2 4-5"/></svg></span>
          <strong>Noch keine Analysen</strong>
          <p>Sobald die erste ICP-Analyse vorliegt, erscheinen hier Score, Verlauf und Hinweise.</p>
          <a class="btn btn-primary">Analyse registrieren</a>
        </div>
      </div>

      <div class="aqd-targets">
        <span class="aqd-section-label">Zielwert-Profil <em>ATI Standard</em></span>
        <div class="aqd-target-grid">
          <div class="aqd-target" v-for="t in targetValues" :key="t.name">
            <span>{{ t.name }}</span>
            <strong>{{ t.range }}</strong>
            <em>{{ t.note }}</em>
          </div>
        </div>
      </div>

      <div class="aqd-actions-card">
        <span class="aqd-section-label">Schnellaktionen</span>
        <div class="aqd-quick">
          <a class="aqd-quick-link">Analyse registrieren</a>
          <RouterLink to="/aquariums" class="aqd-quick-link">Zur Übersicht</RouterLink>
          <a class="aqd-quick-link">Tools öffnen</a>
        </div>
      </div>
      </div>

      <section v-else class="aqd-edit">
        <p v-if="error" class="aqd-alert">{{ error }}</p>
        <form @submit.prevent="saveEdit">
          <p class="aqd-edit-section">Grunddaten</p>
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
          <p class="aqd-edit-section">Becken &amp; Technik</p>
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

// ATI-Standard-Zielbereiche (statisch – echte Werte folgen mit der Analyse).
const targetValues = [
  { name: 'Calcium (Ca)', range: '420–440 mg/l', note: 'Gerüstbildung' },
  { name: 'Karbonhärte (KH)', range: '7,5–8,5 °dKH', note: 'Stabilität' },
  { name: 'Magnesium (Mg)', range: '1300–1400 mg/l', note: 'Ca/KH-Balance' },
  { name: 'Salinität', range: '34–35 PSU', note: 'Dichte' },
  { name: 'Nitrat (NO₃)', range: '2–10 mg/l', note: 'Nährstoffe' },
  { name: 'Phosphat (PO₄)', range: '0,02–0,1 mg/l', note: 'Nährstoffe' },
]

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
.aqd-hero-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
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
.aqd-health { margin-left: auto; align-self: center; flex-shrink: 0; display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 18px; background: rgba(136,193,233,0.08); border: 1px solid rgba(136,193,233,0.2); }
.health-ring { position: relative; display: grid; place-items: center; width: 62px; height: 62px; border-radius: 50%; background: conic-gradient(var(--brand-cyan) 0deg, rgba(136,193,233,0.2) 0deg); }
.health-ring::after { content: ''; position: absolute; inset: 6px; border-radius: 50%; background: #fff; }
.health-ring strong { position: relative; z-index: 1; font-size: 18px; font-weight: 800; color: var(--text-muted); }
.health-copy { display: flex; flex-direction: column; gap: 2px; }
.health-copy > span { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); }
.health-copy > strong { font-size: 14px; font-weight: 800; color: var(--text); }
.health-copy em { font-size: 11.5px; font-style: normal; color: var(--text-muted); }

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

.aqd-history { margin-top: 22px; }
.aqd-history-empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 36px 24px; border-radius: 20px; background: #fff; border: 1px dashed rgba(136,193,233,0.4); }
.aqd-history-ico { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 14px; border-radius: 15px; background: rgba(136,193,233,0.14); color: var(--brand-blue); }
.aqd-history-empty strong { margin-bottom: 6px; font-size: 16px; font-weight: 800; color: var(--text); }
.aqd-history-empty p { max-width: 360px; margin-bottom: 18px; color: var(--text-muted); font-size: 13px; line-height: 1.55; }

.aqd-targets { margin-top: 22px; }
.aqd-section-label em { margin-left: 6px; font-style: normal; font-size: 10px; font-weight: 700; color: var(--text-muted); }
.aqd-target-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.aqd-target { padding: 14px 16px; border-radius: 16px; background: #fff; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 3px; }
.aqd-target > span { font-size: 12px; font-weight: 700; color: var(--text); }
.aqd-target strong { font-size: 15px; font-weight: 800; color: var(--brand-blue); }
.aqd-target em { font-size: 11px; font-style: normal; color: var(--text-muted); }

.aqd-actions-card { margin-top: 22px; }
.aqd-quick { display: flex; flex-wrap: wrap; gap: 10px; }
.aqd-quick-link { padding: 12px 16px; border-radius: 12px; background: #fff; border: 1px solid var(--border); color: var(--text); font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; transition: border-color 0.15s, color 0.15s, transform 0.15s; }
.aqd-quick-link:hover { border-color: var(--teal-400); color: var(--brand-blue); transform: translateY(-2px); }

/* Bearbeiten */
.aqd-hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.aqd-edit { padding: clamp(20px, 3vw, 28px); border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.aqd-edit-section { margin: 0 0 12px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand-blue); }
.aqd-edit-section:not(:first-child) { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--border); }
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
  .aqd-health { margin-left: 0; width: 100%; }
  .aqd-hero-actions { width: 100%; }
  .aqd-hero-actions > * { flex: 1; text-align: center; }
  .aqd-edit-foot, .aqd-confirm-foot { flex-direction: column-reverse; }
  .aqd-edit-foot > *, .aqd-confirm-foot > * { width: 100%; }
}
</style>
