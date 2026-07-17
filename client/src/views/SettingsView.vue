<template>
  <div class="settings-page">
    <section class="settings-hero">
      <div>
        <span class="eyebrow">Einstellungen</span>
        <h1>Reef Lab passend einrichten.</h1>
        <p>Verwalten Sie Darstellung, regionale Angaben und Benachrichtigungen an einem Ort.</p>
      </div>
      <div class="settings-readout">
        <span>Benachrichtigungen</span>
        <strong>{{ activeNotificationCount }} aktiv</strong>
        <em>Für dieses Konto</em>
      </div>
    </section>

    <div class="settings-layout">
      <main class="settings-main">
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
})
const saving = ref(false)
const saveState = reactive({ message: '', type: '' })
const activeNotificationCount = computed(() => [
  settings.newsletter,
  settings.analysis_reminder,
  settings.push_notifications,
].filter(Boolean).length)

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
    })
    localPreferences.units = settings.units
    localPreferences.push_notifications = settings.push_notifications
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
}
</style>
