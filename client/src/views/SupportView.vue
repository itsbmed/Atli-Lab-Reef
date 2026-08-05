<template>
  <div class="support-page">
    <section class="support-hero">
      <div>
        <span class="eyebrow">Hilfe &amp; Support</span>
        <h1>Wie können wir helfen?</h1>
        <p>Finden Sie schnelle Antworten zu Analysen, Messwerten und Ihrem Konto oder bereiten Sie eine Anfrage an das ATI Team vor.</p>
        <label class="support-search">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" width="18" height="18"><circle cx="9" cy="9" r="6"/><path d="m14 14 3 3"/></svg>
          <input v-model="search" type="search" placeholder="Hilfethemen durchsuchen…" />
        </label>
      </div>
      <div class="support-status">
        <span>Supportstatus</span>
        <strong><i></i> Team erreichbar</strong>
        <p>Antworten werden später über das Support-Backend zugestellt.</p>
      </div>
    </section>

    <section class="support-topics">
      <RouterLink to="/analyses" class="topic-card analyses">
        <span>01</span><div><strong>Analyse &amp; Messwerte</strong><p>Berichte verstehen, Probe verfolgen und Empfehlungen einordnen.</p></div><i>→</i>
      </RouterLink>
      <RouterLink to="/analyses/activate" class="topic-card activation">
        <span>02</span><div><strong>Testkit &amp; Aktivierung</strong><p>Barcode registrieren, Probe zuordnen und Versand vorbereiten.</p></div><i>→</i>
      </RouterLink>
      <RouterLink to="/account" class="topic-card account">
        <span>03</span><div><strong>Konto &amp; Sicherheit</strong><p>Profildaten, Passwort und Fachberater-Freigaben verwalten.</p></div><i>→</i>
      </RouterLink>
    </section>

    <div class="support-layout">
      <section class="faq-panel">
        <div class="section-head">
          <div><span class="eyebrow">Häufige Fragen</span><h2>Schnelle Antworten</h2></div>
          <strong>{{ filteredFaqs.length }} Themen</strong>
        </div>
        <div v-if="filteredFaqs.length" class="faq-list">
          <article v-for="item in filteredFaqs" :key="item.id" :class="{ open: openFaq === item.id }">
            <button type="button" :aria-expanded="openFaq === item.id" @click="toggleFaq(item.id)">
              <span><small>{{ item.category }}</small><strong>{{ item.question }}</strong></span><i>⌄</i>
            </button>
            <Transition name="faq-slide"><p v-show="openFaq === item.id">{{ item.answer }}</p></Transition>
          </article>
        </div>
        <div v-else class="faq-empty"><strong>Keine passende Antwort gefunden</strong><p>Versuchen Sie einen anderen Suchbegriff oder nutzen Sie das Kontaktformular.</p></div>
      </section>

      <aside class="contact-panel">
        <span class="eyebrow">Kontakt</span>
        <h2>Anfrage vorbereiten</h2>
        <p>Beschreiben Sie Ihr Anliegen. Die tatsächliche Übermittlung wird mit dem Support-Backend verbunden.</p>
        <form @submit.prevent="prepareRequest">
          <label><span>Thema</span><select v-model="request.topic"><option>Analysebericht</option><option>Testkit & Aktivierung</option><option>Konto & Zugang</option><option>Technisches Problem</option><option>Sonstiges</option></select></label>
          <label><span>Betreff</span><input v-model="request.subject" type="text" required placeholder="Kurze Zusammenfassung" /></label>
          <label><span>Nachricht</span><textarea v-model="request.message" rows="6" required placeholder="Was ist passiert und wobei benötigen Sie Hilfe?"></textarea></label>
          <button class="btn btn-primary" type="submit">Anfrage vorbereiten</button>
          <p v-if="requestStatus" class="request-status" role="status">{{ requestStatus }}</p>
        </form>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { loadSupportContent } from '@/services/supportContent'

const search = ref('')
const openFaq = ref('')
const requestStatus = ref('')
const request = reactive({ topic: 'Analysebericht', subject: '', message: '' })
const faqs = ref(loadSupportContent().faqs)
const filteredFaqs = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('de-DE')
  return query ? faqs.value.filter((item) => `${item.category} ${item.question} ${item.answer}`.toLocaleLowerCase('de-DE').includes(query)) : faqs.value
})

function toggleFaq(id) {
  openFaq.value = openFaq.value === id ? '' : id
}
function prepareRequest() {
  requestStatus.value = 'Anfrage ist vollständig vorbereitet. Die Übermittlung wird mit dem Support-Backend verbunden.'
}
</script>

