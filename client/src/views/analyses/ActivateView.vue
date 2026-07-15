<template>
  <div class="act">
    <RouterLink to="/analyses" class="back-link">← Zurück zu den Analysen</RouterLink>

    <section class="act-hero">
      <div>
        <span class="act-kicker">Analyse registrieren</span>
        <h1>Testkit aktivieren</h1>
        <p>Testkit erfassen, Analysepaket automatisch erkennen und Aquarium zuordnen.</p>
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
            <p>Der Testkit-Code bestimmt automatisch das gebuchte Analysepaket.</p>
          </div>
        </div>
        <div class="scan-grid">
          <div :class="['scan-panel', { active: scannerActive }]">
            <div v-if="scannerActive" class="scan-camera">
              <video ref="scannerVideo" autoplay muted playsinline></video>
              <div class="scan-reticle"><i></i><i></i><i></i><i></i></div>
            </div>
            <div v-else class="scan-frame">
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

            <div class="scan-controls">
              <span :class="['scan-status', scannerStatusTone]">{{ scannerStatus }}</span>
              <div class="scan-buttons">
                <button v-if="!scannerActive" type="button" class="btn btn-primary" @click="startScanner">QR scannen</button>
                <button v-else type="button" class="btn btn-ghost" @click="stopScanner">Scanner stoppen</button>
                <label class="btn btn-ghost">
                  QR-Bild wählen
                  <input type="file" accept="image/*" hidden @change="scanImageFile" />
                </label>
              </div>
            </div>
          </div>

          <div class="barcode-panel">
            <label class="field">
              <span>Barcode / QR-Code</span>
              <input v-model.trim="form.barcode" type="text" placeholder="ATI-S-2026-0001" autofocus @blur="normalizeBarcodeInput" />
              <em>Tippen Sie den Code ein oder scannen Sie den QR-Code auf dem Testkit.</em>
            </label>
            <div v-if="form.barcode" :class="['scan-result', { invalid: !detectedPackage }]">
              <span>{{ detectedPackage ? 'Paket erkannt' : 'Code nicht erkannt' }}</span>
              <strong>{{ form.barcode }}</strong>
              <em v-if="detectedPackage">{{ detectedPackage.label }} · {{ detectedPackage.params }}</em>
              <em v-else>Testcodes beginnen mit ATI-S, ATI-P oder ATI-U.</em>
            </div>
            <div class="scan-help">
              <strong>Testcodes für die lokale Prüfung</strong>
              <p>ATI-S erkennt Standard, ATI-P erkennt Pro und ATI-U erkennt Ultimate-MS.</p>
            </div>
          </div>
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

        <div v-if="detectedPackage" class="detected-package">
          <span>{{ detectedPackage.badge }}</span>
          <div>
            <strong>{{ detectedPackage.label }}</strong>
            <em>Automatisch aus {{ form.barcode }} erkannt</em>
          </div>
        </div>

        <div v-if="!eligibleAquariums.length" class="empty-inline">
          <strong>Noch kein Aquarium vorhanden</strong>
          <p>Legen Sie zuerst ein Aquarium an, damit die Analyse korrekt zugeordnet werden kann.</p>
          <RouterLink to="/aquariums/new" class="btn btn-primary">Aquarium anlegen</RouterLink>
        </div>
        <div v-else class="tank-grid">
          <button
            v-for="a in eligibleAquariums"
            :key="a.id"
            type="button"
            :class="['tank-option', { active: form.aquariumId === a.id }]"
            @click="form.aquariumId = a.id"
          >
            <span :class="`tank-thumb ${a.image_theme}`">
              <img v-if="a.image" :src="a.image" alt="" />
            </span>
            <span class="tank-option-copy">
              <strong>{{ a.name }}</strong>
              <em>{{ a.water_type }} · {{ a.net_volume || '—' }} L</em>
              <small v-if="needsOsmoseAquarium">{{ hasLinkedOsmosis(a) ? 'Osmosequelle verknüpft' : 'Osmosequelle noch offen' }}</small>
            </span>
          </button>
        </div>

        <div v-if="selectedAquarium && needsOsmoseAquarium" class="osmosis-panel">
          <div class="osmosis-panel-head">
            <span>Osmosewasser</span>
            <strong>{{ linkedOsmoseAquarium ? 'Automatisch verknüpft' : 'Quelle auswählen' }}</strong>
          </div>
          <div v-if="linkedOsmoseAquarium" class="osmosis-source-summary">
            <span :class="`tank-thumb ${linkedOsmoseAquarium.image_theme}`">
              <img v-if="linkedOsmoseAquarium.image" :src="linkedOsmoseAquarium.image" alt="" />
            </span>
            <div>
              <strong>{{ linkedOsmoseAquarium.name }}</strong>
              <em>{{ linkedOsmoseAquarium.water_type }} · {{ linkedOsmoseAquarium.net_volume || '—' }} L</em>
            </div>
            <b>Verknüpft</b>
          </div>
          <label v-else-if="osmoseAquariums.length" class="field">
            <span>Osmosewasserprofil</span>
            <select v-model="form.osmoseAquariumId">
              <option value="">Osmoseprofil auswählen</option>
              <option v-for="a in osmoseAquariums" :key="a.id" :value="a.id">{{ a.name }} · {{ a.net_volume || '—' }} L</option>
            </select>
            <em>{{ packageName }} enthält eine separate Osmosewasseranalyse.</em>
          </label>
          <div v-else class="osmosis-missing">
            <strong>Kein Osmosewasserprofil vorhanden</strong>
            <span>Für {{ packageName }} wird zusätzlich eine Osmosewasserquelle benötigt.</span>
            <RouterLink to="/aquariums/new">Osmoseprofil anlegen</RouterLink>
          </div>
        </div>

        <template v-if="selectedAquarium">
          <p class="field-label">Analysegrund</p>
          <div class="reason-grid">
            <button v-for="reason in reasons" :key="reason.key" type="button" :class="{ active: form.reason === reason.key }" @click="form.reason = reason.key">
              {{ reason.label }}
            </button>
          </div>
        </template>
      </div>

      <div v-else-if="stepIndex === 2" class="act-step">
        <div class="act-step-head">
          <span>03</span>
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
          <span>04</span>
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
const scannerVideo = ref(null)
const scannerActive = ref(false)
const scannerStatus = ref('Kamera öffnen oder QR-Code manuell eingeben.')
const scannerStatusTone = ref('idle')
const scannerDetector = ref(null)
let scannerStream = null
let scannerFrame = 0
const form = ref({
  barcode: '',
  aquariumId: '',
  package: '',
  reason: 'routine',
  osmoseAquariumId: '',
})

