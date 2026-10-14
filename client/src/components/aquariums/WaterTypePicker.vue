<template>
  <fieldset class="wtp">
    <legend>Wassertyp</legend>
    <p class="wtp-hint">Welches Wasser wird untersucht?</p>

    <div class="wtp-grid" role="radiogroup" aria-label="Wassertyp">
      <label v-for="type in WATER_TYPE_CARDS" :key="type.value" :class="['wtp-card', type.tone, { on: modelValue === type.value }]">
        <input type="radio" name="water_type" :value="type.value" :checked="modelValue === type.value" @change="choose(type.value)" />
        <span class="wtp-scene" aria-hidden="true">
          <svg viewBox="0 0 120 70" preserveAspectRatio="xMidYMax slice">
            <rect class="wtp-sky" width="120" height="70" />
            <g class="wtp-waves">
              <path class="wtp-wave back" d="M0 26c10-5 20-5 30 0s20 5 30 0 20-5 30 0 20 5 30 0 20-5 30 0v50H0z" />
              <path class="wtp-wave front" d="M0 30c10 4 20 4 30 0s20-4 30 0 20 4 30 0 20-4 30 0 20 4 30 0v50H0z" />
            </g>
            <g class="wtp-motif">
              <template v-if="type.value === 'Meerwasser'">
                <path d="M26 66c0-9-6-12-6-18M26 58c3-4 7-4 9-10M26 54c-3-3-7-3-9-7" />
                <path d="M44 66c0-6 3-9 3-14M44 60c-2-2-5-2-6-5" />
                <path class="fish" d="M74 42c4-4 11-4 15 0-4 4-11 4-15 0zM74 42l-4-3v6z" />
                <circle class="eye" cx="84" cy="41" r="0.9" />
              </template>
              <template v-else-if="type.value === 'Süßwasser'">
                <path d="M22 66c0-12 3-19 9-25M22 66c-1-8-6-13-10-16M38 66c0-9 4-15 10-18M38 66c-2-5-1-9 2-13" />
                <path class="fish" d="M76 46c4-4 10-4 14 0-4 4-10 4-14 0zM76 46l-4-3v6z" />
                <circle class="eye" cx="85" cy="45" r="0.9" />
              </template>
              <template v-else-if="type.value === 'Osmosewasser'">
                <path class="fish" d="M60 34c6 7 9 12 9 16a9 9 0 0 1-18 0c0-4 3-9 9-16z" />
                <path d="M56 51a4 4 0 0 0 4 4" />
                <path d="M30 46v6M27 49h6M88 42v6M85 45h6M40 60v4M38 62h4" />
              </template>
              <template v-else-if="type.value === 'Meersalz'">
                <path class="fish" d="M24 66l9-14 9 14zM44 66l7-11 7 11zM60 66l10-16 10 16z" />
                <path d="M84 58l4-4 4 4-4 4zM92 48l3-3 3 3-3 3zM18 54l3-3 3 3-3 3z" />
              </template>
              <template v-else>
                <path class="fish" d="M20 46c3-3 8-3 11 0-3 3-8 3-11 0zM20 46l-3-2v4z" />
                <path class="fish" d="M50 55c3-3 8-3 11 0-3 3-8 3-11 0zM50 55l-3-2v4z" />
                <path class="fish" d="M78 42c3-3 8-3 11 0-3 3-8 3-11 0zM78 42l-3-2v4z" />
                <path d="M10 66h100" />
              </template>
            </g>
            <g class="wtp-bubbles">
              <circle cx="100" cy="60" r="1.6" /><circle cx="104" cy="52" r="1.1" /><circle cx="98" cy="46" r="1.3" />
            </g>
          </svg>
          <span class="wtp-check">✓</span>
        </span>
        <span class="wtp-text">
          <strong>{{ breakable(type.value) }}</strong>
          <small>{{ type.description }}</small>
        </span>
      </label>
    </div>

    <p v-if="note" class="wtp-note" aria-live="polite">
      <i aria-hidden="true">i</i>{{ note }}
    </p>
  </fieldset>
