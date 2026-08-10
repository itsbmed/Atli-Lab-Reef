<template>
  <section id="problem" class="story">
    <svg class="wave-top" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0,40 C320,90 520,0 760,30 C1010,62 1180,20 1440,48 L1440,0 L0,0 Z" /></svg>
    <div class="story-inner story-split">
      <div class="story-head" data-reveal><span class="eyebrow eyebrow-light"><i></i> Das Problem</span><h2>39 Werte. Eine Tabelle.<br />Und jetzt?</h2><p>Eine Zahl ist noch keine Antwort. Die meisten ICP-Ergebnisse landen als nackte Werteliste im Postfach – ohne Kontext, ohne Zielbereich, ohne nächsten Schritt. Reef Lab übersetzt die Rohdaten in Klartext.</p><RouterLink to="/register" class="btn btn-primary btn-lg story-cta">Analyse starten</RouterLink></div>
      <div class="transform" data-reveal data-reveal-delay="120">
        <div class="t-card t-raw"><span class="t-tag">Rohdaten</span><div class="raw-grid"><i v-for="n in rawNumbers" :key="n">{{ n }}</i></div><p>Nur Zahlen. Keine Einordnung.</p></div>
        <div class="t-arrow" aria-hidden="true"><svg viewBox="0 0 48 24" fill="none"><path d="M2 12h40m0 0-9-9m9 9-9 9" stroke="currentColor" stroke-width="3"/></svg></div>
        <div class="t-card t-clean"><span class="t-tag t-tag-blue">Reef Lab Bericht</span><div v-for="c in cleanRows" :key="c.name" class="clean-row" :class="'is-' + c.status"><span class="dot"></span><span class="cn">{{ c.name }}</span><span class="cs">{{ c.label }}</span></div><p>Klartext mit Zielbereich und Empfehlung.</p></div>
      </div>
    </div>
    <svg class="wave-bottom" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0,50 C300,10 560,80 800,52 C1040,24 1220,72 1440,40 L1440,90 L0,90 Z" /></svg>
  </section>
</template>
<script setup>import { cleanRows, rawNumbers } from '@/services/atiLandingContent'</script>
