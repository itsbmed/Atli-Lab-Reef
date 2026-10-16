<template>
  <div class="aqn">
    <RouterLink to="/aquariums" class="back-link"><ArrowIcon direction="left" /> Zurück zu den Aquarien</RouterLink>

    <section class="aqn-hero">
      <div>
        <span class="hero-kicker">{{ created ? 'Neues Aquarium · fertig' : `Neues Aquarium · Schritt ${step + 1} von ${STEPS.length}` }}</span>
        <h1>{{ created ? 'Geschafft!' : 'Aquarium anlegen' }}</h1>
      </div>
      <ol v-if="!created" class="aqn-steps" aria-label="Fortschritt">
        <li v-for="(item, i) in STEPS" :key="item.key">
          <button
            type="button"
            :class="['aqn-step', { active: i === step, done: i < step }]"
            :aria-current="i === step ? 'step' : undefined"
            :disabled="i > step && !basicsValid"
            @click="goTo(i)"
          >
            <b>{{ i < step ? '✓' : i + 1 }}</b>
            <span>{{ item.label }}<em v-if="item.optional">optional</em></span>
          </button>
        </li>
      </ol>
    </section>

    <!-- Angefangenes Aquarium vom letzten Besuch -->
    <section v-if="pendingDraft && !created" class="aqn-draft" role="status">
      <span class="aqn-draft-icon" aria-hidden="true">↺</span>
      <p>
        <strong>Weitermachen, wo Sie aufgehört haben?</strong>
        „{{ pendingDraft.form.name || 'Neues Aquarium' }}“ ist noch nicht fertig angelegt – gespeichert {{ draftAge }}.
      </p>
      <div class="aqn-draft-actions">
        <button type="button" class="btn btn-primary" @click="resumeDraft">Fortsetzen</button>
        <button type="button" class="aqn-btn-quiet" @click="discardDraft">Neu beginnen</button>
      </div>
    </section>

    <!-- Abschluss: kurz feiern, dann der nächste sinnvolle Schritt -->
    <section v-if="created" class="aqn-done" aria-live="polite">
      <div class="aqn-done-media">
        <img v-if="created.image" :src="created.image" alt="" />
        <div v-else :class="`aqn-thumb ${created.image_theme}`"></div>
        <span v-for="n in 9" :key="n" class="aqn-bubble" :style="{ '--i': n }" aria-hidden="true"></span>
        <span class="aqn-done-check" aria-hidden="true">✓</span>
      </div>
      <div class="aqn-done-body">
        <h2 ref="doneHead" tabindex="-1">{{ created.name }} ist bereit</h2>
        <p>{{ createdMeta }}</p>
        <div class="aqn-done-profile">
          <ProfileRing :percent="createdScore.percent" :size="44" />
          <span><strong>Profil {{ createdScore.percent }} % · {{ createdScore.level }}</strong>
            {{ createdScore.next ? `Später ergänzen bringt genauere Empfehlungen – als Nächstes: ${createdScore.next}.` : 'Besser beschrieben geht es kaum.' }}</span>
        </div>
        <ol class="aqn-done-next">
          <li><b>1</b><span><strong>Analyse registrieren</strong> Barcode vom Probenröhrchen erfassen und dem Aquarium zuordnen.</span></li>
          <li><b>2</b><span><strong>Probe einsenden</strong> Das Labor wertet die Probe aus – der Bericht erscheint hier.</span></li>
        </ol>
        <div class="aqn-done-actions">
          <RouterLink :to="activateLink" class="btn btn-primary btn-lg">Analyse registrieren</RouterLink>
          <RouterLink :to="`/aquariums/${created.id}`" class="aqn-btn-outline">Zum Aquarium</RouterLink>
          <button type="button" class="aqn-btn-quiet" @click="startOver">Weiteres Aquarium anlegen</button>
        </div>
      </div>
    </section>

    <div v-else class="aqn-layout">
      <form class="aqn-form" novalidate @submit.prevent="onSubmit">
        <p v-if="error" class="alert-error" role="alert">{{ error }}</p>

        <!-- Schritt 1: was für ein Becken – das entscheidet über alles Weitere -->
        <div v-show="step === 0" class="aqn-step-panel">
          <header class="aqn-step-head">
            <h2 :ref="(el) => (stepHeads[0] = el)" tabindex="-1">Welches Becken legen Sie an?</h2>
            <p>Wassertyp, Name und Volumen – mehr braucht es nicht. Alles Weitere ist freiwillig.</p>
          </header>

          <WaterTypePicker v-model="form.water_type" />

          <div class="aqn-basics">
            <div class="form-group">
              <label for="aqn-name">Name des Aquariums</label>
              <input
                id="aqn-name"
                ref="nameInput"
                v-model="form.name"
                type="text"
                :placeholder="namePlaceholder"
                autocomplete="off"
                maxlength="60"
                :aria-invalid="!!errors.name"
                aria-describedby="aqn-name-error"
                @input="errors.name = ''"
              />
              <small v-if="errors.name" id="aqn-name-error" class="field-error">{{ errors.name }}</small>
            </div>
            <div class="form-group">
              <label for="aqn-volume">Nettovolumen</label>
              <div class="input-unit">
                <input
                  id="aqn-volume"
                  ref="volumeInput"
                  v-model.number="form.net_volume"
                  type="number"
                  min="1"
                  inputmode="numeric"
                  placeholder="300"
                  :aria-invalid="!!errors.net_volume"
                  aria-describedby="aqn-volume-hint aqn-volume-error"
                  @input="errors.net_volume = ''"
                />
                <span>Liter</span>
              </div>
              <small v-if="errors.net_volume" id="aqn-volume-error" class="field-error">{{ errors.net_volume }}</small>
              <small v-else id="aqn-volume-hint" class="field-hint">Wasser im System ohne Deko und Bodengrund.</small>
            </div>
            <VolumeHelper class="aqn-volume-helper" :form="form" @picked="errors.net_volume = ''" />
          </div>

          <div v-if="showSupply" ref="supplyBlock" :class="['aqn-supply', { invalid: errors.supply }]">
            <SupplySystemPicker :form="form" />
            <small v-if="errors.supply" class="field-error" role="alert">{{ errors.supply }}</small>
          </div>
        </div>

        <!-- Schritt 2: das Wichtigste zum Antippen, der Rest auf Wunsch -->
        <div v-show="step === 1" class="aqn-step-panel">
          <header class="aqn-step-head">
            <h2 :ref="(el) => (stepHeads[1] = el)" tabindex="-1">Ausstattung</h2>
            <p>Tippen Sie an, was auf Ihr Becken zutrifft. Jede Angabe macht die Empfehlungen genauer – nichts davon ist Pflicht.</p>
          </header>

          <div class="aqn-meter" aria-live="polite">
            <div class="aqn-meter-top">
              <strong>Profil {{ score.percent }} %</strong>
              <span>{{ score.level }}</span>
              <em v-if="score.next">Als Nächstes: {{ score.next }}</em>
            </div>
            <div class="aqn-meter-bar"><i :style="{ width: `${score.percent}%` }"></i></div>
          </div>

          <div v-if="quickSelects.length" class="aqn-quick">
            <WaterField
              v-for="field in quickSelects"
              :key="field.key"
              :field="field"
              :value="readField(field.model)"
              @update="writeField(field.model, $event)"
            />
          </div>
          <div v-if="quickSwitches.length" class="aqn-quick-switches">
            <span class="aqn-quick-label">Technik</span>
            <div class="aqn-switch-grid">
              <WaterField
                v-for="field in quickSwitches"
                :key="field.key"
                :field="field"
                :value="readField(field.model)"
                @update="writeField(field.model, $event)"
              />
            </div>
          </div>

          <OsmosisSourcePicker :form="form" :sources="aquariums.osmosisSources" />

          <section class="aqn-more">
            <button type="button" class="aqn-more-toggle" :aria-expanded="showAllDetails" @click="showAllDetails = !showAllDetails">
              <span>
                <strong>Alle Details</strong>
                <small>Dekoration, Strömung, Beleuchtung, Filter und mehr – für die Ursachensuche, wenn ein Wert auffällt.</small>
              </span>
              <b v-if="otherDetailCount">{{ otherDetailCount }}</b>
              <i aria-hidden="true">{{ showAllDetails ? '−' : '+' }}</i>
            </button>
            <WaterTypeFields v-if="showAllDetails" :form="form" :exclude="[EVALUATION_GROUP]" :exclude-keys="QUICK_KEYS" collapsed />
          </section>
        </div>

        <!-- Schritt 3: Bild, Lieblingswerte, Bewertung -->
        <div v-show="step === 2" class="aqn-step-panel">
          <header class="aqn-step-head">
            <h2 :ref="(el) => (stepHeads[2] = el)" tabindex="-1">Persönlich machen</h2>
            <p>Ein Bild für die Übersicht und die Werte, die Ihnen besonders wichtig sind.</p>
          </header>

          <section class="aqn-block">
            <h3>Bild für die Übersicht <em>optional</em></h3>
            <div class="aqn-gallery" role="group" aria-label="Aquarium-Bild">
              <label :class="['aqn-gallery-item', 'aqn-upload', { active: selectedPresetId === 'custom' }]">
                <img v-if="selectedPresetId === 'custom'" :src="form.image" alt="Eigenes Foto" />
                <span v-else class="aqn-upload-inner" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M12 16V5m0 0-4 4m4-4 4 4M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" /></svg>
                </span>
                <span class="aqn-gallery-name">{{ selectedPresetId === 'custom' ? 'Eigenes Foto' : 'Hochladen' }}</span>
                <input type="file" accept="image/*" class="visually-hidden" @change="onPhoto" />
              </label>
              <button
                v-for="preset in AQUARIUM_PRESETS"
                :key="preset.id"
                type="button"
                :class="['aqn-gallery-item', { active: selectedPresetId === preset.id }]"
                :aria-pressed="selectedPresetId === preset.id"
                @click="selectPreset(preset)"
              >
                <img :src="preset.dataUrl" alt="" />
                <span class="aqn-gallery-name">{{ preset.name }}</span>
              </button>
            </div>
            <p class="aqn-block-hint">
              <template v-if="form.image">Schöne Wahl. <button type="button" class="aqn-link" @click="clearPhoto">Bild entfernen</button></template>
              <template v-else>Ohne Bild zeigen wir eine Farbfläche passend zum Wassertyp.</template>
            </p>
            <p v-if="photoError" class="field-error" role="alert">{{ photoError }}</p>
          </section>

          <WaterField
            v-if="favoritesField"
            :field="favoritesField"
            :value="readField(favoritesField.model)"
            @update="writeField(favoritesField.model, $event)"
          />

          <div class="form-group">
            <label for="aqn-notes">Notizen <em class="label-optional">optional</em></label>
            <textarea id="aqn-notes" v-model="form.notes" rows="2" placeholder="z. B. Standort, Besonderheiten, Umzug geplant…"></textarea>
          </div>

          <!-- Bewertung: fast immer passt die Voreinstellung, deshalb zugeklappt -->
          <section :class="['aqn-eval', { open: showEvaluation }]">
            <div class="aqn-eval-head">
              <span>
                <strong>Bewertung</strong>
                <small>{{ evaluationSummary }}</small>
              </span>
              <button type="button" class="aqn-link" :aria-expanded="showEvaluation" @click="showEvaluation = !showEvaluation">{{ showEvaluation ? 'Fertig' : 'Ändern' }}</button>
            </div>
            <div v-if="showEvaluation" class="aqn-eval-body">
              <p class="aqn-block-hint">Legt fest, ab wann ein Messwert als niedrig, optimal oder erhöht gilt. Im Zweifel ATI Standard.</p>
              <div class="scale-cards" role="radiogroup" aria-label="Bewertungsgrundlage">
                <label v-for="scale in evaluationScales" :key="scale.id" :class="['scale-card', { on: form.evaluation_scale_id === scale.id }]">
                  <input v-model="form.evaluation_scale_id" type="radio" name="evaluation_scale" :value="scale.id" />
                  <strong>{{ scale.name }}</strong>
                  <small>{{ scale.description || 'Eigene Bewertungsgrundlage' }}</small>
                </label>
              </div>
              <WaterField
                v-if="targetModeField"
                :field="targetModeField"
                :value="readField(targetModeField.model)"
                @update="writeField(targetModeField.model, $event)"
              />
            </div>
          </section>

          <section class="aqn-review" aria-label="Zusammenfassung">
            <h3>Zusammenfassung</h3>
            <div class="aqn-review-row">
              <span>Becken</span>
              <strong>{{ basicsSummary }}</strong>
              <button type="button" class="aqn-link" @click="goTo(0)">Ändern</button>
            </div>
            <div class="aqn-review-row">
              <span>Ausstattung</span>
              <strong :class="{ muted: !detailCount }">{{ detailCount ? `${detailCount} ${detailCount === 1 ? 'Angabe' : 'Angaben'}` : 'Noch leer – jederzeit im Aquarium ergänzbar' }}</strong>
              <button type="button" class="aqn-link" @click="goTo(1)">{{ detailCount ? 'Ändern' : 'Ergänzen' }}</button>
            </div>
          </section>
        </div>

        <div class="aqn-foot">
          <RouterLink v-if="step === 0" to="/aquariums" class="aqn-btn-quiet">Abbrechen</RouterLink>
          <button v-else type="button" class="aqn-btn-quiet" @click="goTo(step - 1)"><ArrowIcon direction="left" /> Zurück</button>

          <div class="aqn-foot-main">
            <button v-if="step === 1" type="button" class="aqn-btn-outline" @click="goTo(2)">{{ detailCount ? 'Rest überspringen' : 'Überspringen' }}</button>
            <button type="submit" class="btn btn-primary btn-lg" :disabled="saving">
              <template v-if="isLastStep">{{ saving ? 'Wird angelegt…' : 'Aquarium anlegen' }}</template>
              <template v-else>Weiter</template>
            </button>
          </div>
        </div>
      </form>

      <!-- Vorschau: wächst mit jeder Angabe; auf dem Telefon als schmale Leiste oben -->
      <aside class="aqn-preview" aria-label="Vorschau">
        <div class="aqn-preview-card">
          <div class="aqn-preview-media">
            <img v-if="form.image" :src="form.image" class="aqn-thumb-img" alt="Aquarium-Foto" />
            <div v-else :class="`aqn-thumb ${previewTheme}`"></div>
            <span :class="['aqn-preview-badge', waterClass(form.water_type)]">{{ form.water_type }}</span>
          </div>
          <div class="aqn-preview-body">
            <span class="aqn-preview-kicker">Vorschau</span>
            <strong>{{ form.name || 'Neues Aquarium' }}</strong>
            <p>{{ form.net_volume ? `${Number(form.net_volume).toLocaleString('de-DE')} L` : 'Volumen offen' }}<template v-if="form.aquarium_type"> · {{ form.aquarium_type }}</template><template v-if="form.dimensions"> · {{ form.dimensions }}</template></p>
            <TransitionGroup name="aqn-tag" tag="div" class="aqn-preview-tags">
              <em v-for="tag in previewTags" :key="tag">{{ tag }}</em>
            </TransitionGroup>
          </div>
          <div class="aqn-preview-profile">
            <ProfileRing :percent="score.percent" :size="48" />
            <span class="aqn-preview-profile-text">
              <strong>{{ score.level }}</strong>
              <small>{{ score.next ? `Als Nächstes: ${score.next}` : 'Alles Wichtige ist beschrieben.' }}</small>
            </span>
          </div>
        </div>
        <div class="aqn-hint">
          <strong>{{ STEP_TIPS[step].title }}</strong>
          <p>{{ STEP_TIPS[step].text }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import ArrowIcon from '@/components/ui/ArrowIcon.vue'
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useAquariumsStore } from '@/stores/aquariums'
import { useAuthStore } from '@/stores/auth'
import OsmosisSourcePicker from '@/components/aquariums/OsmosisSourcePicker.vue'
import WaterTypeFields from '@/components/aquariums/WaterTypeFields.vue'
import WaterField from '@/components/aquariums/WaterField.vue'
import WaterTypePicker from '@/components/aquariums/WaterTypePicker.vue'
import SupplySystemPicker from '@/components/aquariums/SupplySystemPicker.vue'
import VolumeHelper from '@/components/aquariums/VolumeHelper.vue'
import ProfileRing from '@/components/aquariums/ProfileRing.vue'
import { emptyAquarium, supportsOsmosisSource } from '@/services/aquariumStore'
import { loadEvaluationScales } from '@/services/evaluationScales'
import { AQUARIUM_PRESETS } from '@/services/aquariumPresets'
import { fileToResizedDataUrl } from '@/services/imageUtil'
import { asksForBottles, supportsSupplySystem } from '@/services/supplySystem'
import { waterTypeGroups, waterTypeSummary, ensureWaterTypeDetails } from '@/services/waterTypeFields'
import { EVALUATION_GROUP, QUICK_KEYS, clearDraft, loadDraft, profileScore, quickFields, saveDraft } from '@/services/aquariumWizard'

