<template>
  <div class="lang-switch" ref="root">
    <button type="button" class="lang-btn" :class="{ open }" @click="open = !open">
      <svg class="globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      <span>{{ current.code }}</span>
      <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6" /></svg>
    </button>

    <ul v-if="open" class="lang-menu">
      <li v-for="l in languages" :key="l.code">
        <button type="button" :class="{ active: l.code === current.code }" @click="select(l)">
          <span class="l-code">{{ l.code }}</span>
          <span class="l-label">{{ l.label }}</span>
          <svg v-if="l.code === current.code" class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5" /></svg>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const languages = [
  { code: 'DE', label: 'Deutsch' },
  { code: 'EN', label: 'English' },
  { code: 'FR', label: 'Français' },
  { code: 'ES', label: 'Español' },
]

const current = ref(languages[0])
const open = ref(false)
const root = ref(null)

function select(lang) {
  current.value = lang
  open.value = false
}
function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<style scoped>
.lang-switch { position: relative; }
.lang-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 10px;
  border: 1px solid var(--border); border-radius: 999px;
  background: rgba(255,255,255,0.7);
  color: var(--text-muted);
  font-size: 12px; font-weight: 700;
  cursor: pointer; transition: border-color 0.15s, color 0.15s;
}
.lang-btn:hover { border-color: var(--teal-300); color: var(--text); }
.lang-btn .globe { width: 14px; height: 14px; }
.lang-btn .chev { width: 13px; height: 13px; transition: transform 0.18s; }
.lang-btn.open .chev { transform: rotate(180deg); }

.lang-menu {
  position: absolute; top: calc(100% + 6px); right: 0;
  min-width: 172px; padding: 5px; margin: 0;
  list-style: none;
  background: #fff; border: 1px solid var(--border);
  border-radius: 12px; box-shadow: 0 18px 40px rgba(10,27,67,0.16);
  z-index: 50;
}
.lang-menu li button {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border: 0; background: transparent;
  border-radius: 8px; cursor: pointer; text-align: left;
  font-size: 13px; color: var(--text);
}
.lang-menu li button:hover { background: var(--teal-50); }
.lang-menu li button.active { font-weight: 700; }
.l-code { width: 22px; font-size: 11px; font-weight: 800; color: var(--text-muted); }
.lang-menu li button.active .l-code { color: var(--teal-700); }
.l-label { flex: 1; }
.check { width: 15px; height: 15px; color: var(--teal-500); }
</style>