onMounted(() => {
  aquariums.load()
  const requestedAquarium = route.query.aquarium_id?.toString()
  const requested = requestedAquarium ? aquariums.byId(requestedAquarium) : null
  if (requested && requested.water_type !== 'Osmosewasser') form.value.aquariumId = requestedAquarium
})

onUnmounted(() => stopScanner())

watch(stepIndex, (step) => {
  if (step !== 0) stopScanner()
})

const selectedAquarium = computed(() => aquariums.byId(form.value.aquariumId))
const osmoseAquariums = computed(() => aquariums.items.filter((a) => a.water_type === 'Osmosewasser'))
const eligibleAquariums = computed(() => aquariums.items.filter((a) => a.water_type !== 'Osmosewasser'))
const detectedPackage = computed(() => packageForBarcode(form.value.barcode))
const needsOsmoseAquarium = computed(() => ['pro', 'ultimate-ms'].includes(form.value.package))
const linkedOsmoseAquarium = computed(() => {
  const sourceId = selectedAquarium.value?.osmosis_source_id
  return sourceId ? osmoseAquariums.value.find((a) => a.id === sourceId) || null : null
})
const packageName = computed(() => packages.find((p) => p.key === form.value.package)?.label || form.value.package)
const reasonName = computed(() => reasons.find((r) => r.key === form.value.reason)?.label || form.value.reason)
const osmoseName = computed(() => {
  if (!needsOsmoseAquarium.value) return 'Nicht erforderlich'
  return osmoseAquariums.value.find((a) => a.id === form.value.osmoseAquariumId)?.name || 'Offen'
})

watch(detectedPackage, (pkg) => {
  form.value.package = pkg?.key || ''
}, { immediate: true })

watch(
  [() => form.value.package, () => form.value.aquariumId, linkedOsmoseAquarium],
  () => {
    if (!needsOsmoseAquarium.value) {
      form.value.osmoseAquariumId = ''
      return
    }
    if (linkedOsmoseAquarium.value) {
      form.value.osmoseAquariumId = linkedOsmoseAquarium.value.id
      return
    }
    if (!osmoseAquariums.value.some((a) => a.id === form.value.osmoseAquariumId)) {
      form.value.osmoseAquariumId = ''
    }
  },
  { immediate: true },
)

