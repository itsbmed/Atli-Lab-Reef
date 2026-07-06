<template>
  <div class="act">
    <RouterLink to="/analyses" class="back-link">← Zurück zu den Analysen</RouterLink>

    <section class="act-hero">
      <div>
        <span class="act-kicker">Analyse registrieren</span>
        <h1>Testkit aktivieren</h1>
        <p>Barcode erfassen, Aquarium zuordnen und den passenden Analyseumfang wählen.</p>
      </div>
      <div class="act-meter">
        <strong>{{ stepIndex + 1 }} / {{ steps.length }}</strong>
        <span>{{ steps[stepIndex].label }}</span>
      </div>
    </section>

    <ol class="act-progress">
      <li v-for="(step, i) in steps" :key="step.key" :class="{ active: i === stepIndex, done: i < stepIndex }">
        <button type="button" :disabled="i > maxReached" @click="goTo(i)">
          <b>{{ i < stepIndex ? '✓' : i + 1 }}</b>
          <span>{{ step.label }}</span>
        </button>
      </li>
    </ol>

    <section class="act-stage">
      <div v-if="stepIndex === 0" class="act-step">
        <div class="act-step-head">
          <span>01</span>
          <div>
            <h2>Testkit erfassen</h2>
            <p>Den Barcode finden Sie auf dem ATI Testkit-Röhrchen.</p>
          </div>
        </div>
        <div class="scan-grid">
          <div class="scan-frame">
            <i></i><i></i><i></i><i></i>
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="16" height="16" />
              <rect x="22" y="2" width="16" height="16" />
              <rect x="2" y="22" width="16" height="16" />
              <rect x="6" y="6" width="8" height="8" fill="currentColor" />
              <rect x="26" y="6" width="8" height="8" fill="currentColor" />
              <rect x="6" y="26" width="8" height="8" fill="currentColor" />
            </svg>
          </div>
          <label class="field">
            <span>Barcode / QR-Code</span>
            <input v-model.trim="form.barcode" type="text" placeholder="ATI-2026-0001" autofocus />
            <em>Erlaubt sind Buchstaben, Zahlen und Bindestriche.</em>
          </label>
        </div>
      </div>

      <div v-else-if="stepIndex === 1" class="act-step">
        <div class="act-step-head">
          <span>02</span>
          <div>
            <h2>Aquarium zuordnen</h2>
            <p>Wählen Sie das Becken, aus dem die Probe entnommen wurde.</p>
          </div>
        </div>

        <div v-if="!aquariums.count" class="empty-inline">
          <strong>Noch kein Aquarium vorhanden</strong>
          <p>Legen Sie zuerst ein Aquarium an, damit die Analyse korrekt zugeordnet werden kann.</p>
          <RouterLink to="/aquariums/new" class="btn btn-primary">Aquarium anlegen</RouterLink>
        </div>
        <div v-else class="tank-grid">
          <button
            v-for="a in aquariums.items"
            :key="a.id"
            type="button"
            :class="['tank-option', { active: form.aquariumId === a.id }]"
            @click="form.aquariumId = a.id"
          >
            <span :class="`tank-thumb ${a.image_theme}`">
              <img v-if="a.image" :src="a.image" alt="" />
            </span>
            <strong>{{ a.name }}</strong>
            <em>{{ a.water_type }} · {{ a.net_volume || '—' }} L</em>
          </button>
        </div>
      </div>

      <div v-else-if="stepIndex === 2" class="act-step">
        <div class="act-step-head">
          <span>03</span>
          <div>
            <h2>Paket und Analysegrund</h2>
            <p>Der Umfang hilft später bei Bewertung und Empfehlungen.</p>
          </div>
        </div>
        <div class="package-grid">
          <button
            v-for="pkg in packages"
            :key="pkg.key"
            type="button"
            :class="['package-option', { active: form.package === pkg.key }]"
            @click="form.package = pkg.key"
          >
            <span>{{ pkg.badge }}</span>
            <strong>{{ pkg.label }}</strong>
            <em>{{ pkg.desc }}</em>
            <small>{{ pkg.params }}</small>
          </button>
        </div>

        <p class="field-label">Analysegrund</p>
        <div class="reason-grid">
          <button v-for="reason in reasons" :key="reason.key" type="button" :class="{ active: form.reason === reason.key }" @click="form.reason = reason.key">
            {{ reason.label }}
          </button>
        </div>

        <label v-if="needsOsmoseAquarium" class="field osmose-field">
          <span>Osmosewasserprofil</span>
          <select v-model="form.osmoseAquariumId">
            <option value="">Osmoseprofil auswählen</option>
            <option v-for="a in osmoseAquariums" :key="a.id" :value="a.id">{{ a.name }} · {{ a.net_volume || '—' }} L</option>
          </select>
          <em>Pro und Ultimate-MS benötigen ein zugeordnetes Osmosewasserprofil.</em>
        </label>
      </div>

      <div v-else-if="stepIndex === 3" class="act-step">
        <div class="act-step-head">
          <span>04</span>
          <div>
            <h2>Add-ons und Hinweise</h2>
            <p>Optionale Verarbeitung für Bericht, Priorität oder Fachberaterfreigabe.</p>
          </div>
        </div>
        <div class="addon-grid">
          <label v-for="addon in addons" :key="addon.key" :class="['addon-option', { active: selectedAddons.includes(addon.key) }]">
            <input v-model="selectedAddons" type="checkbox" :value="addon.key" />
            <span></span>
            <div>
              <strong>{{ addon.label }}</strong>
              <em>{{ addon.desc }}</em>
            </div>
          </label>
        </div>
      </div>

      <div v-else class="act-step">
        <div class="act-step-head">
          <span>05</span>
          <div>
            <h2>Bestätigen und aktivieren</h2>
            <p>Prüfen Sie die Angaben. Danach erscheint die Analyse in der Übersicht.</p>
          </div>
        </div>
        <p v-if="error" class="alert-error">{{ error }}</p>
        <div class="review-grid">
          <div v-if="selectedAquarium" class="review-tank">
            <span :class="`tank-thumb ${selectedAquarium.image_theme}`">
              <img v-if="selectedAquarium.image" :src="selectedAquarium.image" alt="" />
            </span>
            <div>
              <strong>{{ selectedAquarium.name }}</strong>
              <em>{{ selectedAquarium.water_type }} · {{ selectedAquarium.net_volume || '—' }} L</em>
            </div>
          </div>
          <div class="review-list">
            <div><span>Barcode</span><strong>{{ form.barcode }}</strong></div>
            <div><span>Paket</span><strong>{{ packageName }}</strong></div>
            <div><span>Grund</span><strong>{{ reasonName }}</strong></div>
            <div><span>Add-ons</span><strong>{{ selectedAddons.length || 'Keine' }}</strong></div>
            <div><span>Osmose</span><strong>{{ osmoseName }}</strong></div>
            <div><span>Status</span><strong>Bereit</strong></div>
          </div>
        </div>
      </div>
    </section>

    <div class="act-foot">
      <button type="button" class="btn btn-ghost" :disabled="stepIndex === 0" @click="prev">Zurück</button>
      <button v-if="stepIndex < steps.length - 1" type="button" class="btn btn-primary" :disabled="!canAdvance" @click="next">Weiter</button>
      <button v-else type="button" class="btn btn-primary btn-lg" :disabled="saving || !canSubmit" @click="submit">
        {{ saving ? 'Wird registriert…' : 'Analyse aktivieren' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAquariumsStore } from '@/stores/aquariums'
import { useAnalysesStore } from '@/stores/analyses'
import { ANALYSIS_ADDONS, ANALYSIS_PACKAGES, ANALYSIS_REASONS } from '@/services/analysisStore'

const route = useRoute()
const router = useRouter()
const aquariums = useAquariumsStore()
const analyses = useAnalysesStore()

const steps = [
  { key: 'barcode', label: 'Testkit' },
  { key: 'aquarium', label: 'Aquarium' },
  { key: 'package', label: 'Paket' },
  { key: 'addons', label: 'Add-ons' },
  { key: 'review', label: 'Bestätigen' },
]

const packages = ANALYSIS_PACKAGES
const reasons = ANALYSIS_REASONS
const addons = ANALYSIS_ADDONS
const stepIndex = ref(0)
const maxReached = ref(0)
const saving = ref(false)
const error = ref('')
const selectedAddons = ref(['sak254'])
const form = ref({
  barcode: '',
  aquariumId: '',
  package: 'standard',
  reason: 'routine',
  osmoseAquariumId: '',
})

onMounted(() => {
  aquariums.load()
  const requestedAquarium = route.query.aquarium_id?.toString()
  if (requestedAquarium && aquariums.byId(requestedAquarium)) form.value.aquariumId = requestedAquarium
  else if (aquariums.items.length) form.value.aquariumId = aquariums.items[0].id
})

const selectedAquarium = computed(() => aquariums.byId(form.value.aquariumId))
const osmoseAquariums = computed(() => aquariums.items.filter((a) => a.water_type === 'Osmosewasser'))
const needsOsmoseAquarium = computed(() => ['pro', 'ultimate-ms'].includes(form.value.package))
const packageName = computed(() => packages.find((p) => p.key === form.value.package)?.label || form.value.package)
const reasonName = computed(() => reasons.find((r) => r.key === form.value.reason)?.label || form.value.reason)
const osmoseName = computed(() => {
  if (!needsOsmoseAquarium.value) return 'Nicht erforderlich'
  return osmoseAquariums.value.find((a) => a.id === form.value.osmoseAquariumId)?.name || 'Offen'
})
const canSubmit = computed(() => {
  return !!form.value.barcode && !!form.value.aquariumId && (!needsOsmoseAquarium.value || !!form.value.osmoseAquariumId)
})
const canAdvance = computed(() => {
  if (stepIndex.value === 0) return /^[A-Za-z0-9-]{6,}$/.test(form.value.barcode)
  if (stepIndex.value === 1) return !!form.value.aquariumId
  if (stepIndex.value === 2) return !needsOsmoseAquarium.value || !!form.value.osmoseAquariumId
  return true
})

function next() {
  if (!canAdvance.value || stepIndex.value >= steps.length - 1) return
  stepIndex.value++
  maxReached.value = Math.max(maxReached.value, stepIndex.value)
}

function prev() {
  if (stepIndex.value > 0) stepIndex.value--
}

function goTo(i) {
  if (i <= maxReached.value) stepIndex.value = i
}

function submit() {
  if (!canSubmit.value) return
  saving.value = true
  error.value = ''
  try {
    analyses.activate({ ...form.value, addons: selectedAddons.value })
    router.push('/analyses')
  } catch (e) {
    error.value = e.error || 'Analyse konnte nicht registriert werden.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.back-link { display: inline-flex; margin-bottom: 16px; color: var(--text-muted); font-size: 13px; font-weight: var(--fw-semibold); }
.act { display: flex; flex-direction: column; gap: 18px; }

.act-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: clamp(24px, 4vw, 40px);
  border-radius: 24px;
  color: #fff;
  background:
    linear-gradient(120deg, rgba(10,27,67,0.98), rgba(0,51,102,0.86)),
    url('/reef-tank.webp') center / cover;
  box-shadow: var(--shadow);
}
.act-kicker { display: block; margin-bottom: 8px; color: var(--brand-sky); font-size: 11px; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; }
.act-hero h1 { margin-bottom: 10px; font-size: clamp(30px, 4.4vw, 48px); line-height: 1; font-weight: 800; letter-spacing: -0.03em; }
.act-hero p { max-width: 560px; color: rgba(255,255,255,0.74); line-height: 1.6; }
.act-meter { flex-shrink: 0; text-align: right; }
.act-meter strong { display: block; font-size: 30px; font-weight: 800; }
.act-meter span { color: var(--brand-sky); font-size: 12px; font-weight: 800; }

.act-progress { list-style: none; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.act-progress button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255,255,255,0.72);
  color: var(--text-muted);
  cursor: pointer;
}
.act-progress button:disabled { cursor: default; opacity: 0.55; }
.act-progress b {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  background: rgba(0,114,206,0.1);
  color: var(--brand-blue);
  font-size: 12px;
}
.act-progress span { font-size: 12px; font-weight: 700; }
.act-progress .active button { border-color: var(--brand-blue); background: #fff; box-shadow: 0 0 0 3px rgba(0,114,206,0.12); color: var(--text); }
.act-progress .active b,
.act-progress .done b { background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); color: #fff; }

.act-stage {
  min-height: 330px;
  padding: clamp(22px, 3vw, 34px);
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(136,193,233,0.24);
  box-shadow: var(--shadow);
}
.act-step-head { display: grid; grid-template-columns: 46px 1fr; gap: 14px; align-items: center; margin-bottom: 24px; }
.act-step-head > span {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  color: #fff;
  background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan));
  font-size: 13px;
  font-weight: 800;
}
.act-step-head h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.act-step-head p { margin-top: 3px; color: var(--text-muted); font-size: 13px; }