const STEPS = [
  { key: 'basics', label: 'Becken' },
  { key: 'details', label: 'Ausstattung', optional: true },
  { key: 'finish', label: 'Persönlich' },
]
const STEP_TIPS = [
  { title: 'Warum das Volumen?', text: 'Aus dem Nettovolumen berechnen wir jede Dosiermenge. Ein grober Wert reicht – mit „Aus Maßen berechnen“ geht es in Sekunden.' },
  { title: 'Keine Pflicht', text: 'Technik und Besatz helfen bei der Ursachensuche, wenn ein Wert auffällt. Was Sie jetzt nicht wissen, ergänzen Sie einfach später.' },
  { title: 'Was passiert danach?', text: 'Nach dem Anlegen geht es direkt zur Analyse-Registrierung – Barcode erfassen, Probe einsenden, fertig.' },
]
// Ein Vorschlag je Wassertyp, damit das Namensfeld nicht leer wirkt.
const NAME_IDEAS = { Meerwasser: 'z. B. Wohnzimmer Reef', 'Süßwasser': 'z. B. Pflanzenbecken Büro', Osmosewasser: 'z. B. Osmoseanlage Keller', Meersalz: 'z. B. Salzansatz Vorratsfass', Aquakultur: 'z. B. Zuchtanlage Halle 2' }

