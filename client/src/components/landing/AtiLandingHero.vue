<template>
  <section class="hero">
    <div class="hero-copy" data-reveal>
      <span class="eyebrow"><i></i> ICP-Laboranalyse für Meerwasser</span>
      <h1>Verstehen Sie Ihr Wasser.<br /><em>Nicht nur messen.</em></h1>
      <p>ATI Reef Lab verwandelt die ICP-Analyse in einen klaren Wasserbericht – mit Zielbereichen, Verlauf und konkreten Empfehlungen für genau Ihr Aquarium.</p>
      <div class="hero-actions">
        <RouterLink to="/register" class="btn btn-primary btn-lg">Analyse starten</RouterLink>
        <a href="#how" class="btn btn-ghost btn-lg">So funktioniert&apos;s</a>
      </div>
      <ul class="hero-trust"><li><b>&lt;24h</b><span>Berichte digital</span></li><li><b>40+</b><span>Parameter im Blick</span></li><li><b>1 QR</b><span>Probe zuordnen</span></li></ul>
    </div>
    <div class="hero-stage" data-reveal data-reveal-delay="120">
      <figure class="reef-frame"><img src="/tanks/reef-mixed.png" alt="Riffaquarium" loading="eager" /><figcaption>Live-Becken · Mischriff</figcaption></figure>
      <div class="float-card report-mini">
        <header><span>Wasserbericht</span><strong>ATI-2026-418</strong></header>
        <div v-for="g in heroGauges" :key="g.name" class="mini-gauge" :class="'is-' + g.status">
          <div class="mini-gauge-top"><span>{{ g.name }}</span><b>{{ g.value }} <i>{{ g.unit }}</i></b></div>
          <div class="track"><span class="band" :style="{ left: g.band[0] + '%', right: 100 - g.band[1] + '%' }"></span><span class="marker" :style="{ left: g.pos + '%' }"></span></div>
        </div>
      </div>
      <div class="float-chip chip-status"><b></b> Status: stabil</div><div class="float-chip chip-alert"><b></b> KH leicht niedrig</div>
    </div>
  </section>
</template>
<script setup>import { heroGauges } from '@/services/atiLandingContent'</script>