</template>

<script setup>
import { computed } from 'vue'
import { WATER_TYPE_CARDS } from '@/services/waterTypeFields'

const props = defineProps({
  modelValue: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])

// Was die Wahl für die nächsten Schritte bedeutet.
const NOTES = {
  Meerwasser: 'Als Nächstes fragen wir nach Ihrem Versorgungssystem – daraus entstehen die Dosierempfehlungen.',
  Osmosewasser: 'Wird als Osmosequelle angelegt. Danach verknüpfen Sie sie mit Ihren Aquarien, damit Funde im RO-Wasser in deren Empfehlungen einfließen.',
  Meersalz: 'Für ein frisch angesetztes Salz – etwa um eine neue Charge vor dem Wasserwechsel zu prüfen.',
}
const note = computed(() => NOTES[props.modelValue] || '')

// Weiche Trennstelle vor „wasser“: passt der Name nicht, bricht er als „Osmose-wasser“ um.
function breakable(name) {
  return name.replace(/(.)(wasser)$/, '$1\u00AD$2')
}

function choose(value) {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.wtp { min-width: 0; margin: 0; padding: 0; border: 0; container-type: inline-size; }
/* Titel und Hinweis wie beim Versorgungssystem darunter */
.wtp legend { padding: 0; color: var(--text); font-size: 16px; font-weight: var(--fw-bold); }
.wtp-hint { margin: 4px 0 12px; color: var(--text-muted); font-size: 13px; }
/* Karten mit kleiner Szene */
/* Fünf nebeneinander, wo Platz ist; sonst 3 + 2 – entscheidend ist die Breite des Feldes, nicht des Fensters. */
.wtp-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
@container (min-width: 600px) { .wtp-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; } }
.wtp-card {
  --tone: var(--brand-blue); --tone-soft: #dbeefb; --tone-deep: #0b5fa8; --sky: #f5fbff;
  position: relative; display: grid; grid-template-rows: auto 1fr; overflow: hidden;
  border: 1px solid var(--border); border-radius: 14px; background: #fff; cursor: pointer;
  transition: border-color .18s, box-shadow .18s, transform .18s;
}
.wtp-card.fresh { --tone: #0f766e; --tone-soft: #d2f5ec; --tone-deep: #0d5c55; --sky: #f4fdfa; }
.wtp-card.aqua { --tone: #047857; --tone-soft: #d6f5e6; --tone-deep: #065f46; --sky: #f4fcf8; }
.wtp-card.osmo { --tone: #0e7490; --tone-soft: #d9f4fa; --tone-deep: #0b5566; --sky: #f6fdfe; }
.wtp-card.salt { --tone: #7c3aed; --tone-soft: #ece6fd; --tone-deep: #5b21b6; --sky: #faf8ff; }
.wtp-card:hover { border-color: var(--tone); transform: translateY(-2px); box-shadow: 0 10px 22px rgba(10,27,67,0.08); }
.wtp-card.on { border-color: var(--tone); box-shadow: 0 0 0 1.5px var(--tone) inset, 0 10px 24px color-mix(in srgb, var(--tone) 18%, transparent); }
.wtp-card input { position: absolute; opacity: 0; pointer-events: none; }
.wtp-card:has(input:focus-visible) { box-shadow: var(--shadow-focus); }

/* Die Szene wächst mit der Kartenbreite, damit Wellen und Boden immer zu sehen sind. */
.wtp-scene { position: relative; display: block; width: 100%; aspect-ratio: 120 / 52; max-height: 84px; }
.wtp-scene svg { display: block; width: 100%; height: 100%; }
.wtp-sky { fill: var(--sky); }
.wtp-wave { transition: transform .5s cubic-bezier(.2,.8,.3,1), fill .25s; }
.wtp-wave.back { fill: var(--tone-soft); opacity: .7; }
.wtp-wave.front { fill: var(--tone-soft); }
.wtp-card.on .wtp-wave.back { fill: color-mix(in srgb, var(--tone) 45%, #fff); }
.wtp-card.on .wtp-wave.front { fill: color-mix(in srgb, var(--tone) 72%, #fff); }
/* Ausgewählt: das Wasser steigt und bewegt sich sanft */
.wtp-card.on .wtp-waves { transform: translateY(-6px); transition: transform .5s cubic-bezier(.2,.8,.3,1); }
.wtp-waves { transition: transform .5s cubic-bezier(.2,.8,.3,1); }
.wtp-card.on .wtp-wave.back { animation: wtp-sway 5s ease-in-out infinite; }
.wtp-card.on .wtp-wave.front { animation: wtp-sway 4s ease-in-out infinite reverse; }
@keyframes wtp-sway { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-14px); } }
.wtp-motif path { fill: none; stroke: var(--tone); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; transition: stroke .25s; }
.wtp-motif .fish { fill: #fff; }
.wtp-motif .eye { fill: var(--tone); }
.wtp-card.on .wtp-motif path { stroke: var(--tone-deep); }
.wtp-card.on .wtp-motif .fish { animation: wtp-swim 3.2s ease-in-out infinite; transform-box: fill-box; }
@keyframes wtp-swim { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-5px); } }
.wtp-bubbles circle { fill: none; stroke: var(--tone); stroke-width: 1; opacity: 0; }
.wtp-card.on .wtp-bubbles circle { opacity: .7; animation: wtp-rise 2.6s ease-in infinite; transform-box: fill-box; }
.wtp-card.on .wtp-bubbles circle:nth-child(2) { animation-delay: .8s; }
.wtp-card.on .wtp-bubbles circle:nth-child(3) { animation-delay: 1.6s; }
@keyframes wtp-rise { from { transform: translateY(0); opacity: .8; } to { transform: translateY(-34px); opacity: 0; } }

.wtp-check { position: absolute; top: 6px; right: 6px; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--tone); color: #fff; font-size: 12px; font-weight: 800; opacity: 0; transform: scale(.5); transition: opacity .18s, transform .18s; }
.wtp-card.on .wtp-check { opacity: 1; transform: none; }

.wtp-text { display: grid; align-content: start; gap: 2px; min-width: 0; padding: 8px 10px 10px; }
.wtp-text strong { overflow: hidden; color: var(--text); font-size: 13px; font-weight: var(--fw-bold); line-height: 1.3; white-space: normal; hyphens: manual; }
.wtp-text small { color: var(--text-muted); font-size: 11.5px; line-height: 1.35; }

.wtp-note { display: flex; align-items: flex-start; gap: 9px; margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: #f4f9fd; color: var(--text-muted); font-size: 12.5px; line-height: 1.5; animation: wtp-note .25s ease-out; }
.wtp-note i { display: grid; place-items: center; flex: none; width: 18px; height: 18px; margin-top: 1px; border-radius: 50%; background: var(--brand-blue); color: #fff; font-size: 11px; font-style: normal; font-weight: 800; }
@keyframes wtp-note { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }

@container (max-width: 460px) {
  .wtp-grid { gap: 8px; }
  .wtp-scene { aspect-ratio: 120 / 62; }
  .wtp-text { padding: 9px 7px 11px; }
  .wtp-text small { display: none; }
  .wtp-text strong { font-size: 12.5px; line-height: 1.25; white-space: normal; hyphens: manual; }
}
@media (prefers-reduced-motion: reduce) {
  .wtp-card, .wtp-wave, .wtp-waves, .wtp-check { transition: none; }
  .wtp-card:hover { transform: none; }
  .wtp-card.on .wtp-wave, .wtp-card.on .wtp-motif .fish, .wtp-card.on .wtp-bubbles circle, .wtp-note { animation: none; }
}
</style>
