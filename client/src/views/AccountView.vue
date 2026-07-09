<template>
  <div class="account-page">
    <section class="account-hero">
      <div class="identity-block">
        <div class="avatar-mark">{{ initials }}</div>
        <div>
          <span class="eyebrow">Kundenprofil</span>
          <h1>{{ form.name || form.username || 'Kunde' }}</h1>
          <p>Verwalten Sie Ihre Kontaktdaten, Benachrichtigungen und Fachberater-Freigaben an einem Ort.</p>
          <div class="hero-tags">
            <span>{{ accountType }}</span>
            <span>{{ form.email || 'Keine E-Mail' }}</span>
            <span>{{ accountAge }}</span>
          </div>
        </div>
      </div>

      <div class="account-health">
        <span>Konto-Status</span>
        <strong>{{ accountStatus.title }}</strong>
        <em>{{ accountStatus.copy }}</em>
      </div>
    </section>

    <div class="profile-shell">
      <aside class="profile-summary">
        <section class="summary-card">
          <span class="eyebrow">Übersicht</span>
          <div class="summary-user">
            <div class="avatar-mark small">{{ initials }}</div>
            <div>
              <strong>{{ form.name || form.username }}</strong>
              <em>{{ form.email }}</em>
            </div>
          </div>
          <div class="summary-list">
            <div><span>Sprache</span><strong>{{ languageLabel(form.language) }}</strong></div>
            <div><span>Land</span><strong>{{ countryLabel(form.country) }}</strong></div>
            <div><span>Erinnerung</span><strong>{{ form.analysis_reminder ? `${form.reminder_interval_days} Tage` : 'Aus' }}</strong></div>
            <div><span>Fachberater</span><strong>{{ selectedAdvisorName }}</strong></div>
          </div>
        </section>

        <section class="summary-card quiet">
          <span class="eyebrow">Schnellaktionen</span>
          <button class="side-action" type="button" @click="focusSecurity">Passwort ändern</button>
          <button class="side-action" type="button" :disabled="saving" @click="save">Einstellungen speichern</button>
          <button class="side-action danger" type="button" @click="logout">Abmelden</button>
        </section>
      </aside>

      <main class="account-main">
        <p v-if="saveMsg" class="alert alert-success">{{ saveMsg }}</p>
        <p v-if="saveError" class="alert alert-error">{{ saveError }}</p>

        <section class="account-panel">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Stammdaten</span>
              <h2>Persönliche Daten</h2>
            </div>
            <button class="btn btn-primary" type="button" :disabled="saving" @click="save">
              {{ saving ? 'Speichern...' : 'Speichern' }}
            </button>
          </div>

          <form class="form-grid" @submit.prevent="save">
            <div class="form-group">
              <label>Anzeigename</label>
              <input v-model="form.name" type="text" autocomplete="name" />
            </div>
            <div class="form-group">
              <label>Nutzername</label>
              <input v-model="form.username" type="text" required autocomplete="username" />
            </div>
            <div class="form-group">
              <label>E-Mail-Adresse</label>
              <input v-model="form.email" type="email" required autocomplete="email" />
            </div>
            <div class="form-group">
              <label>Konto-Typ</label>
              <input :value="accountType" type="text" disabled />
            </div>
          </form>
        </section>

        <section ref="securitySection" class="account-panel">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Sicherheit</span>
              <h2>Passwort aktualisieren</h2>
            </div>
            <span :class="['security-score', passwordScore.tone]">{{ passwordScore.label }}</span>
          </div>

          <div class="security-grid">
            <form class="password-form" @submit.prevent="changePassword">
              <div class="form-group">
                <label>Aktuelles Passwort</label>
                <input v-model="passwordForm.current_password" type="password" autocomplete="current-password" required />
              </div>
              <div class="form-group">
                <label>Neues Passwort</label>
                <input v-model="passwordForm.new_password" type="password" autocomplete="new-password" required />
              </div>
              <div class="form-group">
                <label>Neues Passwort bestätigen</label>
                <input v-model="passwordForm.confirm_password" type="password" autocomplete="new-password" required />
              </div>
              <button class="btn btn-primary" type="submit" :disabled="passwordSaving || !canSubmitPassword">
                {{ passwordSaving ? 'Aktualisieren...' : 'Passwort ändern' }}
              </button>
            </form>

            <div class="security-note">
              <strong>Empfohlen</strong>
              <p>Mindestens 8 Zeichen, gemischt mit Zahlen oder Sonderzeichen. Verwenden Sie kein altes Passwort erneut.</p>
              <div class="password-meter"><span :style="{ width: `${passwordScore.value}%` }"></span></div>
              <em v-if="auth.user?.password_updated_at">Zuletzt geändert: {{ formatDate(auth.user.password_updated_at) }}</em>
              <em v-else>Passwortänderung noch nicht dokumentiert.</em>
            </div>
          </div>

          <p v-if="passwordMsg" class="alert alert-success">{{ passwordMsg }}</p>
          <p v-if="passwordError" class="alert alert-error">{{ passwordError }}</p>
        </section>

        <section class="two-column">
          <div class="account-panel">
            <div class="section-heading compact">
              <div>
                <span class="eyebrow">Fachberater</span>
                <h2>Freigabe verwalten</h2>
              </div>
            </div>
            <p class="muted">Der ausgewählte Fachberater kann später Analyseberichte und zugehörige Aquarienprofile begleiten.</p>
            <div class="form-group">
              <label>Ausgewählter Fachberater</label>
              <select v-model="form.advisor_id">
                <option :value="null">Kein Händler ausgewählt</option>
                <option v-for="advisor in advisors" :key="advisor.id" :value="advisor.id">{{ advisor.name }}</option>
              </select>
            </div>
            <div class="advisor-card">
              <span>{{ selectedAdvisorName }}</span>
              <strong>{{ form.advisor_id ? 'Freigabe aktiv' : 'Keine Freigabe' }}</strong>
            </div>
          </div>

          <div class="account-panel">
            <div class="section-heading compact">
              <div>
                <span class="eyebrow">Kommunikation</span>
                <h2>Benachrichtigungen</h2>
              </div>
            </div>
            <label class="toggle-row">
              <div>
                <strong>Newsletter</strong>
                <span>ATI Neuigkeiten und Produktupdates</span>
              </div>
              <input v-model="form.newsletter" type="checkbox" />
            </label>
            <label class="toggle-row">
              <div>
                <strong>Analyse-Erinnerung</strong>
                <span>Hinweis, wenn die nächste Analyse fällig wird</span>
              </div>
              <input v-model="form.analysis_reminder" type="checkbox" />
            </label>
          </div>
        </section>

        <section class="account-panel">
          <div class="section-heading compact">
            <div>
              <span class="eyebrow">Region & Analyse</span>
              <h2>Lokale Einstellungen</h2>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>Land</label>
              <select v-model="form.country">
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="CH">Schweiz</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
            <div class="form-group">
              <label>Sprache</label>
              <select v-model="form.language">
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
            <div class="form-group">
              <label>Analyse-Erinnerung</label>
              <select v-model.number="form.reminder_interval_days" :disabled="!form.analysis_reminder">
                <option :value="30">alle 30 Tage</option>
                <option :value="60">alle 60 Tage</option>
                <option :value="90">alle 90 Tage</option>
                <option :value="180">alle 180 Tage</option>
              </select>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const saving = ref(false)
