<template>
  <Teleport to="body">
    <Transition name="first-loader">
      <div v-if="showFirstVisit" class="first-visit-loader" role="status" aria-live="polite" :aria-label="phases[phase]">
        <div class="loader-particles" aria-hidden="true">
          <i v-for="particle in particles" :key="particle.id" :style="particle.style"></i>
        </div>

        <header class="first-loader-brand">
          <img src="/ati-logo.png" alt="ATI" />
          <span>Reef Lab</span>
        </header>

        <div class="analysis-stage" :class="`is-phase-${phase}`" aria-hidden="true">
          <div class="analysis-lens">
            <span class="lens-grid"></span>
            <span class="lens-depth"></span>
            <span class="scan-sector"></span>
            <span class="scan-beam"></span>
            <span class="water-ring ring-one"></span>
            <span class="water-ring ring-two"></span>
            <span class="water-ring ring-three"></span>
            <span class="falling-drop"></span>
            <span class="sample-core"><i></i></span>
            <div class="profile-ready">
              <span><i></i></span>
              <small>Wasserprofil</small>
              <strong>Bereit</strong>
            </div>
          </div>

          <span
            v-for="element in elements"
            :key="element.symbol"
            class="element-result"
            :style="element.style"
          >
            <b>{{ element.symbol }}</b>
            <i>{{ element.value }}</i>
            <small>{{ element.unit }}</small>
          </span>
        </div>

        <div class="first-loader-status">
          <span><i></i> ICP-OES Analyse</span>
          <strong :key="phase">{{ phases[phase] }}</strong>
          <div class="first-loader-progress"><i :style="{ width: progress + '%' }"></i></div>
          <small>{{ progress }}%</small>
        </div>
      </div>
    </Transition>

  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { APP_PRELOADER_EVENT } from '@/services/appPreloader'

const FIRST_VISIT_DURATION = 5200
const showFirstVisit = ref(false)
const phase = ref(0)
const progress = ref(6)
const phases = [
  'Probe trifft auf die Analysefläche',
  '40+ Elemente werden entschlüsselt',
  'Werte werden mit Zielbereichen verglichen',
  'Ihr persönlicher Wasserbericht ist bereit',
]
const timers = new Set()

const particles = computed(() => Array.from({ length: 18 }, (_, index) => ({
  id: index,
  style: {
    '--particle-x': `${(index * 37 + 9) % 96}%`,
    '--particle-y': `${(index * 53 + 12) % 92}%`,
    '--particle-size': `${3 + (index % 4) * 2}px`,
    '--particle-delay': `${(index % 7) * -0.7}s`,
    '--particle-duration': `${6 + (index % 5)}s`,
  },
})))

const elements = [
  { symbol: 'Ca', value: '412', unit: 'mg/l', style: { '--result-x': '8%', '--result-y': '16%', '--result-delay': '.05s' } },
  { symbol: 'Mg', value: '1280', unit: 'mg/l', style: { '--result-x': '76%', '--result-y': '12%', '--result-delay': '.18s' } },
  { symbol: 'KH', value: '7.2', unit: 'dKH', style: { '--result-x': '1%', '--result-y': '48%', '--result-delay': '.31s' } },
  { symbol: 'PO₄', value: '0.041', unit: 'mg/l', style: { '--result-x': '79%', '--result-y': '45%', '--result-delay': '.44s' } },
  { symbol: 'I', value: '0.06', unit: 'mg/l', style: { '--result-x': '13%', '--result-y': '78%', '--result-delay': '.57s' } },
  { symbol: 'NO₃', value: '8.4', unit: 'mg/l', style: { '--result-x': '72%', '--result-y': '77%', '--result-delay': '.7s' } },
]

function later(callback, delay) {
  const timer = window.setTimeout(() => {
    timers.delete(timer)
    callback()
  }, delay)
  timers.add(timer)
}

function playFirstVisitLoader() {
  if (showFirstVisit.value) return
  phase.value = 0
  progress.value = 6
  showFirstVisit.value = true
  document.documentElement.classList.add('is-preloading')

  later(() => {
    phase.value = 1
    progress.value = 34
  }, 1050)
  later(() => {
    phase.value = 2
    progress.value = 68
  }, 2550)
  later(() => {
    phase.value = 3
    progress.value = 92
  }, 4050)
  later(() => {
    progress.value = 100
  }, 4750)
  later(() => {
    showFirstVisit.value = false
    document.documentElement.classList.remove('is-preloading')
  }, FIRST_VISIT_DURATION)
}

