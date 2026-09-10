<template>
<section id="systems" class="systems">
  <div class="sec-head center" data-reveal>
    <span class="eyebrow"><i></i> Für jedes System</span>
    <h2>Egal ob SPS-Riff, Mischbecken oder Aquascape.</h2>
    <p>Reef Lab kennt die richtigen Zielbereiche für Ihren Besatz – und passt Empfehlungen daran an.</p>
  </div>

  <div class="sys-grid">
    <article v-for="(sys, i) in systems" :key="sys.title" class="sys-card" data-reveal :data-reveal-delay="i * 90">
      <div class="sys-img"><img :src="sys.img" :alt="sys.title" loading="lazy" /></div>
      <div class="sys-body">
        <span>{{ sys.code }}</span>
        <h3>{{ sys.title }}</h3>
        <p>{{ sys.text }}</p>
      </div>
    </article>
  </div>
  <svg class="wave-bottom" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0,50 C300,10 560,80 800,52 C1040,24 1220,72 1440,40 L1440,90 L0,90 Z" />
  </svg>
</section>

</template>

<script setup>
const systems = [
  { code: 'SPS / LPS', title: 'Riffaquarium', img: '/tanks/osmosis.png', text: 'Enge Zielbereiche für Calcium, KH, Magnesium und Spurenelemente – die Basis für stabiles Wachstum.' },
  { code: 'MIXED REEF', title: 'Mischriff', img: '/tanks/reef-mixed.png', text: 'Ausgewogene Empfehlungen für gemischten Besatz aus Weich- und Steinkorallen.' },
  { code: 'SÜSSWASSER', title: 'Aquascape & Pflanzen', img: '/tanks/freshwater.png', text: 'Nährstoffe und Spurenelemente im Blick für sattes Pflanzenwachstum und gesunde Fische.' },
]
</script>

<style scoped>
/* ════════════════════  SYSTEMS  ════════════════════ */
.systems { padding: clamp(72px, 10vh, 150px) clamp(18px, 5vw, 64px); background: #ffffff; }
.sys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr));
  gap: 20px;
}
.sys-card {
  border-radius: 24px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(0,114,206,0.10);
  box-shadow: 0 18px 50px rgba(10,27,67,0.07);
  transition: transform 0.25s, box-shadow 0.25s;
}
.sys-card:hover { transform: translateY(-6px); box-shadow: 0 30px 70px rgba(10,27,67,0.16); }
.sys-img { position: relative; overflow: hidden; }
.sys-img img {
  display: block;
  width: 100%;
  height: 220px;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.sys-card:hover .sys-img img { transform: scale(1.06); }
.sys-body { padding: 22px; }
.sys-body span {
  font-size: 11px;
  font-weight: var(--fw-bold);
  letter-spacing: 0.1em;
  color: var(--brand-cyan);
}
.sys-body h3 { margin-top: 8px; font-size: 21px; font-weight: var(--fw-heading-strong); color: var(--brand-dark); letter-spacing: -0.02em; }
.sys-body p { margin-top: 8px; font-size: 14px; line-height: 1.6; color: var(--text-muted); }

.systems .wave-bottom { fill: #e9f1fb; }
</style>
