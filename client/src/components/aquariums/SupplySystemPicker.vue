<template>
  <fieldset class="supply">
    <legend>Versorgungssystem</legend>
    <p class="supply-hint">Womit versorgen Sie das Becken mit KH, Calcium und Magnesium?</p>

    <div class="supply-modes" role="radiogroup" aria-label="Versorgungssystem">
      <label v-for="mode in SUPPLY_MODES" :key="mode.value" :class="['supply-card', { on: form.supply_mode === mode.value }]">
        <input type="radio" name="supply_mode" :value="mode.value" :checked="form.supply_mode === mode.value" @change="setMode(mode.value)" />
        <span class="supply-icon" aria-hidden="true">
          <svg v-if="mode.value === 'none'" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" /><path d="M8.5 23.5 23.5 8.5" /></svg>
          <svg v-else-if="mode.value === 'ati'" viewBox="0 0 32 32"><path d="M10 9h4v3l1 2v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V14l1-2z" /><path d="M18 9h4v3l1 2v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V14l1-2z" /></svg>
          <svg v-else-if="mode.value === 'nyos'" viewBox="0 0 32 32"><path d="M16 5c4.5 5.4 7 9.6 7 13a7 7 0 0 1-14 0c0-3.4 2.5-7.6 7-13z" /><path d="M13 19.5a3 3 0 0 0 3 3" /></svg>
          <svg v-else viewBox="0 0 32 32"><path d="M13 5h6v4l2 3v14a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V12l2-3z" /><path d="M14 19h4M16 17v4" /></svg>
        </span>
        <strong>{{ mode.label }}</strong>
        <small>{{ mode.description }}</small>
      </label>
    </div>

    <!-- ATI und NYOS: die Linien als Karten, je mit beiden Komponenten, Bild und Link -->
    <div v-if="lineChoice" class="supply-follow">
      <span class="supply-follow-label">{{ lineChoice.question }} <em>optional</em></span>
      <div class="line-cards" role="radiogroup" :aria-label="lineChoice.question">
        <label v-for="line in lineChoice.lines" :key="line.key" :class="['line-card', { on: form.supply_line === line.key }]">
          <input type="radio" :name="`${form.supply_mode}_line`" :value="line.key" :checked="form.supply_line === line.key" @click="toggleLine(line.key)" />
          <span class="line-head">
            <strong>{{ line.label }}</strong>
            <small>{{ line.description }}</small>
            <i class="line-check" aria-hidden="true">✓</i>
          </span>
          <span class="line-parts">
            <a v-for="part in line.parts" :key="part.url" :href="part.url" target="_blank" rel="noopener noreferrer" class="line-part" @click.stop>
              <img :src="part.image" alt="" loading="lazy" />
              <span>
                <b>{{ part.name }}</b>
                <small>{{ part.note }}</small>
                <em>{{ lineChoice.linkLabel }} <ArrowIcon direction="external" /></em>
              </span>
            </a>
          </span>
        </label>
      </div>
      <p v-if="form.supply_mode === 'ati'" class="line-foot">Beide Komponenten gibt es auch als Set – <a :href="ATI_ESSENTIALS_URL" target="_blank" rel="noopener noreferrer">alle Essentials im ATI Shop <ArrowIcon direction="external" /></a></p>
      <p v-else class="line-foot">Dazu passend: die <a :href="NYOS_ION_ELEMENTS[0].url" target="_blank" rel="noopener noreferrer">ION ELEMENTS 1–3</a> für die Spurenelemente. NYOS verkauft über Händler – <a :href="NYOS_DEALER_URL" target="_blank" rel="noopener noreferrer">Händler finden <ArrowIcon direction="external" /></a></p>
    </div>

    <div v-if="asksForBottles(form.supply_mode)" class="supply-follow">
      <span class="supply-follow-label">Auf wie viele Flaschen verteilt sich das Mittel?</span>
      <div class="supply-bottles" role="radiogroup" aria-label="Anzahl Flaschen">
        <label v-for="option in SUPPLY_BOTTLES" :key="option.value" :class="['bottle-card', { on: form.supply_bottles === option.value }]">
          <input type="radio" name="supply_bottles" :value="option.value" :checked="form.supply_bottles === option.value" @change="set('supply_bottles', option.value)" />
          <span class="bottle-row" aria-hidden="true">
            <svg v-for="n in option.value" :key="n" viewBox="0 0 14 30"><path d="M4.5 1h5v4l2.5 4v18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l2.5-4z" /></svg>
          </span>
          <strong>{{ option.label }}</strong>
          <small>{{ option.description }}</small>
        </label>
      </div>
      <label class="supply-product">
        <span>Produktname <em>optional</em></span>
        <input type="text" :value="form.supply_product || ''" placeholder="z. B. Triton Core7, Red Sea Foundation" @input="set('supply_product', $event.target.value)" />
      </label>
    </div>
  </fieldset>
