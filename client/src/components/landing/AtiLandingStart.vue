<template>
<section class="cta">
  <svg class="wave-top" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0,40 C320,90 520,0 760,30 C1010,62 1180,20 1440,48 L1440,0 L0,0 Z" />
  </svg>
  <div class="cta-inner" data-reveal>
    <span class="eyebrow eyebrow-light"><i></i> Bereit für die erste Analyse?</span>
    <h2>Testkit kaufen oder Barcode direkt registrieren.</h2>
    <p>Erstellen Sie ein kostenloses Konto, legen Sie Ihr Aquarium an und behalten Sie jede Analyse an einem Ort.</p>
    <div class="cta-actions">
      <a class="btn btn-primary btn-lg" href="https://shop.atiaquaristik.com/en/icp-lab-analysis-standard-incl.-return-shipping-de/3000008/" target="_blank" rel="noreferrer">ICP-Test kaufen</a>
      <RouterLink to="/register" class="btn btn-light btn-lg">Konto erstellen</RouterLink>
    </div>
  </div>
</section>

<!-- ──────────────────────────  FOOTER  ─────────────────────── -->
</template>

<style scoped>
/* ════════════════════  CTA  ════════════════════ */
.cta {
  position: relative;
  padding: clamp(90px, 12vh, 180px) clamp(18px, 5vw, 64px);
  background:
    radial-gradient(40rem 30rem at 84% 0%, rgba(0,190,208,0.22), transparent 70%),
    radial-gradient(36rem 28rem at 10% 100%, rgba(230,94,20,0.16), transparent 70%),
    linear-gradient(150deg, #0A1B43, #06122e);
  color: #fff;
  text-align: center;
}
.cta .wave-top { fill: #ffffff; }
.cta-inner { max-width: 720px; margin: 0 auto; }
.cta-inner .eyebrow { margin-inline: auto; }
.cta-inner h2 {
  margin-top: 16px;
  font-size: clamp(30px, 4.6vw, 56px);
  line-height: 1.0;
  font-weight: var(--fw-heading-strong);
  letter-spacing: -0.04em;
}
.cta-inner p { margin: 16px auto 0; max-width: 520px; font-size: 16px; line-height: 1.65; color: rgba(255,255,255,0.72); }
.cta-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 32px; }
.btn-light {
  background: rgba(255,255,255,0.12);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
}
.btn-light:hover { background: rgba(255,255,255,0.2); }

@media (max-width: 560px) { .cta-actions { flex-direction: column; } .cta-actions .btn { width: 100%; justify-content: center; } }
</style>