const aquariums = useAquariumsStore()
const auth = useAuthStore()
const ownerId = computed(() => auth.user?.id || 'guest')
const saving = ref(false)
const error = ref('')
const errors = ref({})
const form = ref(emptyAquarium())
const step = ref(0)
const created = ref(null)
const createdScore = ref({ percent: 0, level: '', next: '' })
const stepHeads = []
const doneHead = ref(null)
const nameInput = ref(null)
const volumeInput = ref(null)
const supplyBlock = ref(null)
const showAllDetails = ref(false)
const showEvaluation = ref(false)
const pendingDraft = ref(null)

onMounted(() => {
  aquariums.load()
  pendingDraft.value = loadDraft(localStorage, ownerId.value)
  if (!pendingDraft.value) nameInput.value?.focus()
})

const isLastStep = computed(() => step.value === STEPS.length - 1)
const showSupply = computed(() => supportsSupplySystem(form.value.water_type))
const namePlaceholder = computed(() => NAME_IDEAS[form.value.water_type] || 'z. B. Wohnzimmer Reef')

const quick = computed(() => quickFields(form.value.water_type))
const quickSelects = computed(() => quick.value.filter((field) => field.type === 'select'))
const quickSwitches = computed(() => quick.value.filter((field) => field.type === 'checkbox'))
const evaluationFields = computed(() => waterTypeGroups(form.value.water_type).find((group) => group.title === EVALUATION_GROUP)?.fields || [])
const favoritesField = computed(() => evaluationFields.value.find((field) => field.key === 'favorite_elements'))
const targetModeField = computed(() => evaluationFields.value.find((field) => field.key === 'target_mode'))