</template>

<script setup>
import ArrowIcon from '@/components/ui/ArrowIcon.vue'
import { computed } from 'vue'
import { SUPPLY_MODES, ATI_SUPPLY_LINES, SUPPLY_BOTTLES, asksForBottles, describeSupply } from '@/services/supplySystem'
import { ATI_ESSENTIALS_LINES } from '@/services/atiProductCatalog'
import { NYOS_DEALER_URL, NYOS_ION_ELEMENTS, NYOS_LINK_LABEL, NYOS_SUPPLY_LINES } from '@/services/nyosProductCatalog'

const props = defineProps({
  form: { type: Object, required: true },
})

function set(key, value) {
  props.form[key] = value
  props.form.supply_system = describeSupply(props.form)
}

const ATI_ESSENTIALS_URL = 'https://shop.atiaquaristik.com/en/reefessentials/essentials/'
const PART_NOTES = { kh: 'Komponente 1 · Karbonathärte', calcium: 'Komponente 2 · Calcium' }

// Was es nach der Wahl von ATI oder NYOS noch zu wählen gibt – in derselben Kartenform.
const lineChoice = computed(() => {
  if (props.form.supply_mode === 'ati') {
    return {
      question: 'Welche Linie?',
      linkLabel: 'Im ATI Shop ansehen',
      lines: ATI_SUPPLY_LINES.map((label) => Object.values(ATI_ESSENTIALS_LINES).find((line) => line.label === label)).filter(Boolean).map((line) => ({
        key: line.label,
        label: line.label,
        description: line.note,
        parts: line.components.map((part) => ({ ...part, note: PART_NOTES[part.key] || '' })),
      })),
    }
  }
  if (props.form.supply_mode === 'nyos') return { question: 'Welche Form nutzen Sie?', linkLabel: NYOS_LINK_LABEL, lines: NYOS_SUPPLY_LINES }
  return null
})

// Ein zweiter Klick auf die gewählte Linie hebt die Wahl wieder auf.
function toggleLine(key) {
  set('supply_line', props.form.supply_line === key ? '' : key)
}

function setMode(mode) {
  // Die Linie gehört zum Hersteller – beim Wechsel gilt sie nicht mehr.
  if (mode !== props.form.supply_mode) props.form.supply_line = ''
  props.form.supply_mode = mode
  if (!asksForBottles(mode)) props.form.supply_bottles = null
  props.form.supply_product = ''
  props.form.supply_system = describeSupply(props.form)
}
</script>

<style scoped>
.supply { min-width: 0; margin: 0; padding: 0; border: 0; }
.supply legend { padding: 0; color: var(--text); font-size: 16px; font-weight: var(--fw-bold); }
.supply-hint { margin: 4px 0 12px; color: var(--text-muted); font-size: 13px; }