<style scoped>
.support-page { display: grid; gap: 18px; }
.support-hero { display: flex; align-items: center; justify-content: space-between; gap: 28px; padding: clamp(24px, 4vw, 36px); border-radius: 26px; background: #0a1b43; color: #fff; box-shadow: var(--shadow); }
.eyebrow { display: block; margin-bottom: 6px; color: var(--teal-700); font-size: 10px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; }
.support-hero .eyebrow { color: var(--teal-200); }
.support-hero h1 { font-size: clamp(34px, 5vw, 54px); line-height: 1; letter-spacing: -0.04em; }
.support-hero > div:first-child > p { max-width: 650px; margin-top: 9px; color: rgba(255,255,255,0.7); line-height: 1.55; }
.support-search { max-width: 560px; min-height: 48px; display: flex; align-items: center; gap: 10px; margin-top: 18px; padding: 0 14px; border: 1px solid rgba(255,255,255,0.15); border-radius: 13px; background: rgba(255,255,255,0.1); }
.support-search svg { flex: none; color: var(--teal-200); }
.support-search input { width: 100%; border: 0; outline: 0; background: transparent; color: #fff; font: inherit; }
.support-search input::placeholder { color: rgba(255,255,255,0.5); }
.support-status { width: 240px; flex: none; padding: 17px; border: 1px solid rgba(255,255,255,0.13); border-radius: 18px; background: rgba(255,255,255,0.08); }
.support-status > span { color: var(--teal-200); font-size: 10px; font-weight: 800; text-transform: uppercase; }
.support-status strong { display: flex; align-items: center; gap: 7px; margin-top: 7px; }
.support-status strong i { width: 8px; height: 8px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 4px rgba(52,211,153,0.14); }
.support-status p { margin-top: 6px; color: rgba(255,255,255,0.58); font-size: 11px; line-height: 1.45; }
.support-topics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.topic-card { display: grid; grid-template-columns: 38px minmax(0,1fr) auto; align-items: center; gap: 12px; padding: 17px; border: 1px solid var(--border); border-left: 4px solid #1686d9; border-radius: 16px; background: #fff; color: inherit; text-decoration: none; }
.topic-card.activation { border-left-color: #f59e0b; }.topic-card.account { border-left-color: #0f9f8f; }
.topic-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
.topic-card > span { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: var(--teal-50); color: var(--brand-blue); font-size: 10px; font-weight: 900; }
.topic-card strong,.topic-card p { display: block; }.topic-card strong { color: var(--text); font-size: 13px; }.topic-card p { margin-top: 3px; color: var(--text-muted); font-size: 10px; line-height: 1.4; }.topic-card > i { color: var(--brand-blue); font-style: normal; }
.support-layout { display: grid; grid-template-columns: minmax(0,1fr) 350px; gap: 18px; align-items: start; }
.faq-panel,.contact-panel { padding: 22px; border: 1px solid var(--border); border-radius: 22px; background: #fff; box-shadow: var(--shadow); }
.section-head { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 14px; }.section-head h2,.contact-panel h2 { color: var(--text); font-size: 23px; }.section-head > strong { color: var(--text-muted); font-size: 11px; }
.faq-list { display: grid; gap: 8px; }.faq-list article { overflow: hidden; border: 1px solid var(--border); border-radius: 13px; background: #fff; }.faq-list article.open { border-color: rgba(0,114,206,0.3); background: #f8fbfe; }
.faq-list button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }.faq-list button small,.faq-list button strong { display: block; }.faq-list button small { color: var(--teal-700); font-size: 9px; font-weight: 800; text-transform: uppercase; }.faq-list button strong { margin-top: 3px; color: var(--text); font-size: 13px; }.faq-list button i { color: var(--brand-blue); font-size: 19px; font-style: normal; transition: transform .2s ease; }.faq-list article.open button i { transform: rotate(180deg); }
.faq-list article > p { padding: 0 14px 15px; color: var(--text-muted); font-size: 12px; line-height: 1.6; }.faq-slide-enter-active,.faq-slide-leave-active { transition: opacity .2s ease, transform .2s ease; }.faq-slide-enter-from,.faq-slide-leave-to { opacity: 0; transform: translateY(-5px); }
.faq-empty { min-height: 180px; display: grid; place-content: center; gap: 4px; text-align: center; }.faq-empty strong { color: var(--text); }.faq-empty p { color: var(--text-muted); font-size: 12px; }
.contact-panel > p { margin-top: 6px; color: var(--text-muted); font-size: 12px; line-height: 1.5; }.contact-panel form { display: grid; gap: 11px; margin-top: 16px; }.contact-panel label { display: grid; gap: 5px; }.contact-panel label span { color: var(--text); font-size: 11px; font-weight: 800; }.contact-panel input,.contact-panel select,.contact-panel textarea { width: 100%; min-width: 0; padding: 10px 11px; border: 1px solid var(--border); border-radius: 10px; background: #fff; color: var(--text); font: inherit; font-size: 12px; outline: 0; }.contact-panel input:focus,.contact-panel select:focus,.contact-panel textarea:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }.contact-panel textarea { resize: vertical; }.request-status { padding: 9px; border-radius: 9px; background: #ecfdf5; color: #047857; font-size: 10px; line-height: 1.4; }
@media (max-width: 980px) { .support-layout { grid-template-columns: 1fr; }.support-topics { grid-template-columns: 1fr; } }
@media (max-width: 700px) { .support-hero { align-items: stretch; flex-direction: column; }.support-status { width: auto; } }
</style>