const evaluationScales = loadEvaluationScales()
const evaluationSummary = computed(() => {
  const scale = evaluationScales.find((item) => item.id === form.value.evaluation_scale_id)?.name || 'ATI Standard'
  const target = targetModeField.value?.options?.map((option) => (typeof option === 'string' ? { value: option, label: option } : option))
    .find((option) => option.value === form.value.target_mode)?.label
  return [scale, target].filter(Boolean).join(' · ')
})

const detailItems = computed(() => waterTypeSummary(form.value).filter((item) => item.group !== EVALUATION_GROUP))
const detailCount = computed(() => detailItems.value.length + (form.value.osmosis_source_id ? 1 : 0))
const otherDetailCount = computed(() => detailItems.value.filter((item) => !QUICK_KEYS.some((key) => item.key.endsWith(`-${key}`))).length)
const score = computed(() => profileScore(form.value, { osmosisSupported: supportsOsmosisSource(form.value.water_type) }))

const basicsSummary = computed(() => [
  form.value.name,
  form.value.net_volume ? `${form.value.net_volume} L` : '',
  form.value.water_type,
  showSupply.value ? form.value.supply_system : '',
].filter(Boolean).join(' · '))

// Was in der Vorschau als Chip auftaucht – jede Antwort ist sofort zu sehen.
const previewTags = computed(() => [
  showSupply.value && form.value.supply_system,
  form.value.lighting_type,
  form.value.stocking_density && `Besatz ${form.value.stocking_density.toLowerCase()}`,
  form.value.skimmer && 'Abschäumer',
  form.value.sump && 'Technikbecken',
  form.value.refugium && 'Refugium',
  form.value.osmosis_source_id && 'Osmosequelle',
].filter(Boolean))

const photoError = ref('')
const selectedPresetId = ref('')

// Schritt 1 ist die einzige Pflicht – ohne ihn lassen sich die anderen Schritte nicht öffnen.
function basicsErrors() {
  const found = {}
  if (!form.value.name.trim()) found.name = 'Bitte geben Sie einen Namen an.'
  if (!form.value.net_volume || form.value.net_volume < 1) found.net_volume = 'Bitte geben Sie das Volumen in Litern an – oder wählen Sie unten eine Größe.'
  if (showSupply.value) {
    if (!form.value.supply_mode) found.supply = 'Bitte wählen Sie ein Versorgungssystem – „Keine Versorgung“ ist auch eine Antwort.'
    else if (asksForBottles(form.value.supply_mode) && !form.value.supply_bottles) found.supply = 'Bitte wählen Sie, auf wie viele Flaschen sich das Mittel verteilt.'
  }
  return found
}
const basicsValid = computed(() => Object.keys(basicsErrors()).length === 0)

watch(() => [form.value.supply_mode, form.value.supply_bottles], () => { errors.value.supply = '' })

// Entwurf mitschreiben – aber erst, wenn die Frage nach dem alten Entwurf beantwortet ist.
let saveTimer = null
watch([form, step], () => {
  if (created.value || pendingDraft.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveDraft(localStorage, ownerId.value, form.value, step.value), 400)
}, { deep: true })