.scan-grid { display: grid; grid-template-columns: 210px 1fr; gap: 22px; align-items: stretch; }
.scan-frame {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 190px;
  border-radius: 22px;
  color: var(--brand-blue);
  background: linear-gradient(180deg, rgba(136,193,233,0.14), rgba(0,190,208,0.08));
  border: 1px dashed rgba(0,114,206,0.34);
}
.scan-frame svg { width: 74px; height: 74px; }
.scan-frame i { position: absolute; width: 26px; height: 26px; border-color: var(--brand-cyan); border-style: solid; }
.scan-frame i:nth-child(1) { top: 18px; left: 18px; border-width: 3px 0 0 3px; }
.scan-frame i:nth-child(2) { top: 18px; right: 18px; border-width: 3px 3px 0 0; }
.scan-frame i:nth-child(3) { bottom: 18px; left: 18px; border-width: 0 0 3px 3px; }
.scan-frame i:nth-child(4) { bottom: 18px; right: 18px; border-width: 0 3px 3px 0; }

.field { display: flex; flex-direction: column; gap: 8px; }
.field span,
.field-label { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.field input,
.field select {
  width: 100%;
  height: 50px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 13px;
  color: var(--text);
  background: #fff;
  font-size: 15px;
  outline: 0;
}
.field input:focus,
.field select:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.field em { color: var(--text-muted); font-size: 12px; font-style: normal; }

.empty-inline {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 22px;
  border-radius: 18px;
  background: rgba(136,193,233,0.1);
}
.empty-inline strong { font-size: 18px; font-weight: 800; }
.empty-inline p { color: var(--text-muted); }

.tank-grid,
.package-grid,
.addon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 12px; }
.tank-option,
.package-option,
.reason-grid button {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.tank-option:hover,
.package-option:hover,
.reason-grid button:hover { transform: translateY(-2px); border-color: rgba(0,114,206,0.34); }
.tank-option.active,
.package-option.active,
.reason-grid button.active { border-color: var(--brand-blue); box-shadow: 0 0 0 3px rgba(0,114,206,0.12); }
.tank-option { display: grid; grid-template-columns: 64px 1fr; gap: 12px; align-items: center; padding: 12px; }
.tank-thumb {
  display: block;
  width: 64px;
  height: 58px;
  overflow: hidden;
  border-radius: 14px;
  background: linear-gradient(150deg, var(--brand-blue), var(--brand-cyan));
}
.tank-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tank-thumb.reef-sps { background: linear-gradient(150deg, #0a1b43, var(--brand-cyan)); }
.tank-thumb.freshwater { background: linear-gradient(150deg, #0f766e, #34d399); }
.tank-thumb.osmosis { background: linear-gradient(150deg, #164e63, #67e8f9); }
.tank-option strong { display: block; font-size: 14px; font-weight: 800; }
.tank-option em { display: block; margin-top: 4px; color: var(--text-muted); font-size: 12px; font-style: normal; }

.package-option { display: flex; flex-direction: column; gap: 6px; padding: 16px; min-height: 150px; }
.package-option > span { align-self: flex-start; padding: 4px 9px; border-radius: 999px; background: rgba(136,193,233,0.18); color: var(--brand-blue); font-size: 11px; font-weight: 800; }
.package-option strong { font-size: 15px; font-weight: 800; }
.package-option em { color: var(--text-muted); font-size: 12px; line-height: 1.45; font-style: normal; }
.package-option small { margin-top: auto; color: var(--brand-blue); font-size: 11px; font-weight: 800; }
.field-label { margin: 20px 0 10px; }
.reason-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.reason-grid button { padding: 10px 14px; font-weight: 700; }
.osmose-field { margin-top: 18px; }

.addon-option {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 16px;
  cursor: pointer;
}
.addon-option input { display: none; }
.addon-option > span {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 2px solid rgba(0,114,206,0.28);
}
.addon-option.active { border-color: var(--brand-blue); box-shadow: 0 0 0 3px rgba(0,114,206,0.12); }
.addon-option.active > span { background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); border-color: transparent; }
.addon-option strong { display: block; font-size: 14px; font-weight: 800; }
.addon-option em { display: block; margin-top: 4px; color: var(--text-muted); font-size: 12px; font-style: normal; line-height: 1.45; }

.review-grid { display: grid; grid-template-columns: 280px 1fr; gap: 16px; align-items: start; }
.review-tank,
.review-list {
  padding: 16px;
  border-radius: 18px;
  background: rgba(136,193,233,0.1);
  border: 1px solid rgba(136,193,233,0.24);
}
.review-tank { display: flex; gap: 12px; align-items: center; }
.review-tank strong { display: block; font-weight: 800; }
.review-tank em { display: block; margin-top: 4px; color: var(--text-muted); font-size: 12px; font-style: normal; }
.review-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #fff; }
.review-list div { padding: 12px; border-radius: 13px; background: rgba(136,193,233,0.09); }
.review-list span { display: block; margin-bottom: 4px; color: var(--text-muted); font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.review-list strong { color: var(--text); font-size: 14px; }
.alert-error { margin-bottom: 14px; padding: 11px 14px; border-radius: 12px; background: #fdecea; color: #c5392c; font-size: 13px; font-weight: 700; }

.act-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255,255,255,0.76);
  border: 1px solid rgba(136,193,233,0.22);
}
.btn-ghost { background: #fff; color: var(--brand-blue); border: 1px solid rgba(136,193,233,0.44); }

@media (max-width: 760px) {
  .act-hero { align-items: flex-start; flex-direction: column; }
  .act-meter { text-align: left; }
  .act-progress { grid-template-columns: 1fr; }
  .scan-grid,
  .review-grid { grid-template-columns: 1fr; }
  .review-list { grid-template-columns: 1fr; }
}
</style>