const canSubmit = computed(() => {
  return !!form.value.package && !!form.value.barcode && !!form.value.aquariumId && (!needsOsmoseAquarium.value || !!form.value.osmoseAquariumId)
})
const canAdvance = computed(() => {
  if (stepIndex.value === 0) return !!detectedPackage.value && sanitizeBarcode(form.value.barcode).length >= 6
  if (stepIndex.value === 1) return !!form.value.aquariumId && (!needsOsmoseAquarium.value || !!form.value.osmoseAquariumId)
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

function hasLinkedOsmosis(aquarium) {
  return osmoseAquariums.value.some((source) => source.id === aquarium.osmosis_source_id)
}

function packageForBarcode(value) {
  const barcode = sanitizeBarcode(value)
  const packageKey = barcode.startsWith('ATI-S')
    ? 'standard'
    : barcode.startsWith('ATI-P')
      ? 'pro'
      : barcode.startsWith('ATI-U')
        ? 'ultimate-ms'
        : ''
  return packages.find((pkg) => pkg.key === packageKey) || null
}

function normalizeBarcodeInput() {
  form.value.barcode = sanitizeBarcode(form.value.barcode)
}

function canUseNativeScanner() {
  return 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia
}

async function makeDetector() {
  if (!('BarcodeDetector' in window)) return null
  if (scannerDetector.value) return scannerDetector.value
  const BarcodeDetectorCtor = window.BarcodeDetector
  const supportedFormats = BarcodeDetectorCtor.getSupportedFormats
    ? await BarcodeDetectorCtor.getSupportedFormats()
    : ['qr_code']
  const formats = ['qr_code', 'data_matrix', 'code_128', 'code_39', 'ean_13'].filter((format) => supportedFormats.includes(format))
  scannerDetector.value = new BarcodeDetectorCtor({ formats: formats.length ? formats : ['qr_code'] })
  return scannerDetector.value
}

async function startScanner() {
  if (!canUseNativeScanner()) {
    scannerStatus.value = 'Dieser Browser unterstützt keinen direkten QR-Scan. Bitte Code eingeben oder QR-Bild wählen.'
    scannerStatusTone.value = 'error'
    return
  }

  scannerStatus.value = 'Kamera wird geöffnet...'
  scannerStatusTone.value = 'idle'
  scannerActive.value = true
  await nextTick()

  try {
    const detector = await makeDetector()
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    scannerVideo.value.srcObject = scannerStream
    await scannerVideo.value.play()
    scannerStatus.value = 'QR-Code in den Rahmen halten.'
    scannerStatusTone.value = 'active'
    scanCameraFrame(detector)
  } catch (err) {
    scannerActive.value = false
    scannerStatus.value = cameraErrorMessage(err)
    scannerStatusTone.value = 'error'
    stopScanner()
  }
}

function scanCameraFrame(detector) {
  if (!scannerActive.value || !scannerVideo.value) return
  detector.detect(scannerVideo.value)
    .then((codes) => {
      const rawValue = codes?.[0]?.rawValue
      if (rawValue) applyScannedCode(rawValue)
      else scannerFrame = requestAnimationFrame(() => scanCameraFrame(detector))
    })
    .catch(() => {
      scannerFrame = requestAnimationFrame(() => scanCameraFrame(detector))
    })
}

function stopScanner() {
  if (scannerFrame) cancelAnimationFrame(scannerFrame)
  scannerFrame = 0
  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop())
    scannerStream = null
  }
  if (scannerVideo.value) scannerVideo.value.srcObject = null
  scannerActive.value = false
}

async function scanImageFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!('BarcodeDetector' in window)) {
    scannerStatus.value = 'QR-Bildscan wird von diesem Browser nicht unterstützt. Bitte Code manuell eingeben.'
    scannerStatusTone.value = 'error'
    return
  }

  scannerStatus.value = 'QR-Bild wird gelesen...'
  scannerStatusTone.value = 'idle'
  try {
    const detector = await makeDetector()
    const image = new Image()
    image.src = URL.createObjectURL(file)
    await image.decode()
    const codes = await detector.detect(image)
    URL.revokeObjectURL(image.src)
    if (codes?.[0]?.rawValue) applyScannedCode(codes[0].rawValue)
    else {
      scannerStatus.value = 'Kein QR-Code im Bild gefunden.'
      scannerStatusTone.value = 'error'
    }
  } catch {
    scannerStatus.value = 'QR-Bild konnte nicht gelesen werden.'
    scannerStatusTone.value = 'error'
  }
}

