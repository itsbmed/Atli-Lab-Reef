<template>
  <section id="lab" class="lab">
    <div class="lab-grid">
      <div class="lab-copy" data-reveal>
        <span class="eyebrow"><i></i> Echtes Labor · Made in Germany</span>
        <h2>Ihre Probe läuft durch ein echtes ICP-Labor.</h2>
        <p>Kein Black-Box-Versprechen: Die Analyse erfolgt auf einem SPECTRO ARCOS ICP-OES Spektrometer – betrieben von einem erfahrenen Team in Deutschland. Präzise Werte, an denen Ihre Empfehlungen hängen.</p>
        <ul class="lab-points"><li v-for="point in labPoints" :key="point"><span></span>{{ point }}</li></ul>
        <a class="btn btn-primary btn-lg lab-cta" href="https://shop.atiaquaristik.com/en/icp-lab-analysis-standard-incl.-return-shipping-de/3000008/" target="_blank" rel="noreferrer">ICP-Test kaufen</a>
      </div>
      <div class="lab-shots" data-reveal data-reveal-delay="120">
        <figure class="shot shot-lg"><img src="/lab/team.jpg" alt="ATI Labor Team" loading="lazy" /><figcaption>Das ATI Reef Lab Team</figcaption></figure>
        <figure class="shot"><img src="/lab/machine.jpg" alt="Probe wird analysiert" loading="lazy" /></figure>
        <figure class="shot"><img src="/lab/analysis.jpg" alt="Auswertung der Messdaten" loading="lazy" /></figure>
      </div>
    </div>
  </section>
</template>
<script setup>
const labPoints = ['SPECTRO ARCOS ICP-OES Spektrometer', 'Auswertung durch erfahrenes Laborteam', 'Berichte digital in unter 24 Stunden']
</script>
