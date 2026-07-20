<template>
  <div class="settings-page">
    <section class="settings-hero">
      <div>
        <span class="eyebrow">Einstellungen</span>
        <h1>Assistent, Erklärungen und Konto feinjustieren.</h1>
        <p>Steuern Sie, wie detailliert Reef Lab Ergebnisse erklärt, wann es Sie erinnert und welche Kontofunktionen aktiv sind.</p>
      </div>
      <div class="settings-readout">
        <span>Aktiver Modus</span>
        <strong>{{ assistantModeLabel }}</strong>
        <em>{{ settings.explanation_depth === 'expert' ? 'Laborfokus' : 'kundenfreundlich' }}</em>
      </div>
    </section>

    <div class="settings-layout">
      <main class="settings-main">
        <section class="settings-section">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Assistent & Erklärung</span>
              <h2>Wie der Assistent arbeiten soll</h2>
            </div>
            <span class="status-pill">{{ assistantIntentLabel }}</span>
          </div>

          <div class="assistant-panel card">
            <div class="assistant-preview">
              <div class="assistant-mark">AI</div>
              <div>
                <span>Live-Vorschau</span>
                <strong>{{ assistantPreview.title }}</strong>
                <p>{{ assistantPreview.copy }}</p>
                <div class="assistant-chips">
                  <b>{{ audienceLabel }}</b>
                </div>
              </div>
            </div>

            <div class="setting-block">
              <label>Ziel des Assistenten</label>
              <div class="choice-list">
                <button
                  v-for="intent in assistantIntents"
                  :key="intent.key"
                  type="button"
                  :class="{ active: settings.assistant_intent === intent.key }"
                  @click="settings.assistant_intent = intent.key"
                >
                  <strong>{{ intent.label }}</strong>
                  <span>{{ intent.desc }}</span>
                </button>
              </div>
            </div>

            <div class="setting-block">
              <label>Für wen erklären?</label>
              <div class="segmented compact">
                <button
                  v-for="audience in audienceModes"
                  :key="audience.key"
                  type="button"
                  :class="{ active: settings.assistant_audience === audience.key }"
                  @click="settings.assistant_audience = audience.key"
                >
                  <strong>{{ audience.label }}</strong>
                  <span>{{ audience.desc }}</span>
                </button>
              </div>
            </div>

            <div class="setting-block">
              <label>Erklärungstiefe</label>
              <div class="segmented">
                <button
                  v-for="mode in explanationModes"
                  :key="mode.key"
                  type="button"
                  :class="{ active: settings.explanation_depth === mode.key }"
                  @click="settings.explanation_depth = mode.key"
                >
                  <strong>{{ mode.label }}</strong>
                  <span>{{ mode.desc }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="settings-section card">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Sprache & Region</span>
              <h2>Regionale Darstellung</h2>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="settings-language">Sprache</label>
              <select id="settings-language" v-model="settings.language">
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
            <div class="form-group">
              <label for="settings-country">Land</label>
              <select id="settings-country" v-model="settings.country">
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="CH">Schweiz</option>
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
              </select>
            </div>
            <div class="form-group">
              <label for="settings-units">Einheitensystem</label>
              <select id="settings-units" v-model="settings.units">
                <option value="metric">Metrisch (cm, L)</option>
                <option value="imperial">Imperial (inch, gal)</option>
              </select>
            </div>
          </div>
        </section>
      </main>

      <aside class="settings-side">
        <section class="card side-card">
          <span class="eyebrow">Benachrichtigungen</span>
          <h2>Kontakt</h2>
          <div class="notification-list">
            <label class="toggle-row">
              <div>
                <strong>Newsletter</strong>
                <span>ATI Neuigkeiten und Produktupdates</span>
              </div>
              <input v-model="settings.newsletter" type="checkbox" />
            </label>
            <label class="toggle-row">
              <div>
                <strong>Analyse-Erinnerung</strong>
                <span>Hinweis, wenn eine Analyse älter als 3 Monate ist</span>
              </div>
              <input v-model="settings.analysis_reminder" type="checkbox" />
            </label>
            <label class="toggle-row">
              <div>
                <strong>Push-Benachrichtigungen</strong>
                <span>Statusänderungen Ihrer Probe in Echtzeit</span>
              </div>
              <input v-model="settings.push_notifications" type="checkbox" />
            </label>
          </div>
        </section>

        <section class="card save-card">
          <button class="btn btn-primary btn-block" type="button" :disabled="saving" @click="save">
            {{ saving ? 'Speichern...' : 'Einstellungen speichern' }}
          </button>
          <p :class="['save-note', saveState.type]" role="status">{{ saveState.message }}</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { loadSettingsPreferences, saveSettingsPreferences } from '@/services/settingsPreferences'

const auth = useAuthStore()
const localPreferences = loadSettingsPreferences(auth.user?.id)
const settings = reactive({
  language: auth.user?.language || 'de',
  country: auth.user?.country || 'DE',
  units: localPreferences.units,
  newsletter: !!auth.user?.newsletter,
  analysis_reminder: auth.user?.analysis_reminder !== false,
  push_notifications: localPreferences.push_notifications,
  assistant_intent: localPreferences.assistant_intent,
  assistant_audience: localPreferences.assistant_audience,
  explanation_depth: localPreferences.explanation_depth,
})
const saving = ref(false)
const saveState = reactive({ message: '', type: '' })
const assistantIntents = [
  { key: 'action', label: 'Schnell handeln', desc: 'Priorität, nächster Schritt und Kontrolle zuerst.' },
  { key: 'learn', label: 'Verstehen lernen', desc: 'Ursache, Wirkung und Aquarium-Zusammenhang stärker erklären.' },
  { key: 'document', label: 'Für Verlauf dokumentieren', desc: 'Entscheidungen, Trends und Kontrollpunkte sauber festhalten.' },
]
const audienceModes = [
  { key: 'beginner', label: 'Einsteiger', desc: 'Weniger Fachsprache' },
  { key: 'reefkeeper', label: 'Riffhalter', desc: 'Praxis + Werte' },
  { key: 'advisor', label: 'Fachberater', desc: 'Kompakter Laborblick' },
]
const explanationModes = [
  { key: 'simple', label: 'Einfach', desc: 'Kurze Klartext-Erklärungen' },
  { key: 'balanced', label: 'Ausgewogen', desc: 'Ursache, Risiko und nächster Schritt' },
  { key: 'expert', label: 'Expert', desc: 'Mehr Labor- und Methodenkontext' },
]
const assistantIntentLabel = computed(() => (
  assistantIntents.find((intent) => intent.key === settings.assistant_intent)?.label || 'Schnell handeln'
))
const audienceLabel = computed(() => (
  audienceModes.find((audience) => audience.key === settings.assistant_audience)?.label || 'Riffhalter'
))
const assistantModeLabel = computed(() => (
  explanationModes.find((mode) => mode.key === settings.explanation_depth)?.label || 'Ausgewogen'
))
const assistantPreview = computed(() => {
  if (settings.assistant_intent === 'learn') {
    return {
      title: 'Der Assistent erklärt zuerst den Zusammenhang.',
      copy: 'Empfehlungen zeigen, warum ein Wert aus dem Rahmen fällt und welche Rolle er im Aquarium spielt.',
    }
  }
  if (settings.assistant_intent === 'document') {
    return {
      title: 'Der Assistent macht den Bericht nachvollziehbar.',
      copy: 'Entscheidungen, Kontrolltermine und Verlaufshinweise bleiben für den nächsten Bericht vergleichbar.',
    }
  }
  if (settings.explanation_depth === 'simple') {
    return {
      title: 'Schnell verstehen, was zu tun ist.',
      copy: 'Der Assistent fasst Ursachen und Korrekturen in kurzen, klaren Schritten zusammen.',
    }
  }
  if (settings.explanation_depth === 'expert') {
    return {
      title: 'Mehr Kontext zu Methode und Rolle.',
      copy: 'Zusätzlich zu Maßnahmen werden Messmethode, Parameterrolle und fachliche Hintergründe betont.',
    }
  }
  return {
    title: 'Klartext mit genug Tiefe.',
    copy: 'Empfehlungen zeigen Ursache, Risiko, Zielbereich und den nächsten sinnvollen Schritt.',
  }
})

async function save() {
  saving.value = true
  saveState.message = ''
  saveState.type = ''

  try {
    if (auth.user) {
      await auth.updateProfile({
        language: settings.language,
        country: settings.country,
        newsletter: settings.newsletter,
        analysis_reminder: settings.analysis_reminder,
      })
    }
    saveSettingsPreferences(auth.user?.id, {
      ...localPreferences,
      units: settings.units,
      push_notifications: settings.push_notifications,
      assistant_intent: settings.assistant_intent,
      assistant_audience: settings.assistant_audience,
      explanation_depth: settings.explanation_depth,
    })
    localPreferences.units = settings.units
    localPreferences.push_notifications = settings.push_notifications
    localPreferences.assistant_intent = settings.assistant_intent
    localPreferences.assistant_audience = settings.assistant_audience
    localPreferences.explanation_depth = settings.explanation_depth
    saveState.message = 'Einstellungen gespeichert.'
    saveState.type = 'success'
  } catch (error) {
    saveState.message = error.error || 'Einstellungen konnten nicht gespeichert werden.'
    saveState.type = 'error'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.settings-page { width: 100%; min-width: 0; display: grid; gap: 20px; }
.settings-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 30px;
  border-radius: 28px;
  background:
    linear-gradient(105deg, rgba(10, 27, 67, 0.98), rgba(10, 27, 67, 0.86) 58%, rgba(0, 114, 206, 0.48)),
    url('/reef-tank.webp') center bottom / cover;
  color: #fff;
  box-shadow: var(--shadow);
}
.eyebrow {
  display: block;
  margin-bottom: 8px;
  color: var(--teal-700);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.settings-hero .eyebrow { color: var(--teal-200); }
.settings-hero > div:first-child { min-width: 0; }
.settings-hero h1 { max-width: 720px; font-size: 54px; line-height: 1; font-weight: 800; overflow-wrap: anywhere; }
.settings-hero p { max-width: 660px; margin-top: 10px; color: rgba(255, 255, 255, 0.72); line-height: 1.6; overflow-wrap: anywhere; }
.settings-readout {
  min-width: 220px;
  height: fit-content;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
}
.settings-readout span,
.settings-readout strong,
.settings-readout em { display: block; }
.settings-readout span { color: var(--teal-200); font-size: 11px; font-weight: 800; text-transform: uppercase; }
.settings-readout strong { margin-top: 5px; font-size: 21px; }
.settings-readout em { margin-top: 5px; color: rgba(255, 255, 255, 0.68); font-size: 12px; font-style: normal; }
.settings-layout { width: 100%; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 0.34fr); gap: 20px; align-items: start; }
.settings-main,
.settings-side { min-width: 0; display: grid; gap: 16px; }
.settings-section,
.side-card { padding: 22px; }
.save-card { padding: 16px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
.section-heading h2,
.side-card h2 { color: var(--text); font-size: 22px; font-weight: 800; }
.status-pill { padding: 6px 11px; border-radius: 999px; background: var(--green-bg); color: #065f46; font-size: 11px; font-weight: 800; white-space: nowrap; }
.assistant-panel { display: grid; gap: 20px; padding: 22px; }
.assistant-preview { display: flex; align-items: flex-start; gap: 16px; padding: 18px; border-radius: 20px; background: linear-gradient(120deg, rgba(10, 27, 67, 0.96), rgba(0, 51, 102, 0.86)); color: #fff; }
.assistant-mark { width: 58px; height: 58px; flex: none; display: grid; place-items: center; border-radius: 18px; background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); font-weight: 800; }
.assistant-preview span,
.assistant-preview strong { display: block; }
.assistant-preview span { color: var(--teal-200); font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.assistant-preview strong { margin-top: 4px; font-size: 18px; }
.assistant-preview p { margin-top: 6px; color: rgba(255, 255, 255, 0.7); font-size: 13px; line-height: 1.55; }
.assistant-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
.assistant-chips b { padding: 5px 8px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 999px; background: rgba(255, 255, 255, 0.1); color: var(--teal-100); font-size: 10px; font-weight: 800; }
.setting-block { display: grid; gap: 9px; }
.setting-block > label { color: var(--text-muted); font-size: 12px; font-weight: 800; }
.choice-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.choice-list button { min-width: 0; min-height: 94px; padding: 14px; border: 1px solid var(--border); border-radius: 14px; background: #fff; color: var(--text); text-align: left; cursor: pointer; }
.choice-list button:hover { border-color: var(--teal-400); }
.choice-list button.active { border-color: var(--brand-blue); background: rgba(0, 114, 206, 0.06); box-shadow: inset 0 0 0 1px var(--brand-blue); }
.choice-list strong,
.choice-list span { display: block; }
.choice-list strong { font-size: 14px; font-weight: 800; }
.choice-list span { margin-top: 5px; color: var(--text-muted); font-size: 12px; line-height: 1.45; }
.segmented { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 4px; border: 1px solid var(--border); border-radius: 15px; background: rgba(238, 245, 251, 0.78); }
.segmented button { min-width: 0; padding: 11px 9px; border: 0; border-radius: 11px; background: transparent; color: var(--text); cursor: pointer; }
.segmented button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 5px 16px rgba(10, 27, 67, 0.1); }
.segmented strong,
.segmented span { display: block; }
.segmented strong { font-size: 13px; font-weight: 800; }
.segmented span { margin-top: 3px; color: var(--text-muted); font-size: 10px; line-height: 1.35; }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 7px; }
.form-group label { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.form-group select {
  width: 100%;
  min-width: 0;
  min-height: 46px;
  padding: 0 13px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
  outline: 0;
}
.form-group select:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.notification-list { display: grid; margin-top: 4px; }
.toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
.toggle-row:last-child { border-bottom: 0; }
.toggle-row strong,
.toggle-row span { display: block; }
.toggle-row strong { color: var(--text); font-size: 14px; font-weight: 800; }
.toggle-row span { margin-top: 3px; color: var(--text-muted); font-size: 12px; line-height: 1.45; }
.toggle-row input { width: 19px; height: 19px; flex: none; accent-color: var(--teal-500); cursor: pointer; }
.btn-block { width: 100%; }
.save-note { margin-top: 10px; color: var(--text-muted); font-size: 12px; font-weight: 700; text-align: center; }
.save-note:empty { display: none; }
.save-note.success { color: #047857; }
.save-note.error { color: var(--coral); }
@media (max-width: 980px) {
  .settings-layout { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .settings-hero { flex-direction: column; padding: 22px; }
  .settings-hero h1 { font-size: 34px; }
  .settings-readout { min-width: 0; }
  .form-grid { grid-template-columns: 1fr; }
  .section-heading { flex-direction: column; }
  .choice-list { grid-template-columns: 1fr; }
  .segmented { grid-template-columns: 1fr; }
  .assistant-preview { flex-direction: column; }
}
</style>