function applyScannedCode(rawValue) {
  const code = normalizeScannedCode(rawValue)
  form.value.barcode = code
  const pkg = packageForBarcode(code)
  scannerStatus.value = pkg ? `${pkg.label} erkannt. Sie können fortfahren.` : 'Code erkannt, aber keinem Paket zugeordnet.'
  scannerStatusTone.value = pkg ? 'success' : 'error'
  stopScanner()
}

function normalizeScannedCode(rawValue) {
  const value = String(rawValue || '').trim()
  try {
    const url = new URL(value)
    const fromParam = ['barcode', 'code', 'kit', 'id'].map((key) => url.searchParams.get(key)).find(Boolean)
    if (fromParam) return sanitizeBarcode(fromParam)
    const pathCode = url.pathname.split('/').filter(Boolean).pop()
    if (pathCode) return sanitizeBarcode(pathCode)
  } catch {
    // Plain testkit codes are expected and do not need URL parsing.
  }
  const match = value.match(/[A-Z]{2,}[-\s]?\d{4,}[-\s]?[A-Z0-9-]+/i)
  return sanitizeBarcode(match?.[0] || value)
}

function sanitizeBarcode(value) {
  return String(value || '').trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]/g, '').toUpperCase()
}

function cameraErrorMessage(err) {
  if (err?.name === 'NotAllowedError') return 'Kamera wurde blockiert. Bitte Berechtigung erlauben oder Code manuell eingeben.'
  if (err?.name === 'NotFoundError') return 'Keine Kamera gefunden. Bitte Code manuell eingeben.'
  return 'Scanner konnte nicht gestartet werden. Bitte Code manuell eingeben.'
}