const passwordSaving = ref(false)
const saveMsg = ref('')
const saveError = ref('')
const passwordMsg = ref('')
const passwordError = ref('')
const securitySection = ref(null)
const advisors = [
  { id: 'reef-partner-north', name: 'ATI Fachpartner Nord' },
  { id: 'reef-service-west', name: 'Reef Service West' },
  { id: 'korallenstudio', name: 'Korallenstudio Beratung' },
]
const form = ref({
  name: auth.user?.name || '',
  username: auth.user?.username || '',
  email: auth.user?.email || '',
  country: auth.user?.country || 'DE',
  language: auth.user?.language || 'de',
  newsletter: !!auth.user?.newsletter,
  analysis_reminder: auth.user?.analysis_reminder !== false,
  reminder_interval_days: auth.user?.reminder_interval_days || 90,
  advisor_id: auth.user?.advisor_id || null,
})
const passwordForm = ref({ current_password: '', new_password: '', confirm_password: '' })

const initials = computed(() => (form.value.name || form.value.username || 'ATI').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'ATI')
const accountType = computed(() => auth.user?.kind === 'full' ? 'Bestandskunde' : 'Neukunde')
const accountAge = computed(() => auth.user?.createdAt ? `Seit ${formatDate(auth.user.createdAt)}` : 'Neu angelegt')
const selectedAdvisorName = computed(() => advisors.find((advisor) => advisor.id === form.value.advisor_id)?.name || 'Nicht geteilt')
const accountStatus = computed(() => {
  if (!form.value.analysis_reminder) return { title: 'Aktiv', copy: 'Analyse-Erinnerungen sind aktuell deaktiviert.' }
  if (form.value.advisor_id) return { title: 'Aktiv & betreut', copy: 'Fachberaterfreigabe und Erinnerungen sind aktiv.' }
  return { title: 'Aktiv', copy: 'Erinnerungen sind aktiv, kein Fachberater gewählt.' }
})
const passwordScore = computed(() => {
  const value = passwordForm.value.new_password
  let score = 0
  if (value.length >= 8) score += 35
  if (value.length >= 12) score += 20
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 15
  if (/\d/.test(value)) score += 15
  if (/[^A-Za-z0-9]/.test(value)) score += 15
  if (!value) return { value: 8, label: 'Noch leer', tone: 'muted' }
  if (score >= 80) return { value: score, label: 'Stark', tone: 'good' }
  if (score >= 55) return { value: score, label: 'Solide', tone: 'watch' }
  return { value: Math.max(score, 18), label: 'Zu schwach', tone: 'danger' }
})
const canSubmitPassword = computed(() =>
  passwordForm.value.current_password &&
  passwordForm.value.new_password.length >= 8 &&
  passwordForm.value.new_password === passwordForm.value.confirm_password
)

