<template>
  <!-- Leiste im Anordnen-Modus: kurze Anleitung, Ausgeblendetes zurückholen, zurücksetzen, fertig -->
  <Transition name="arrange-bar">
    <div v-if="editing" class="arrange-bar" role="region" aria-label="Anordnen">
      <i aria-hidden="true">
        <svg viewBox="0 0 20 20"><path d="M10 2.5v15M2.5 10h15M10 2.5 7.8 4.7M10 2.5l2.2 2.2M10 17.5l-2.2-2.2M10 17.5l2.2-2.2M2.5 10l2.2-2.2M2.5 10l2.2 2.2M17.5 10l-2.2-2.2M17.5 10l-2.2 2.2" /></svg>
      </i>
      <div class="arrange-copy">
        <strong>Anordnen</strong>
        <span>{{ hint }}</span>
        <div v-if="hidden.length" class="arrange-hidden">
          <small>Ausgeblendet</small>
          <button v-for="item in hidden" :key="item.key" type="button" @click="emit('show', item.key)"><b aria-hidden="true">+</b> {{ item.label }}</button>
        </div>
      </div>
      <div class="arrange-actions">
        <button v-if="customized" type="button" class="arrange-reset" @click="emit('reset')">Zurücksetzen</button>
        <button type="button" class="arrange-done" @click="emit('done')">Fertig</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  editing: { type: Boolean, default: false },
  hidden: { type: Array, default: () => [] }, // [{ key, label }]
  customized: { type: Boolean, default: false },
  hint: { type: String, default: 'Ziehen Sie die Kästen an ihren Platz – auch in die andere Spalte. Am Telefon kurz halten, dann ziehen.' },
})
const emit = defineEmits(['show', 'reset', 'done'])
</script>

<style scoped>
.arrange-bar { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid #bae6fd; border-left: 4px solid var(--brand-blue); border-radius: 13px; background: #eff8ff; }
.arrange-bar > i { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--brand-blue); color: #fff; }
.arrange-bar svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.arrange-copy strong { display: block; color: var(--brand-blue); font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; }
.arrange-copy > span { display: block; margin-top: 3px; color: #0c4a6e; font-size: 13px; line-height: 1.5; }
.arrange-hidden { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 9px; }
.arrange-hidden small { margin-right: 2px; color: var(--text-muted); font-size: 11px; font-weight: 600; }
.arrange-hidden button { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px 5px 7px; border: 1px solid #cfe4f3; border-radius: 999px; background: #fff; color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer; transition: border-color .15s; }
.arrange-hidden button:hover { border-color: var(--brand-blue); }
.arrange-hidden b { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: #10b981; color: #fff; font-size: 13px; line-height: 1; }
.arrange-actions { display: flex; gap: 8px; }
.arrange-actions button { min-height: 38px; padding: 0 16px; border-radius: 999px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.arrange-reset { border: 1px solid var(--brand-blue); background: #fff; color: var(--brand-blue); }
.arrange-done { border: 1px solid var(--brand-blue); background: var(--brand-blue); color: #fff; }
.arrange-bar-enter-active, .arrange-bar-leave-active { transition: opacity .2s, transform .2s; }
.arrange-bar-enter-from, .arrange-bar-leave-to { opacity: 0; transform: translateY(-6px); }
@media (max-width: 680px) {
  .arrange-bar { grid-template-columns: 30px minmax(0, 1fr); }
  .arrange-bar > i { width: 30px; height: 30px; }
  .arrange-actions { grid-column: 1 / -1; }
  .arrange-actions button { flex: 1; }
}
</style>