const draftAge = computed(() => {
  if (!pendingDraft.value?.savedAt) return ''
  const minutes = Math.round((Date.now() - new Date(pendingDraft.value.savedAt).getTime()) / 60000)
  if (minutes < 2) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Minuten`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`
  return `am ${new Date(pendingDraft.value.savedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
})

async function resumeDraft() {
  form.value = { ...emptyAquarium(), ...pendingDraft.value.form }
  const preset = AQUARIUM_PRESETS.find((item) => item.dataUrl === form.value.image)
  selectedPresetId.value = preset ? preset.id : form.value.image ? 'custom' : ''
  const target = Math.min(Number(pendingDraft.value.step) || 0, STEPS.length - 1)
  pendingDraft.value = null
  if (target > 0 && basicsValid.value) await goTo(target)
  else nameInput.value?.focus()
}

function discardDraft() {
  clearDraft(localStorage, ownerId.value)
  pendingDraft.value = null
  nameInput.value?.focus()
}

function validateBasics() {
  errors.value = basicsErrors()
  if (errors.value.name) nameInput.value?.focus()
  else if (errors.value.net_volume) volumeInput.value?.focus()
  else if (errors.value.supply) supplyBlock.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return basicsValid.value
}

async function goTo(target) {
  if (target === step.value || target < 0 || target >= STEPS.length) return
  if (target > 0 && !validateBasics()) {
    step.value = 0
    return
  }
  error.value = ''
  step.value = target
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  stepHeads[target]?.focus({ preventScroll: true })
}

function onSubmit() {
  if (isLastStep.value) submit()
  else goTo(step.value + 1)
}

function readField(path) {
  if (path.startsWith('water_details.')) return form.value.water_details?.[path.replace('water_details.', '')]
  return form.value[path]
}

function writeField(path, value) {
  if (path.startsWith('water_details.')) {
    ensureWaterTypeDetails(form.value)
    form.value.water_details[path.replace('water_details.', '')] = value
  } else {
    form.value[path] = value
  }
}

function selectPreset(preset) {
  if (selectedPresetId.value === preset.id) return clearPhoto()
  form.value.image = preset.dataUrl
  selectedPresetId.value = preset.id
  photoError.value = ''
}

function clearPhoto() {
  form.value.image = null
  selectedPresetId.value = ''
  photoError.value = ''
}

async function onPhoto(e) {
  const file = e.target.files?.[0]
  if (!file) return
  photoError.value = ''
  try {
    form.value.image = await fileToResizedDataUrl(file)
    selectedPresetId.value = 'custom'
  } catch (err) {
    photoError.value = err.error || 'Foto konnte nicht geladen werden.'
  }
  e.target.value = ''
}

// Wassertyp → sichere CSS-Klasse für die Badge-Färbung (einheitlich mit der Liste).
function waterClass(type) {
  return { 'Meerwasser': 'wt-sea', 'Süßwasser': 'wt-fresh', 'Osmosewasser': 'wt-osmo', 'Meersalz': 'wt-salt', 'Aquakultur': 'wt-aqua' }[type] || 'wt-sea'
}

// Vorschau-Thema aus Beckentyp bzw. Wassertyp ableiten.
const previewTheme = computed(() => {
  if (form.value.aquarium_type === 'SPS') return 'reef-sps'
  const map = { 'Meerwasser': 'reef-mixed', 'Süßwasser': 'freshwater', 'Osmosewasser': 'osmosis', 'Meersalz': 'reef-sps', 'Aquakultur': 'freshwater' }
  return map[form.value.water_type] || 'reef-mixed'
})

// Osmosewasser wird in der Registrierung separat als Quelle gewählt, nicht als Aquarium.
const activateLink = computed(() => created.value.water_type === 'Osmosewasser' ? '/analyses/activate' : `/analyses/activate?aquarium_id=${created.value.id}`)
const createdMeta = computed(() => [
  `${created.value.net_volume} L`,
  created.value.water_type,
  created.value.supply_system,
].filter(Boolean).join(' · '))

async function submit() {
  error.value = ''
  if (!validateBasics()) {
    goTo(0)
    return
  }
  const data = { ...form.value, image_theme: previewTheme.value }
  // Ein Versorgungssystem gibt es nur bei Meerwasser – nach einem Typwechsel nichts Veraltetes speichern.
  if (!showSupply.value) Object.assign(data, { supply_mode: '', supply_line: '', supply_bottles: null, supply_product: '', supply_system: '' })
  saving.value = true
  try {
    createdScore.value = score.value
    created.value = aquariums.create(data)
    clearTimeout(saveTimer)
    clearDraft(localStorage, ownerId.value)
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    doneHead.value?.focus({ preventScroll: true })
  } catch (e) {
    error.value = e.error || 'Fehler beim Anlegen des Aquariums.'
  } finally {
    saving.value = false
  }
}

async function startOver() {
  form.value = emptyAquarium()
  errors.value = {}
  selectedPresetId.value = ''
  showAllDetails.value = false
  showEvaluation.value = false
  step.value = 0
  created.value = null
  await nextTick()
  nameInput.value?.focus()
}
</script>

<style scoped>
.back-link { display: inline-flex; margin-bottom: 16px; color: var(--text-muted); font-size: 13px; font-weight: var(--fw-semibold); text-decoration: none; }
.back-link:hover { color: var(--brand-blue); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.aqn-hero {
  display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 24px;
  margin-bottom: 24px; padding: clamp(24px, 4vw, 34px);
  border-radius: 24px; color: #fff;
  background: linear-gradient(135deg, var(--brand-blue), #0a1b43);
}
.hero-kicker { display: block; margin-bottom: 8px; color: rgba(255,255,255,0.7); font-size: 12px; font-weight: var(--fw-bold); letter-spacing: 0.08em; text-transform: uppercase; }
.aqn-hero h1 { font-size: clamp(26px, 4vw, 34px); font-weight: var(--fw-bold); letter-spacing: -0.03em; }

/* Schrittanzeige */
.aqn-steps { display: flex; align-items: center; gap: 6px; margin: 0; padding: 0; list-style: none; flex-shrink: 0; }
.aqn-steps li { display: flex; align-items: center; gap: 6px; }
.aqn-steps li + li::before { content: ''; width: 18px; height: 1px; background: rgba(255,255,255,0.3); }
.aqn-step {
  display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px 6px 6px;
  border: 0; border-radius: 12px; background: none;
  color: rgba(255,255,255,0.6); font-size: 13px; font-weight: var(--fw-semibold); white-space: nowrap; cursor: pointer;
}
.aqn-step:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #fff; }
.aqn-step:disabled { cursor: not-allowed; }
.aqn-step:focus-visible { outline: 2px solid var(--brand-cyan); outline-offset: 2px; }
.aqn-step b { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 9px; background: rgba(255,255,255,0.12); font-size: 12px; }
.aqn-step em { margin-left: 6px; font-style: normal; font-weight: var(--fw-medium); opacity: 0.7; }
.aqn-step.done { color: rgba(255,255,255,0.85); }
.aqn-step.done b { background: rgba(0,190,208,0.35); }
.aqn-step.active { color: #fff; }
.aqn-step.active b { background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); box-shadow: 0 8px 18px rgba(0,190,208,0.4); }

.aqn-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 22px; align-items: start; }
.aqn-form { padding: clamp(22px, 3vw, 32px); border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.alert-error { margin-bottom: 16px; padding: 11px 14px; border-radius: 12px; background: #fdecea; color: #c5392c; font-size: 13px; font-weight: var(--fw-semibold); }

.aqn-step-panel { display: grid; gap: 22px; }
.aqn-step-head h2 { color: var(--text); font-size: 22px; font-weight: var(--fw-bold); letter-spacing: -0.02em; outline: 0; }
.aqn-step-head p { margin-top: 4px; max-width: 620px; color: var(--text-muted); font-size: 13px; line-height: 1.5; }

.form-group { display: flex; flex-direction: column; gap: 7px; }
.form-group label { font-size: 13px; font-weight: var(--fw-semibold); color: var(--text); }
.label-optional { margin-left: 4px; color: var(--text-muted); font-style: normal; font-weight: var(--fw-medium); }
.form-group input,
.form-group textarea {
  width: 100%; height: 48px; padding: 0 14px;
  border: 1px solid var(--border); border-radius: 13px;
  background: #fff; color: var(--text); font-size: 14px; outline: 0;
  transition: border-color 0.18s, box-shadow 0.18s;
}
.form-group textarea { height: auto; padding: 12px 14px; font-family: inherit; resize: vertical; }
.form-group input:focus,
.form-group textarea:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.form-group input[aria-invalid='true'] { border-color: #c5392c; }
.form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 560px) { .form-row { grid-template-columns: 1fr; } }

.input-unit { position: relative; }
.input-unit input { padding-right: 60px; }
.input-unit span { position: absolute; top: 50%; right: 14px; transform: translateY(-50%); color: var(--text-muted); font-size: 13px; pointer-events: none; }
.field-hint { color: var(--text-muted); font-size: 12px; line-height: 1.4; }
.field-error { color: #c5392c; font-size: 12px; font-weight: var(--fw-semibold); }

.aqn-supply { display: grid; gap: 8px; padding-top: 22px; border-top: 1px solid var(--border); }
.aqn-supply.invalid :deep(.supply-modes) { padding: 6px; margin: -6px; border-radius: 20px; box-shadow: 0 0 0 1px #c5392c inset; }

/* Schritt 3 */
.aqn-block { display: grid; gap: 10px; }
.aqn-block h3,
.aqn-review h3 { color: var(--text); font-size: 16px; font-weight: var(--fw-bold); }
.aqn-block h3 em { margin-left: 4px; color: var(--text-muted); font-size: 13px; font-style: normal; font-weight: var(--fw-medium); }
.aqn-block-hint { margin-top: -4px; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
.aqn-link { padding: 0; border: 0; background: none; color: var(--brand-blue); font-size: 13px; font-weight: var(--fw-semibold); cursor: pointer; }
.aqn-link:hover { text-decoration: underline; }
.aqn-link:focus-visible { outline: 0; box-shadow: var(--shadow-focus); border-radius: 6px; }

.scale-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)); gap: 10px; }
.scale-card {
  position: relative; display: flex; flex-direction: column; gap: 4px; padding: 14px;
  border: 1px solid var(--border); border-radius: 14px; background: #fff; cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.scale-card:hover { border-color: var(--teal-300); }
.scale-card.on { border-color: var(--teal-500); background: var(--teal-50); box-shadow: 0 0 0 1px var(--teal-500) inset; }
.scale-card input { position: absolute; opacity: 0; pointer-events: none; }
.scale-card:has(input:focus-visible) { box-shadow: var(--shadow-focus); }
.scale-card strong { color: var(--text); font-size: 14px; font-weight: var(--fw-bold); }
.scale-card small { color: var(--text-muted); font-size: 12px; line-height: 1.45; }
.aqn-eval-fields { display: grid; gap: 14px; margin-top: 6px; }

.aqn-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
.aqn-gallery-item {
  position: relative; display: block; height: 84px; padding: 0; overflow: hidden;
  border: 2px solid transparent; border-radius: 14px; background: #fff; cursor: pointer;
  box-shadow: 0 6px 16px rgba(10,27,67,0.08); transition: border-color 0.15s, transform 0.15s;
}
.aqn-gallery-item:hover { transform: translateY(-1px); }
.aqn-gallery-item.active { border-color: var(--brand-blue); box-shadow: 0 0 0 3px rgba(0,114,206,0.18); }
.aqn-gallery-item:focus-visible,
.aqn-gallery-item:has(input:focus-visible) { outline: 0; box-shadow: var(--shadow-focus); }
.aqn-gallery-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.aqn-gallery-name {
  position: absolute; left: 6px; right: 6px; bottom: 6px; padding: 3px 6px; overflow: hidden; border-radius: 999px;
  background: rgba(255,255,255,0.92); color: var(--text); font-size: 11px; font-weight: var(--fw-semibold); text-align: center; white-space: nowrap; text-overflow: ellipsis;
}
.aqn-upload { border: 1.5px dashed var(--teal-300); background: var(--teal-50); box-shadow: none; }
.aqn-upload.active { border-style: solid; }
.aqn-upload-inner { display: grid; place-items: center; height: calc(100% - 26px); }
.aqn-upload-inner svg { width: 24px; height: 24px; fill: none; stroke: var(--brand-blue); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.aqn-upload .aqn-gallery-name { background: none; color: var(--brand-blue); }
.aqn-upload.active .aqn-gallery-name { background: rgba(255,255,255,0.92); color: var(--text); }

.aqn-review { display: grid; gap: 2px; padding: 16px 18px; border-radius: 16px; background: var(--teal-50); }
.aqn-review h3 { margin-bottom: 6px; }
.aqn-review-row { display: grid; grid-template-columns: 130px 1fr auto; align-items: baseline; gap: 12px; padding: 8px 0; border-top: 1px solid rgba(10,27,67,0.06); }
.aqn-review-row span { color: var(--text-muted); font-size: 13px; }
.aqn-review-row strong { color: var(--text); font-size: 13px; font-weight: var(--fw-semibold); }
.aqn-review-row strong.muted { color: var(--text-muted); font-weight: var(--fw-medium); }
@media (max-width: 560px) {
  .aqn-review-row { grid-template-columns: 1fr auto; }
  .aqn-review-row strong { grid-column: 1 / -1; grid-row: 2; }
}

.aqn-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border); }
.aqn-foot-main { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.aqn-btn-quiet {
  padding: 10px 4px; border: 0; background: none; color: var(--text-muted);
  font-size: 13px; font-weight: var(--fw-semibold); text-decoration: none; cursor: pointer;
}
.aqn-btn-quiet:hover { color: var(--brand-blue); }
.aqn-btn-outline {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; padding: 0 18px; border: 1px solid var(--border); border-radius: 999px;
  background: #fff; color: var(--brand-blue); font-size: 14px; font-weight: var(--fw-semibold); text-decoration: none; cursor: pointer;
}
.aqn-btn-outline:hover { border-color: var(--teal-400); }
.aqn-btn-quiet:focus-visible,
.aqn-btn-outline:focus-visible { outline: 0; box-shadow: var(--shadow-focus); border-radius: 999px; }

/* Abschluss */
.aqn-done {
  display: grid; grid-template-columns: 300px 1fr; overflow: hidden; max-width: 920px;
  border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow);
}
.aqn-done-media { position: relative; min-height: 240px; }
.aqn-done-media img,
.aqn-done-media .aqn-thumb { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.aqn-done-check {
  position: absolute; left: 20px; bottom: 20px; display: grid; place-items: center; width: 48px; height: 48px;
  border-radius: 50%; background: #fff; color: #0f9d6b; font-size: 22px; font-weight: var(--fw-bold);
  box-shadow: 0 10px 24px rgba(10,27,67,0.2); animation: pop 0.35s ease-out;
}
@keyframes pop { from { transform: scale(0.4); opacity: 0; } to { transform: none; opacity: 1; } }
.aqn-done-body { display: grid; gap: 14px; align-content: start; padding: clamp(22px, 3vw, 32px); }
.aqn-done-body h2 { color: var(--text); font-size: 22px; font-weight: var(--fw-bold); letter-spacing: -0.02em; outline: 0; }
.aqn-done-body > p { margin-top: -8px; color: var(--text-muted); font-size: 13px; }
.aqn-done-next { display: grid; gap: 10px; margin: 4px 0; padding: 0; list-style: none; }
.aqn-done-next li { display: flex; gap: 12px; align-items: flex-start; }
.aqn-done-next b { display: grid; place-items: center; flex-shrink: 0; width: 26px; height: 26px; border-radius: 9px; background: var(--teal-50); color: var(--brand-blue); font-size: 12px; }
.aqn-done-next span { color: var(--text-muted); font-size: 13px; line-height: 1.5; }
.aqn-done-next strong { display: block; color: var(--text); font-size: 14px; font-weight: var(--fw-semibold); }
.aqn-done-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 6px; }
@media (max-width: 720px) {
  .aqn-done { grid-template-columns: 1fr; }
  .aqn-done-media { min-height: 140px; }
}

/* Live-Vorschau */
.aqn-preview { position: sticky; top: 88px; display: flex; flex-direction: column; gap: 16px; }
.aqn-preview-card { border-radius: 22px; overflow: hidden; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.aqn-preview-media { position: relative; height: 120px; }
.aqn-preview-media::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgba(10,27,67,0.28)); }
.aqn-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.aqn-thumb { width: 100%; height: 100%; background: linear-gradient(150deg, var(--brand-blue), #0a1b43); }
.aqn-thumb.reef-mixed { background: linear-gradient(150deg, var(--brand-blue), var(--brand-cyan)); }
.aqn-thumb.reef-sps { background: linear-gradient(150deg, #0a1b43, var(--brand-cyan)); }
.aqn-thumb.freshwater { background: linear-gradient(150deg, #0f766e, #34d399); }
.aqn-thumb.osmosis { background: linear-gradient(150deg, #164e63, #67e8f9); }
.aqn-preview-badge { position: absolute; z-index: 2; top: 12px; left: 12px; padding: 4px 11px; border-radius: 999px; background: rgba(255,255,255,0.92); color: var(--brand-blue); font-size: 11px; font-weight: var(--fw-bold); }
.aqn-preview-badge.wt-sea { color: var(--brand-blue); }
.aqn-preview-badge.wt-fresh { color: #0f766e; }
.aqn-preview-badge.wt-osmo { color: #0e7490; }
.aqn-preview-badge.wt-salt { color: #7c3aed; }
.aqn-preview-badge.wt-aqua { color: #047857; }
.aqn-preview-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 6px; }
.aqn-preview-kicker { color: var(--brand-blue); font-size: 10px; font-weight: var(--fw-bold); letter-spacing: 0.1em; text-transform: uppercase; }
.aqn-preview-body strong { font-size: 18px; font-weight: var(--fw-bold); letter-spacing: -0.02em; color: var(--text); }
.aqn-preview-body p { color: var(--text-muted); font-size: 13px; }
.aqn-preview-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.aqn-preview-tags em { padding: 3px 9px; border-radius: 999px; background: rgba(136,193,233,0.16); color: var(--brand-blue); font-style: normal; font-size: 11px; font-weight: var(--fw-bold); }
.aqn-hint { padding: 16px 18px; border-radius: 18px; background: rgba(136,193,233,0.1); border: 1px solid rgba(136,193,233,0.22); }
.aqn-hint strong { display: block; margin-bottom: 5px; font-size: 13px; font-weight: var(--fw-bold); color: var(--text); }
.aqn-hint p { font-size: 13px; line-height: 1.55; color: var(--text-muted); }

@media (max-width: 1180px) {
  .aqn-preview { position: static; }
  .aqn-layout { grid-template-columns: minmax(0, 1fr); }
  /* Titel über der Schrittanzeige – nebeneinander würden die Schrittnamen die Seite verbreitern. */
  .aqn-hero { flex-direction: column; align-items: flex-start; gap: 16px; }
}
@media (max-width: 900px) {
  .aqn-hero { flex-direction: column; align-items: flex-start; gap: 16px; }
}
@media (max-width: 720px) {
  .aqn-steps { width: 100%; }
  .aqn-steps li { flex: 1; }
  .aqn-steps li + li::before { display: none; }
  .aqn-step { width: 100%; flex-direction: column; gap: 4px; padding: 6px 2px; font-size: 11px; white-space: normal; text-align: center; }
  .aqn-step em { display: none; }
}
@media (max-width: 480px) {
  .aqn-foot { flex-wrap: wrap; }
  .aqn-foot-main { width: 100%; }
  .aqn-foot-main > * { flex: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .scale-card, .aqn-gallery-item { transition: none; }
  .aqn-gallery-item:hover { transform: none; }
  .aqn-done-check { animation: none; }
}
/* ── Assistent, Fassung 2 ───────────────────────────────────────────────── */

/* Angefangener Entwurf */
.aqn-draft { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 18px; margin-bottom: 20px; padding: 16px 20px; border: 1px solid #bae6fd; border-radius: 18px; background: #f0f9ff; animation: aqn-rise .3s ease-out; }
.aqn-draft-icon { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 12px; background: #fff; color: var(--brand-blue); font-size: 20px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,114,206,0.12); }
.aqn-draft p { flex: 1 1 280px; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
.aqn-draft p strong { display: block; color: var(--text); font-size: 14px; }
.aqn-draft-actions { display: flex; align-items: center; gap: 8px; }
@keyframes aqn-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* Schritt 1: Name und Volumen nebeneinander, die Größenhilfe darunter über die volle Breite */
.aqn-basics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; padding-top: 22px; border-top: 1px solid var(--border); }
.aqn-volume-helper { grid-column: 1 / -1; margin-top: -4px; }
@media (max-width: 560px) { .aqn-basics { grid-template-columns: 1fr; } }

/* Schritt 2: Profil-Fortschritt */
.aqn-meter { display: grid; gap: 8px; padding: 14px 16px; border-radius: 16px; background: linear-gradient(135deg, #f0f9ff, #ecfeff); border: 1px solid #cdeefa; }
.aqn-meter-top { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.aqn-meter-top strong { color: var(--text); font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
.aqn-meter-top span { padding: 2px 9px; border-radius: 999px; background: #fff; color: var(--brand-blue); font-size: 11.5px; font-weight: 700; }
.aqn-meter-top em { margin-left: auto; color: var(--text-muted); font-size: 12px; font-style: normal; }
.aqn-meter-bar { height: 8px; overflow: hidden; border-radius: 999px; background: #dbeaf5; }
.aqn-meter-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--brand-blue), var(--brand-cyan)); transition: width .5s cubic-bezier(.2,.8,.3,1); }

/* Schnellauswahl */
.aqn-quick { display: grid; gap: 18px; }
.aqn-quick-switches { display: grid; gap: 10px; }
.aqn-quick-label { color: var(--text); font-size: 13px; font-weight: 600; }
.aqn-switch-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 10px; }
/* Die Schalter stehen hier als Kacheln nebeneinander statt je über die ganze Breite. */
.aqn-switch-grid :deep(.wf-switch) { grid-column: auto; }

/* Alle Details auf Wunsch */
.aqn-more { display: grid; gap: 14px; }
.aqn-more-toggle { display: grid; grid-template-columns: minmax(0, 1fr) auto 28px; align-items: center; gap: 12px; width: 100%; padding: 16px 18px; border: 1px dashed #b9cde2; border-radius: 16px; background: #fbfdff; color: inherit; text-align: left; cursor: pointer; transition: border-color .15s, background .15s; }
.aqn-more-toggle:hover { border-color: var(--brand-blue); background: #f4f9fd; }
.aqn-more-toggle[aria-expanded="true"] { border-style: solid; }
.aqn-more-toggle:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.aqn-more-toggle strong { display: block; color: var(--text); font-size: 14px; font-weight: 700; }
.aqn-more-toggle small { display: block; margin-top: 2px; color: var(--text-muted); font-size: 12px; line-height: 1.45; }
.aqn-more-toggle b { display: grid; place-items: center; min-width: 24px; height: 24px; padding: 0 7px; border-radius: 999px; background: var(--brand-blue); color: #fff; font-size: 11px; }
.aqn-more-toggle i { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; background: var(--teal-50); color: var(--brand-blue); font-size: 18px; font-style: normal; font-weight: 700; }

/* Schritt 3: Bewertung zugeklappt */
.aqn-eval { display: grid; gap: 14px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 16px; background: #fff; }
.aqn-eval.open { background: #fbfdff; }
.aqn-eval-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.aqn-eval-head strong { display: block; color: var(--text); font-size: 14px; font-weight: 700; }
.aqn-eval-head small { display: block; margin-top: 2px; color: var(--text-muted); font-size: 12.5px; }
.aqn-eval-body { display: grid; gap: 14px; }

/* Vorschau: Profilring unter der Karte */
.aqn-preview-profile { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-top: 1px solid #eef3f8; background: #fbfdff; }
.aqn-preview-profile strong { display: block; color: var(--text); font-size: 13px; font-weight: 700; }
.aqn-preview-profile small { display: block; margin-top: 1px; color: var(--text-muted); font-size: 11.5px; line-height: 1.4; }
.aqn-tag-enter-active { transition: opacity .25s ease, transform .25s ease; }
.aqn-tag-enter-from { opacity: 0; transform: scale(0.8); }
.aqn-tag-leave-active { display: none; }

/* Abschluss: aufsteigende Bläschen und der Profilstand */
.aqn-bubble { position: absolute; bottom: -20px; left: calc(var(--i) * 10%); width: calc(6px + var(--i) * 1.4px); height: calc(6px + var(--i) * 1.4px); border: 1.5px solid rgba(255,255,255,0.75); border-radius: 50%; background: rgba(255,255,255,0.16); animation: aqn-bubble calc(2.6s + var(--i) * 0.35s) ease-in calc(var(--i) * 0.22s) infinite; pointer-events: none; }
@keyframes aqn-bubble { 0% { opacity: 0; transform: translate(0, 0); } 15% { opacity: 1; } 100% { opacity: 0; transform: translate(calc((var(--i) - 5) * 3px), -260px); } }
.aqn-done-profile { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; background: #f0f9ff; }
.aqn-done-profile span { color: var(--text-muted); font-size: 12.5px; line-height: 1.45; }
.aqn-done-profile strong { display: block; color: var(--text); font-size: 13.5px; }

/* Bis 1180 px: Vorschau als schmale Leiste über dem Formular – daneben wäre das Formular zu eng */
@media (max-width: 1180px) {
  .aqn-preview { order: -1; gap: 0; }
  .aqn-preview-card { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 18px; }
  .aqn-preview-media { width: 64px; height: 64px; overflow: hidden; border-radius: 14px; }
  .aqn-preview-media::after, .aqn-preview-badge, .aqn-preview-kicker, .aqn-preview-tags { display: none; }
  .aqn-preview-body { gap: 2px; padding: 0; }
  .aqn-preview-body strong { overflow: hidden; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
  .aqn-preview-body p { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .aqn-preview-profile { padding: 0; border: 0; background: none; }
  .aqn-preview-profile-text { display: none; }
  .aqn-hint { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .aqn-bubble { display: none; }
  .aqn-draft, .aqn-tag-enter-active { animation: none; transition: none; }
  .aqn-meter-bar i, .aqn-more-toggle { transition: none; }
}
</style>
