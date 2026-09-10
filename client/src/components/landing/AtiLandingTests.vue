<template>
<section id="tests" class="tests">
  <div class="sec-head center" data-reveal>
    <span class="eyebrow"><i></i> Welcher Test passt?</span>
    <h2>Vom Gratis-Einstieg bis zur Ultimate-Analyse.</h2>
    <p>Alle Kits werden im selben Labor ausgewertet – die Stufen unterscheiden sich in Empfindlichkeit und Parameterumfang.</p>
  </div>

  <div class="free-banner" data-reveal>
    <img src="/ati/free-icp.png" alt="ATI Free ICP" />
    <div class="free-copy">
      <span>Neu hier?</span>
      <strong>Free ICP – kostenlos starten</strong>
      <p>QR-Code scannen, Probe einsenden und den digitalen Bericht im Reef Lab kennenlernen.</p>
    </div>
    <RouterLink to="/register" class="btn btn-light">Gratis testen</RouterLink>
  </div>

  <div class="tier-grid">
    <article v-for="(t, i) in tiers" :key="t.name" class="tier-card" :class="{ featured: t.featured }" data-reveal :data-reveal-delay="i * 90">
      <span v-if="t.featured" class="tier-flag">Beliebt</span>
      <div class="tier-img"><img :src="t.img" :alt="t.name" loading="lazy" /></div>
      <h3>{{ t.name }}</h3>
      <p class="tier-sens">{{ t.sens }}</p>
      <p class="tier-desc">{{ t.desc }}</p>
      <ul class="tier-feats">
        <li v-for="f in t.feats" :key="f"><span></span>{{ f }}</li>
      </ul>
      <a class="btn" :class="t.featured ? 'btn-primary' : 'btn-ghost'" href="https://shop.atiaquaristik.com/en/icp-lab-analysis-standard-incl.-return-shipping-de/3000008/" target="_blank" rel="noreferrer">Im Shop ansehen</a>
    </article>
  </div>
  <svg class="wave-bottom" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0,50 C300,10 560,80 800,52 C1040,24 1220,72 1440,40 L1440,90 L0,90 Z" />
  </svg>
</section>

</template>

<script setup>
const tiers = [
  {
    name: 'Standard', img: '/ati/kit-standard.png', sens: 'bis 25× empfindlicher als andere ICP',
    desc: 'Der solide Einstieg für die wichtigsten Wasserwerte.',
    feats: ['Salinität & Hauptelemente', 'Phosphat & Nitrat', 'Digitaler Bericht'], featured: false,
  },
  {
    name: 'Pro', img: '/ati/kit-pro.png', sens: 'erweiterte Spurenelement-Analyse',
    desc: 'Mehr Spurenelemente und Schadstoffe für anspruchsvolle Riffe.',
    feats: ['Alles aus Standard', 'UV5 Spuren & Schadstoffe', 'Zielbereiche je Besatz'], featured: true,
  },
  {
    name: 'Ultimate MS', img: '/ati/kit-ultimate.png', sens: 'bis 10.000× empfindlicher (MS)',
    desc: 'Maximale Tiefe per Massenspektrometrie für jede Auffälligkeit.',
    feats: ['Alles aus Pro', 'MS-Spuren & Schadstoffe', 'Feinste Nachweisgrenzen'], featured: false,
  },
]
</script>

<style scoped>
/* ════════════════════  PRODUCT TIERS  ════════════════════ */
.tests {
  padding: clamp(72px, 10vh, 150px) clamp(18px, 5vw, 64px);
  background: #e9f1fb;
}
.free-banner {
  max-width: 1080px;
  margin: 0 auto 22px;
  display: flex;
  align-items: center;
  gap: clamp(14px, 3vw, 30px);
  padding: 16px clamp(18px, 3vw, 28px);
  border-radius: 22px;
  background:
    radial-gradient(30rem 16rem at 90% 0%, rgba(230,94,20,0.5), transparent 70%),
    linear-gradient(120deg, #b8470f, var(--brand-orange));
  color: #fff;
  box-shadow: 0 24px 64px rgba(230,94,20,0.28);
}
.free-banner img { width: 116px; height: auto; flex: 0 0 auto; filter: drop-shadow(0 10px 18px rgba(0,0,0,0.25)); }
.free-copy { flex: 1; min-width: 0; }
.free-copy span { font-size: 11px; font-weight: var(--fw-bold); letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.8); }
.free-copy strong { display: block; margin-top: 3px; font-size: clamp(19px, 2.4vw, 25px); font-weight: var(--fw-heading-strong); letter-spacing: -0.02em; }
.free-copy p { margin-top: 4px; font-size: 13.5px; color: rgba(255,255,255,0.82); max-width: 520px; }
.tier-grid {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 18px;
  align-items: stretch;
}
.tier-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 26px 24px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(0,114,206,0.12);
  box-shadow: 0 18px 50px rgba(10,27,67,0.07);
  transition: transform 0.25s, box-shadow 0.25s;
}
.tier-card:hover { transform: translateY(-6px); box-shadow: 0 30px 72px rgba(10,27,67,0.14); }
.tier-card.featured {
  border-color: rgba(0,114,206,0.4);
  box-shadow: 0 26px 70px rgba(0,114,206,0.2);
}
.tier-flag {
  position: absolute;
  top: 16px; right: 16px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: var(--fw-bold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fff;
  background: var(--brand-blue);
}
.tier-img {
  height: 168px;
  display: grid;
  place-items: center;
  margin-bottom: 8px;
}
.tier-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.tier-card h3 { font-size: 22px; font-weight: var(--fw-heading-strong); color: var(--brand-dark); letter-spacing: -0.02em; }
.tier-sens { margin-top: 4px; font-size: 12.5px; font-weight: var(--fw-bold); color: var(--brand-cyan); }
.tier-desc { margin-top: 10px; font-size: 14px; line-height: 1.55; color: var(--text-muted); }
.tier-feats { list-style: none; display: grid; gap: 9px; margin: 18px 0 22px; }
.tier-feats li { display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: var(--fw-medium); color: var(--brand-dark); }
.tier-feats li span {
  flex: 0 0 auto;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: rgba(0,190,208,0.16);
  position: relative;
}
.tier-feats li span::after {
  content: '';
  position: absolute;
  left: 6px; top: 4px;
  width: 4px; height: 7px;
  border: solid var(--cyan-600);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.tier-card .btn { margin-top: auto; justify-content: center; }

.tests .wave-bottom { fill: #ffffff; }
.btn-light {
  background: rgba(255,255,255,0.12);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
}
.btn-light:hover { background: rgba(255,255,255,0.2); }
@media (max-width: 860px) { .free-banner { flex-direction: column; text-align: center; } .free-copy p { margin-inline: auto; } }
</style>