.supply-modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 10px; }
.supply-card,
.bottle-card {
  position: relative; display: flex; flex-direction: column; gap: 4px;
  padding: 14px; border: 1px solid var(--border); border-radius: 16px; background: #fff;
  cursor: pointer; transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.supply-card:hover,
.bottle-card:hover { border-color: var(--teal-300); }
.supply-card.on,
.bottle-card.on { border-color: var(--teal-500); background: var(--teal-50); box-shadow: 0 0 0 1px var(--teal-500) inset; }
.supply-card input,
.bottle-card input { position: absolute; opacity: 0; pointer-events: none; }
.supply-card:has(input:focus-visible),
.bottle-card:has(input:focus-visible) { box-shadow: var(--shadow-focus); }
.supply-card strong,
.bottle-card strong { color: var(--text); font-size: 13px; font-weight: var(--fw-bold); }
.supply-card small,
.bottle-card small { color: var(--text-muted); font-size: 12px; line-height: 1.4; }

.supply-icon { display: grid; place-items: center; width: 34px; height: 34px; margin-bottom: 4px; border-radius: 10px; background: var(--teal-50); }
.supply-card.on .supply-icon { background: #fff; }
.supply-icon svg { width: 22px; height: 22px; fill: none; stroke: var(--brand-blue); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

.supply-follow { display: grid; gap: 10px; margin-top: 14px; padding: 14px; border-radius: 16px; background: var(--teal-50); }
.supply-follow-label,
.supply-product > span { color: var(--text); font-size: 13px; font-weight: var(--fw-semibold); }
.supply-follow em,
.supply-product em { margin-left: 4px; color: var(--text-muted); font-style: normal; font-weight: var(--fw-medium); }


.supply-bottles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.bottle-card { align-items: center; text-align: center; }
.bottle-row { display: flex; align-items: flex-end; gap: 3px; height: 30px; margin-bottom: 4px; }
.bottle-row svg { width: 13px; height: 28px; fill: var(--teal-200); stroke: var(--brand-blue); stroke-width: 1.4; stroke-linejoin: round; }
.bottle-card.on .bottle-row svg { fill: var(--brand-cyan); }

.supply-product { display: flex; flex-direction: column; gap: 7px; }

/* Linien von ATI und NYOS: je Karte beide Komponenten mit Bild und Link */
.line-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 10px; }
.line-card { position: relative; display: grid; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 16px; background: #fff; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
.line-card:hover { border-color: var(--teal-300); }
.line-card.on { border-color: var(--teal-500); box-shadow: 0 0 0 1px var(--teal-500) inset; }
.line-card input { position: absolute; opacity: 0; pointer-events: none; }
.line-card:has(input:focus-visible) { box-shadow: var(--shadow-focus); }
.line-head { position: relative; display: grid; gap: 2px; padding-right: 28px; }
.line-head strong { color: var(--text); font-size: 14px; font-weight: var(--fw-bold); }
.line-head small { color: var(--text-muted); font-size: 12px; }
.line-check { position: absolute; top: 0; right: 0; display: grid; place-items: center; width: 22px; height: 22px; border: 1.5px solid #c5d2df; border-radius: 50%; color: transparent; font-size: 12px; font-style: normal; font-weight: 800; }
.line-card.on .line-check { border-color: var(--teal-500); background: var(--teal-500); color: #fff; }
.line-parts { display: grid; gap: 6px; }
.line-part { display: grid; grid-template-columns: 44px minmax(0, 1fr); align-items: center; gap: 10px; padding: 6px 8px 6px 6px; border: 1px solid #e4edf5; border-radius: 12px; background: #fbfdff; color: inherit; text-decoration: none; transition: border-color .15s; }
.line-part:hover { border-color: var(--brand-blue); }
.line-part:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.line-part img { width: 44px; height: 52px; border-radius: 8px; background: #fff; object-fit: contain; }
.line-part span { display: grid; gap: 1px; min-width: 0; }
.line-part b { overflow: hidden; color: var(--text); font-size: 12.5px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.line-part small { color: var(--text-muted); font-size: 11.5px; }
.line-part em { color: var(--brand-blue); font-size: 11px; font-style: normal; font-weight: 600; }
.line-foot { color: var(--text-muted); font-size: 12px; line-height: 1.5; }
.line-foot a { color: var(--brand-blue); font-weight: 600; text-decoration: none; }
.line-foot a:hover { text-decoration: underline; }
.supply-product input {
  width: 100%; height: 44px; padding: 0 14px; border: 1px solid var(--border); border-radius: 13px;
  background: #fff; color: var(--text); font-size: 14px; outline: 0;
}
.supply-product input:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }

@media (max-width: 640px) {
  .supply-modes { grid-template-columns: 1fr; }
  .supply-card { display: grid; grid-template-columns: 34px 1fr; column-gap: 12px; align-items: center; }
  .supply-icon { grid-row: span 2; margin: 0; }
  .supply-bottles { grid-template-columns: 1fr; }
  .bottle-card { display: grid; grid-template-columns: 46px 1fr; column-gap: 12px; align-items: center; text-align: left; }
  .bottle-row { grid-row: span 2; margin: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .supply-card, .bottle-card { transition: none; }
}
</style>
