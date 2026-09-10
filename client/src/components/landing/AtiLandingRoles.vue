<template>
<section class="roles">
  <div class="sec-head center" data-reveal>
    <span class="eyebrow"><i></i> Für wen ist Reef Lab?</span>
    <h2>Vom Hobby bis zum Fachhandel.</h2>
  </div>
  <div class="role-grid">
    <article v-for="(r, i) in roles" :key="r.title" class="role-card" data-reveal :data-reveal-delay="i * 80">
      <span class="role-code">{{ r.code }}</span>
      <h3>{{ r.title }}</h3>
      <p>{{ r.text }}</p>
    </article>
  </div>
</section>

</template>

<script setup>
const roles = [
  { code: 'PRIVAT', title: 'Private Aquarianer', text: 'Aquarium anlegen, Testkit registrieren und die Entwicklung über mehrere Analysen verfolgen.' },
  { code: 'FACHHANDEL', title: 'Händler & Berater', text: 'Kunden geben Berichte frei – Beratung basiert auf denselben Messwerten und Empfehlungen.' },
  { code: 'GEWERBLICH', title: 'Profis & Service', text: 'Mehrere Becken, Kundenanlagen und Servicefälle strukturiert und nachvollziehbar verwalten.' },
]
</script>

<style scoped>
/* ════════════════════  ROLES  ════════════════════ */
.roles { padding: clamp(72px, 10vh, 150px) clamp(18px, 5vw, 64px); background: #ffffff; }
.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 18px;
}
.role-card {
  padding: 28px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(238,245,251,0.8));
  border: 1px solid rgba(0,114,206,0.10);
  box-shadow: 0 16px 44px rgba(10,27,67,0.06);
  min-height: 220px;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
}
.role-card:hover {
  transform: translateY(-6px);
  border-color: rgba(0,114,206,0.22);
  box-shadow: 0 30px 70px rgba(10,27,67,0.12);
}
.role-code {
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: var(--fw-bold);
  letter-spacing: 0.1em;
  color: var(--brand-blue);
  background: rgba(0,114,206,0.09);
}
.role-card h3 { margin-top: 22px; font-size: 20px; font-weight: var(--fw-heading-strong); color: var(--brand-dark); letter-spacing: -0.02em; }
.role-card p { margin-top: 10px; font-size: 14px; line-height: 1.6; color: var(--text-muted); }

</style>