async function save() {
  saving.value = true
  saveMsg.value = ''
  saveError.value = ''
  try {
    await auth.updateProfile(form.value)
    saveMsg.value = 'Profil gespeichert.'
    setTimeout(() => { saveMsg.value = '' }, 2200)
  } catch (e) {
    saveError.value = e.error || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  passwordSaving.value = true
  passwordMsg.value = ''
  passwordError.value = ''
  try {
    await auth.changePassword(passwordForm.value)
    passwordForm.value = { current_password: '', new_password: '', confirm_password: '' }
    passwordMsg.value = 'Passwort wurde aktualisiert.'
    setTimeout(() => { passwordMsg.value = '' }, 2600)
  } catch (e) {
    passwordError.value = e.error || 'Passwort konnte nicht geändert werden.'
  } finally {
    passwordSaving.value = false
  }
}

function focusSecurity() {
  securitySection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function logout() {
  auth.logout()
  router.push('/login')
}
function languageLabel(lang) {
  return { de: 'Deutsch', en: 'English' }[lang] || lang || '-'
}
function countryLabel(country) {
  return { DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz', US: 'United States', GB: 'United Kingdom' }[country] || country || '-'
}
function formatDate(date) {
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.account-page { display: grid; gap: 20px; }
.account-hero {
  display: flex; justify-content: space-between; gap: 24px; padding: 30px; border-radius: 28px;
  background: linear-gradient(105deg, rgba(10,27,67,0.98), rgba(10,27,67,0.86) 58%, rgba(0,114,206,0.48)), url('/reef-tank.webp') center bottom / cover;
  color: #fff; box-shadow: var(--shadow);
}
.identity-block { display: flex; gap: 18px; align-items: flex-start; }
.avatar-mark {
  width: 70px; height: 70px; flex: none; display: grid; place-items: center; border-radius: 22px;
  background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); color: #fff;
  font-size: 20px; font-weight: 800; letter-spacing: -0.04em; box-shadow: 0 14px 34px rgba(0,114,206,0.28);
}
.avatar-mark.small { width: 48px; height: 48px; border-radius: 16px; font-size: 14px; }
.eyebrow { display: block; margin-bottom: 8px; color: var(--teal-700); font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.account-hero .eyebrow { color: var(--teal-200); }
.account-hero h1 { font-size: clamp(34px, 5vw, 54px); line-height: 1; font-weight: 800; letter-spacing: -0.04em; }
.account-hero p { max-width: 720px; margin-top: 10px; color: rgba(255,255,255,0.72); line-height: 1.6; }
.hero-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.hero-tags span { padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.1); color: var(--teal-100); font-size: 11px; font-weight: 800; }
.account-health { min-width: 230px; height: fit-content; padding: 18px; border-radius: 20px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.14); }
.account-health span,
.account-health strong,
.account-health em { display: block; }
.account-health span { color: var(--teal-200); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
.account-health strong { margin-top: 5px; font-size: 21px; }
.account-health em { margin-top: 5px; color: rgba(255,255,255,0.68); font-size: 12px; line-height: 1.45; font-style: normal; }
.profile-shell { display: grid; grid-template-columns: minmax(250px, 0.32fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.profile-summary { display: grid; gap: 14px; position: sticky; top: 18px; }
.summary-card,
.account-panel { border-radius: 22px; background: rgba(255,255,255,0.94); border: 1px solid rgba(136,193,233,0.22); box-shadow: var(--shadow); }
.summary-card { padding: 18px; }
.summary-card.quiet { background: rgba(238,245,251,0.72); }
.summary-user { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.summary-user strong,
.summary-user em { display: block; }
.summary-user strong { color: var(--text); font-size: 15px; font-weight: 800; }
.summary-user em { color: var(--text-muted); font-size: 12px; font-style: normal; overflow-wrap: anywhere; }
.summary-list { display: grid; gap: 9px; }
.summary-list div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border); }
.summary-list span { color: var(--text-muted); font-size: 11px; font-weight: 800; }
.summary-list strong { color: var(--text); font-size: 12px; text-align: right; }
.side-action { width: 100%; margin-top: 8px; padding: 12px; border: 1px solid rgba(136,193,233,0.24); border-radius: 14px; background: #fff; color: var(--text); font-weight: 800; cursor: pointer; text-align: left; }
.side-action:hover { border-color: var(--brand-blue); color: var(--brand-blue); }
.side-action.danger { color: var(--coral); }
.account-main { display: grid; gap: 16px; }
.account-panel { padding: 22px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
.section-heading.compact { margin-bottom: 12px; }
.section-heading h2 { color: var(--text); font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 7px; }
.form-group label { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.form-group input,
.form-group select { width: 100%; min-height: 46px; padding: 0 13px; border: 1px solid var(--border); border-radius: 13px; background: #fff; color: var(--text); font-size: 14px; outline: 0; }
.form-group input:focus,
.form-group select:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.form-group input:disabled,
.form-group select:disabled { color: var(--text-muted); background: rgba(238,245,251,0.8); cursor: not-allowed; }
.alert { padding: 12px 14px; border-radius: 14px; font-size: 13px; font-weight: 700; }
.alert-success { background: #dcfce7; color: #065f46; }
.alert-error { background: #fdecea; color: #c5392c; }
.security-grid { display: grid; grid-template-columns: minmax(min(100%, 420px), 1fr) minmax(min(100%, 260px), 0.5fr); gap: 16px; align-items: start; }
.password-form { display: grid; gap: 12px; }
.security-score { padding: 5px 11px; border-radius: 999px; background: var(--teal-50); color: var(--text-muted); font-size: 12px; font-weight: 800; }
.security-score.good { color: #047857; background: #dcfce7; }
.security-score.watch { color: #92400e; background: #fef3c7; }
.security-score.danger { color: var(--coral); background: #fdecea; }
.security-note { padding: 16px; border-radius: 18px; background: linear-gradient(180deg, rgba(0,114,206,0.06), rgba(234,249,252,0.76)); border: 1px solid rgba(0,114,206,0.14); }
.security-note strong { display: block; color: var(--text); font-size: 15px; font-weight: 800; }
.security-note p { margin-top: 6px; color: var(--text-muted); font-size: 13px; line-height: 1.55; }
.security-note em { display: block; margin-top: 10px; color: var(--text-muted); font-style: normal; font-size: 12px; font-weight: 700; }
.password-meter { height: 9px; margin-top: 14px; border-radius: 999px; background: rgba(103,133,141,0.16); overflow: hidden; }
.password-meter span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--brand-blue), var(--brand-cyan)); transition: width 0.18s ease; }
.two-column { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.muted { color: var(--text-muted); font-size: 13px; line-height: 1.6; margin-bottom: 14px; }
.advisor-card { margin-top: 14px; padding: 14px; border-radius: 16px; background: var(--teal-50); border: 1px solid var(--border); }
.advisor-card span,
.advisor-card strong { display: block; }
.advisor-card span { color: var(--text-muted); font-size: 11px; font-weight: 800; }
.advisor-card strong { margin-top: 4px; color: var(--text); font-size: 15px; }
.toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 13px 0; border-bottom: 1px solid var(--border); }
.toggle-row:last-child { border-bottom: 0; }
.toggle-row strong,
.toggle-row span { display: block; }
.toggle-row strong { color: var(--text); font-size: 14px; font-weight: 800; }
.toggle-row span { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
.toggle-row input { width: 18px; height: 18px; accent-color: var(--teal-500); }
@media (max-width: 1080px) {
  .profile-shell,
  .security-grid,
  .two-column { grid-template-columns: 1fr; }
  .profile-summary { position: static; }
}
@media (max-width: 760px) {
  .account-hero { flex-direction: column; padding: 22px; }
  .identity-block { flex-direction: column; }
  .account-health { min-width: 0; }
  .section-heading { flex-direction: column; }
}
</style>
