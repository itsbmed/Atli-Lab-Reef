<template>
  <div class="settings-page">
    <section class="settings-hero">
      <div>
        <span class="eyebrow">Einstellungen</span>
        <h1>Reef Lab passend einrichten.</h1>
        <p>Verwalten Sie Darstellung, regionale Angaben und Benachrichtigungen an einem Ort.</p>
      </div>
      <div class="settings-readout">
        <span>Konfiguration</span>
        <strong>Persönlich</strong>
        <em>Für dieses Konto</em>
      </div>
    </section>

    <div class="settings-layout">
      <main class="settings-main">
        <section class="settings-section card">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Arbeitsbereich</span>
              <h2>Ihre Reef-Lab-Einstellungen</h2>
            </div>
          </div>
          <p class="section-copy">
            Die Bereiche für Sprache, Region und Benachrichtigungen werden hier zentral verwaltet.
            Weitere Assistenten- und Berichtsoptionen folgen in den nächsten Ausbaustufen.
          </p>
        </section>
      </main>

      <aside class="settings-side">
        <section class="card side-card">
          <span class="eyebrow">Status</span>
          <h2>Bereit zur Einrichtung</h2>
          <p>Persönliche Einstellungen gelten ausschließlich für das aktuell angemeldete Konto.</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.settings-page { display: grid; gap: 20px; }
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
.settings-hero h1 { max-width: 720px; font-size: clamp(34px, 5vw, 54px); line-height: 1; font-weight: 800; }
.settings-hero p { max-width: 660px; margin-top: 10px; color: rgba(255, 255, 255, 0.72); line-height: 1.6; }
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
.settings-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 0.34fr); gap: 20px; align-items: start; }
.settings-main,
.settings-side { display: grid; gap: 16px; }
.settings-section,
.side-card { padding: 22px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
.section-heading h2,
.side-card h2 { color: var(--text); font-size: 22px; font-weight: 800; }
.section-copy,
.side-card p { color: var(--text-muted); font-size: 13px; line-height: 1.65; }
@media (max-width: 980px) {
  .settings-layout { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .settings-hero { flex-direction: column; padding: 22px; }
  .settings-readout { min-width: 0; }
}
</style>