function submit() {
  if (!canSubmit.value) return
  saving.value = true
  error.value = ''
  try {
    analyses.activate({ ...form.value, barcode: sanitizeBarcode(form.value.barcode), addons: selectedAddons.value })
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

.act-progress { list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
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

.scan-grid { display: grid; grid-template-columns: minmax(280px, 0.78fr) 1fr; gap: 22px; align-items: stretch; }
.scan-panel {
  overflow: hidden;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(136,193,233,0.12), rgba(0,190,208,0.06));
  border: 1px solid rgba(0,114,206,0.18);
}
.scan-panel.active {
  background: #081b35;
  border-color: rgba(0,190,208,0.42);
  box-shadow: 0 18px 54px rgba(10,27,67,0.18);
}
.scan-frame {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 230px;
  color: var(--brand-blue);
}
.scan-frame svg { width: 74px; height: 74px; }
.scan-frame i,
.scan-reticle i { position: absolute; width: 30px; height: 30px; border-color: var(--brand-cyan); border-style: solid; }
.scan-frame i:nth-child(1),
.scan-reticle i:nth-child(1) { top: 18px; left: 18px; border-width: 3px 0 0 3px; }
.scan-frame i:nth-child(2),
.scan-reticle i:nth-child(2) { top: 18px; right: 18px; border-width: 3px 3px 0 0; }
.scan-frame i:nth-child(3),
.scan-reticle i:nth-child(3) { bottom: 18px; left: 18px; border-width: 0 0 3px 3px; }
.scan-frame i:nth-child(4),
.scan-reticle i:nth-child(4) { bottom: 18px; right: 18px; border-width: 0 3px 3px 0; }
.scan-camera {
  position: relative;
  min-height: 280px;
  background: #061427;
}
.scan-camera video {
  width: 100%;
  height: 100%;
  min-height: 280px;
  display: block;
  object-fit: cover;
}
.scan-camera::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(6,20,39,0.58), transparent 24%, transparent 76%, rgba(6,20,39,0.58)),
    linear-gradient(180deg, rgba(6,20,39,0.58), transparent 28%, transparent 72%, rgba(6,20,39,0.58));
  pointer-events: none;
}
.scan-reticle {
  position: absolute;
  inset: 48px;
  z-index: 1;
  border-radius: 22px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.24), 0 0 0 999px rgba(6,20,39,0.16);
}
.scan-controls {
  display: grid;
  gap: 12px;
  padding: 14px;
  background: rgba(255,255,255,0.92);
}
.scan-panel.active .scan-controls { background: rgba(8,27,53,0.96); }
.scan-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(136,193,233,0.16);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
}
.scan-panel.active .scan-status { color: rgba(255,255,255,0.78); background: rgba(255,255,255,0.1); }
.scan-status.active { color: var(--brand-blue); background: rgba(0,114,206,0.12); }
.scan-status.success { color: #047857; background: #dcfce7; }
.scan-status.error { color: #c5392c; background: #fdecea; }
.scan-buttons { display: flex; flex-wrap: wrap; gap: 10px; }
.scan-buttons .btn { cursor: pointer; }
.barcode-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.scan-result {
  padding: 14px 16px;
  border-radius: 16px;
  background: #eefbf4;
  border: 1px solid rgba(16,185,129,0.22);
}
.scan-result span {
  display: block;
  color: #047857;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.scan-result strong {
  display: block;
  margin-top: 5px;
  color: var(--text);
  font-size: 18px;
  font-weight: 800;
  overflow-wrap: anywhere;
}
.scan-result em { display: block; margin-top: 5px; color: #047857; font-size: 12px; font-style: normal; font-weight: 700; }
.scan-result.invalid { background: #fff7ed; border-color: #fed7aa; }
.scan-result.invalid span,
.scan-result.invalid em { color: #9a3412; }
.scan-help {
  margin-top: auto;
  padding: 16px;
  border-radius: 18px;
  background: rgba(136,193,233,0.1);
  border: 1px solid rgba(136,193,233,0.24);
}
.scan-help strong {
  display: block;
  color: var(--text);
  font-size: 14px;
  font-weight: 800;
}
.scan-help p {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

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

.detected-package {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 13px 15px;
  border: 1px solid rgba(16,185,129,0.24);
  border-radius: 16px;
  background: #eefbf4;
}
.detected-package > span { padding: 6px 9px; border-radius: 9px; background: #dcfce7; color: #047857; font-size: 11px; font-weight: 800; }
.detected-package strong { display: block; color: var(--text); font-size: 14px; font-weight: 800; }
.detected-package em { display: block; margin-top: 3px; color: var(--text-muted); font-size: 12px; font-style: normal; overflow-wrap: anywhere; }

.tank-grid,
.addon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 12px; }
.tank-option,
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
.reason-grid button:hover { transform: translateY(-2px); border-color: rgba(0,114,206,0.34); }
.tank-option.active,
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
.tank-option-copy { min-width: 0; }
.tank-option-copy small { display: block; margin-top: 5px; color: var(--brand-blue); font-size: 10.5px; font-weight: 800; }

.field-label { margin: 20px 0 10px; }
.reason-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.reason-grid button { padding: 10px 14px; font-weight: 700; }

.osmosis-panel {
  display: grid;
  gap: 12px;
  margin-top: 18px;
  padding: 16px;
  border: 1px solid rgba(0,190,208,0.28);
  border-radius: 18px;
  background: rgba(0,190,208,0.06);
}
.osmosis-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.osmosis-panel-head span { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.osmosis-panel-head strong { color: var(--teal-700); font-size: 12px; font-weight: 800; }
.osmosis-source-summary { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 12px; align-items: center; }
.osmosis-source-summary strong { display: block; color: var(--text); font-size: 14px; font-weight: 800; }
.osmosis-source-summary em { display: block; margin-top: 3px; color: var(--text-muted); font-size: 12px; font-style: normal; }
.osmosis-source-summary > b { padding: 6px 9px; border-radius: 9px; background: #dcfce7; color: #047857; font-size: 11px; }
.osmosis-missing { display: grid; gap: 5px; }
.osmosis-missing strong { color: var(--text); font-size: 14px; font-weight: 800; }
.osmosis-missing span { color: var(--text-muted); font-size: 12px; }
.osmosis-missing a { width: fit-content; margin-top: 4px; color: var(--brand-blue); font-size: 12px; font-weight: 800; }

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
  .act-progress { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .scan-grid,
  .review-grid { grid-template-columns: 1fr; }
  .scan-reticle { inset: 34px; }
  .review-list { grid-template-columns: 1fr; }
  .osmosis-source-summary { grid-template-columns: 52px minmax(0, 1fr); }
  .osmosis-source-summary .tank-thumb { width: 52px; height: 52px; }
  .osmosis-source-summary > b { grid-column: 2; width: fit-content; }
}
</style>
