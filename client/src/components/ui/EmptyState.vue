<template>
  <section :class="['empty-panel', tone]">
    <div v-if="imageTheme" class="empty-image">
      <div :class="`tank-thumb ${imageTheme}`"></div>
    </div>
    <div v-else class="empty-mark">{{ mark }}</div>

    <div class="empty-copy">
      <span v-if="kicker">{{ kicker }}</span>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
    </div>

    <div v-if="$slots.actions" class="empty-actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup>
defineProps({
  kicker: { type: String, default: '' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  mark: { type: String, default: 'ATI' },
  imageTheme: { type: String, default: '' },
  tone: { type: String, default: 'default' },
})
</script>

<style scoped>
.empty-panel {
  min-height: 300px;
  display: grid;
  grid-template-columns: minmax(min(100%, 440px), 1fr) minmax(min(100%, 240px), 0.42fr);
  gap: 28px;
  align-items: center;
  padding: 30px;
  border-radius: var(--radius);
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(255,255,255,0.76);
  box-shadow: var(--shadow);
}
.empty-panel.compact {
  min-height: 210px;
  grid-template-columns: minmax(0, 1fr);
}
.empty-mark {
  width: 72px;
  height: 72px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  grid-row: 1 / span 2;
  background: var(--teal-50);
  color: var(--teal-700);
  font-size: 15px;
  font-weight: var(--fw-extra-bold);
  letter-spacing: 0.08em;
}
.empty-image {
  height: 210px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 22px 60px rgba(10,27,67,0.12);
}
.empty-image .tank-thumb {
  height: 100%;
  border-radius: 0;
}
.empty-copy {
  max-width: 580px;
}
.empty-copy span {
  display: block;
  color: var(--teal-700);
  font-size: 11px;
  font-weight: var(--fw-bold);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.empty-copy h2 {
  color: var(--text);
  font-size: 28px;
  line-height: 1.05;
  font-weight: var(--fw-bold);
  letter-spacing: -0.035em;
  margin-bottom: 10px;
}
.empty-copy p {
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.65;
}
.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}
.empty-panel.compact .empty-actions { margin-top: 16px; }
@media (max-width: 760px) {
  .empty-panel {
    grid-template-columns: 1fr;
    padding: 22px;
  }
  .empty-image {
    order: -1;
    height: 170px;
  }
  .empty-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