function handlePreloaderRequest() {
  playFirstVisitLoader()
}

onMounted(() => {
  window.addEventListener(APP_PRELOADER_EVENT, handlePreloaderRequest)
})

onBeforeUnmount(() => {
  window.removeEventListener(APP_PRELOADER_EVENT, handlePreloaderRequest)
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.clear()
  document.documentElement.classList.remove('is-preloading')
})
</script>

<style scoped>
.first-visit-loader { position:fixed; inset:0; z-index:10000; }
.first-visit-loader { display:grid; place-items:center; overflow:hidden; background:radial-gradient(circle at 50% 45%,rgba(0,190,208,.2),transparent 25rem),linear-gradient(145deg,#071737,#0a1b43 58%,#07355a); color:#fff; }
.first-visit-loader::before { position:absolute; inset:0; background-image:linear-gradient(rgba(136,193,233,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(136,193,233,.04) 1px,transparent 1px); background-size:42px 42px; mask-image:radial-gradient(circle at center,#000,transparent 66%); content:''; animation:grid-breathe 4s ease-in-out infinite; }
.first-visit-loader::after { position:absolute; top:50%; left:50%; width:min(78vw,760px); aspect-ratio:1; border:1px solid rgba(136,193,233,.08); border-radius:50%; content:''; transform:translate(-50%,-50%); box-shadow:0 0 0 90px rgba(136,193,233,.025),0 0 0 180px rgba(136,193,233,.018); }
.first-loader-brand { position:absolute; top:clamp(24px,6vh,64px); left:50%; display:flex; align-items:center; gap:14px; transform:translateX(-50%); }
.first-loader-brand img { width:92px; filter:brightness(0) invert(1); opacity:.92; }
.first-loader-brand span { padding-left:14px; border-left:1px solid rgba(255,255,255,.22); color:rgba(255,255,255,.66); font-size:12px; font-weight:750; letter-spacing:.13em; text-transform:uppercase; }
.loader-particles { position:absolute; inset:0; }
.loader-particles i { position:absolute; top:var(--particle-y); left:var(--particle-x); width:var(--particle-size); height:var(--particle-size); border-radius:50%; background:rgba(136,225,239,.55); box-shadow:0 0 12px rgba(0,190,208,.5); animation:particle-drift var(--particle-duration) ease-in-out var(--particle-delay) infinite; }
.analysis-stage { position:relative; width:min(88vw,480px); aspect-ratio:1; margin-top:-54px; }
.analysis-lens { position:absolute; inset:17%; overflow:hidden; border:1px solid rgba(161,236,244,.44); border-radius:50%; background:radial-gradient(circle at 45% 38%,rgba(95,232,241,.26),transparent 24%),radial-gradient(circle at center,rgba(0,190,208,.25),rgba(0,67,113,.58) 58%,rgba(2,20,50,.86)); box-shadow:inset 0 0 32px rgba(118,230,243,.18),0 0 0 10px rgba(136,225,239,.035),0 28px 80px rgba(0,0,0,.35),0 0 50px rgba(0,190,208,.12); }
.analysis-lens::before { position:absolute; inset:7%; z-index:5; border:1px solid rgba(160,239,247,.12); border-radius:50%; content:''; }
.lens-grid { position:absolute; inset:0; border-radius:50%; background-image:linear-gradient(rgba(144,235,243,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(144,235,243,.08) 1px,transparent 1px); background-size:28px 28px; transform:perspective(300px) rotateX(58deg) scale(1.25); }
.lens-depth { position:absolute; inset:28%; border:1px dashed rgba(136,225,239,.26); border-radius:50%; animation:lens-pulse 2.3s ease-in-out infinite; }
.scan-sector { position:absolute; inset:-1%; opacity:0; border-radius:50%; background:conic-gradient(from -36deg,transparent 0 69%,rgba(0,190,208,.03) 70%,rgba(95,232,241,.35) 98%,rgba(174,249,255,.65)); transition:opacity .45s ease; animation:scanner-turn 1.65s linear infinite; mask-image:radial-gradient(circle,transparent 0 10%,#000 11%); }
.scan-beam { position:absolute; z-index:4; top:50%; left:50%; width:45%; height:1px; opacity:0; background:linear-gradient(90deg,rgba(184,250,255,.95),transparent); box-shadow:0 0 10px rgba(0,190,208,.9); transform-origin:left; transition:opacity .45s ease; animation:scanner-turn 1.65s linear infinite; }
.water-ring { position:absolute; z-index:3; top:50%; left:50%; width:18%; aspect-ratio:1; border:1px solid rgba(165,244,250,.65); border-radius:50%; opacity:0; transform:translate(-50%,-50%) scale(.2); }
.ring-one { animation:water-impact 2.3s .8s ease-out infinite; }
.ring-two { animation:water-impact 2.3s 1.15s ease-out infinite; }
.ring-three { animation:water-impact 2.3s 1.5s ease-out infinite; }
.falling-drop { position:absolute; z-index:8; top:-20%; left:calc(50% - 8px); width:16px; height:21px; border-radius:65% 35% 60% 40% / 70% 45% 55% 30%; background:linear-gradient(145deg,#d3fcff,#4be0eb 45%,#0072ce); box-shadow:0 0 22px rgba(0,190,208,.9); transform:rotate(45deg); animation:drop-entry 1.05s cubic-bezier(.55,.02,.72,.42) both; }
.sample-core { position:absolute; z-index:6; top:50%; left:50%; width:18px; height:18px; border:1px solid rgba(205,251,255,.78); border-radius:50%; background:#00bed0; box-shadow:0 0 0 9px rgba(0,190,208,.12),0 0 34px rgba(87,231,242,.95); transform:translate(-50%,-50%) scale(0); animation:core-arrive .4s 1s ease-out forwards,core-pulse 1.6s 1.4s ease-in-out infinite; transition:opacity .35s ease,transform .35s ease; }
.sample-core i { position:absolute; inset:5px; border-radius:50%; background:#e9feff; }
.profile-ready { position:absolute; z-index:9; inset:0; display:grid; place-content:center; justify-items:center; opacity:0; transform:scale(.75); transition:opacity .55s ease,transform .65s cubic-bezier(.2,.9,.2,1.15); }
.profile-ready>span { position:relative; width:54px; height:54px; margin-bottom:12px; border:1px solid rgba(188,249,253,.7); border-radius:50%; background:rgba(0,190,208,.17); box-shadow:0 0 28px rgba(0,190,208,.35); }
.profile-ready>span::before,.profile-ready>span::after { position:absolute; height:3px; border-radius:4px; background:#c9fbff; content:''; transform-origin:left center; }
.profile-ready>span::before { top:29px; left:14px; width:14px; transform:rotate(43deg); }
.profile-ready>span::after { top:35px; left:24px; width:24px; transform:rotate(-49deg); }
.profile-ready small { color:#88c1e9; font-size:8px; font-weight:800; letter-spacing:.17em; text-transform:uppercase; }
.profile-ready strong { margin-top:2px; font-size:19px; letter-spacing:-.02em; }
.element-result { position:absolute; z-index:10; top:var(--result-y); left:var(--result-x); display:grid; grid-template-columns:auto auto; column-gap:5px; align-items:baseline; min-width:78px; padding:8px 10px; border:1px solid rgba(163,238,244,.22); border-radius:12px; opacity:0; background:rgba(5,28,61,.72); box-shadow:0 12px 28px rgba(0,0,0,.2); backdrop-filter:blur(9px); transform:translateY(8px) scale(.9); transition:opacity .45s var(--result-delay) ease,transform .45s var(--result-delay) ease,border-color .4s ease; }
.element-result b { grid-row:1 / 3; align-self:center; color:#6ee5ed; font-size:15px; }
.element-result i { color:#fff; font-size:11px; font-style:normal; font-weight:750; font-variant-numeric:tabular-nums; }
.element-result small { color:rgba(255,255,255,.45); font-size:7px; letter-spacing:.05em; text-transform:none; }
.is-phase-1 .scan-sector,.is-phase-1 .scan-beam,.is-phase-2 .scan-sector,.is-phase-2 .scan-beam { opacity:1; }
.is-phase-1 .element-result,.is-phase-2 .element-result,.is-phase-3 .element-result { opacity:1; transform:translateY(0) scale(1); }
.is-phase-2 .element-result { border-color:rgba(0,190,208,.48); animation:result-check 1.8s var(--result-delay) ease-in-out infinite; }
.is-phase-3 .sample-core { opacity:0; transform:translate(-50%,-50%) scale(.4); }
.is-phase-3 .profile-ready { opacity:1; transform:scale(1); }
.first-loader-status { position:absolute; right:0; bottom:clamp(34px,8vh,78px); left:0; width:min(calc(100% - 44px),380px); margin:auto; text-align:center; }
.first-loader-status>span { display:inline-flex; align-items:center; gap:8px; color:#88c1e9; font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
.first-loader-status>span i { width:7px; height:7px; border-radius:50%; background:#00bed0; box-shadow:0 0 0 4px rgba(0,190,208,.14); }
.first-loader-status strong { display:block; min-height:30px; margin-top:12px; color:#fff; font-size:clamp(17px,3vw,22px); letter-spacing:-.02em; animation:phase-in .35s ease both; }
.first-loader-progress { height:4px; margin-top:18px; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.1); }
.first-loader-progress i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#0072ce,#00bed0); box-shadow:0 0 16px rgba(0,190,208,.7); transition:width .65s cubic-bezier(.2,.8,.3,1); }
.first-loader-status small { display:block; margin-top:8px; color:rgba(255,255,255,.5); font-size:10px; font-variant-numeric:tabular-nums; letter-spacing:.1em; }

.first-loader-leave-active { transition:opacity .55s ease,filter .55s ease; }
.first-loader-leave-to { opacity:0; filter:blur(8px); }

@keyframes grid-breathe { 50% { opacity:.46; transform:scale(1.025); } }
@keyframes particle-drift { 50% { opacity:.25; transform:translate3d(14px,-24px,0) scale(.7); } }
@keyframes scanner-turn { to { transform:rotate(360deg); } }
@keyframes lens-pulse { 50% { opacity:.35; transform:scale(1.15); } }
@keyframes drop-entry { 0% { opacity:0; transform:translateY(-28px) rotate(45deg) scale(.7); } 18% { opacity:1; } 82% { opacity:1; } 100% { opacity:0; transform:translateY(187px) rotate(45deg) scale(.45); } }
@keyframes core-arrive { to { transform:translate(-50%,-50%) scale(1); } }
@keyframes core-pulse { 50% { box-shadow:0 0 0 14px rgba(0,190,208,.04),0 0 42px rgba(87,231,242,.8); } }
@keyframes water-impact { 0% { opacity:.8; transform:translate(-50%,-50%) scale(.15); } 75%,100% { opacity:0; transform:translate(-50%,-50%) scale(5); } }
@keyframes result-check { 50% { border-color:rgba(124,237,245,.72); box-shadow:0 12px 28px rgba(0,0,0,.2),0 0 18px rgba(0,190,208,.1); } }
@keyframes phase-in { from { opacity:0; transform:translateY(6px); } }

@media (prefers-reduced-motion:reduce) {
  .first-visit-loader * { animation:none!important; transition:none!important; }
  .sample-core { transform:translate(-50%,-50%) scale(1); }
}

@media (max-width:520px) {
  .analysis-stage { width:min(96vw,430px); margin-top:-48px; }
  .analysis-lens { inset:20%; }
  .element-result { min-width:68px; padding:7px 8px; }
  .analysis-stage>.element-result:nth-of-type(1) { left:3%; }
  .analysis-stage>.element-result:nth-of-type(2) { right:3%; left:auto!important; }
  .analysis-stage>.element-result:nth-of-type(3) { left:0; }
  .analysis-stage>.element-result:nth-of-type(4) { right:0; left:auto!important; }
  .analysis-stage>.element-result:nth-of-type(5) { left:8%; }
  .analysis-stage>.element-result:nth-of-type(6) { right:8%; left:auto!important; }
  .element-result b { font-size:13px; }
  .element-result i { font-size:10px; }
  .first-loader-status { bottom:clamp(26px,6vh,52px); width:calc(100% - 32px); }
  .first-loader-status strong { font-size:15px; }
}
</style>

<style>
html.is-preloading { overflow:hidden; }
</style>
