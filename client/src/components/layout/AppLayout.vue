<template>
  <div class="app-shell">
    <aside class="sidebar">
      <RouterLink to="/" class="sidebar-logo" title="Zur Startseite">
        <img src="/ati-logo.png" alt="ATI" class="ati-logo-img" />
      </RouterLink>

      <div class="sidebar-user">
        <div class="user-avatar">{{ initials }}</div>
        <div class="user-info">
          <span class="user-name">{{ displayName }}</span>
          <span class="user-status"><span class="status-dot"></span> Online</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <component
          v-for="item in mainNav"
          :key="item.label"
          :is="item.to ? 'RouterLink' : 'a'"
          :to="item.to || undefined"
          :href="item.to ? undefined : '#'"
          class="nav-item"
          :class="{ 'nav-item--active': isActive(item) }"
        >
          <span class="nav-icon" v-html="item.icon"></span>
          <span>{{ item.label }}</span>
        </component>

        <span class="nav-label">Verwaltung</span>
        <component
          v-for="item in adminNav"
          :key="item.label"
          :is="item.to ? 'RouterLink' : 'a'"
          :to="item.to || undefined"
          :href="item.to ? undefined : '#'"
          class="nav-item"
          :class="{ 'nav-item--active': isActive(item) }"
        >
          <span class="nav-icon" v-html="item.icon"></span>
          <span>{{ item.label }}</span>
        </component>
      </nav>

      <div class="sidebar-support">
        <span class="support-icon" v-html="iconLifebuoy"></span>
        <strong>Fragen zur Analyse?</strong>
        <p>Unser Laborteam hilft Ihnen bei Werten und Empfehlungen weiter.</p>
        <a href="#" class="support-btn">Support kontaktieren</a>
      </div>

      <div class="sidebar-version">
        <span class="version-dot"></span>
        <span>Version 0.1 · Beta</span>
      </div>
    </aside>

    <div class="main-wrapper">
      <header class="topbar">
        <div class="topbar-page">
          <h1 class="topbar-title">{{ pageTitle }}</h1>
          <p class="topbar-sub">{{ pageSubtitle }}</p>
        </div>

        <div class="topbar-search" @focusin="searchOpen = true" @focusout="closeSearchSoon">
          <svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" width="16" height="16"><circle cx="9" cy="9" r="6"/><path d="M15 15l-3-3"/></svg>
          <input type="search" placeholder="Suche nach Aquarium, Analyse, Barcode…" v-model="searchQuery" />
          <button v-if="searchQuery" class="search-clear" type="button" @click="searchQuery = ''">×</button>
          <div v-if="searchOpen" class="search-panel">
            <div class="search-help">
              <span>Direktsuche</span>
              <strong>Aquarien, Barcodes und Analyseberichte finden</strong>
            </div>
          </div>
        </div>

        <div class="topbar-actions">
          <LanguageSwitch />
          <button class="icon-btn" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span class="notif-badge">3</span>
          </button>

          <div class="user-menu">
            <div class="user-avatar-sm">{{ initials }}</div>
            <span>{{ displayName }}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M5 7l5 5 5-5"/></svg>
            <div class="user-dropdown">
              <a href="#" class="dropdown-item">Profil</a>
              <a href="#" class="dropdown-item">Einstellungen</a>
              <hr style="margin:4px 0;border:none;border-top:1px solid var(--border)" />
              <button class="dropdown-item danger" type="button" @click="logout">Abmelden</button>
            </div>
          </div>
        </div>
      </header>

      <main class="main-content">
        <RouterView />
      </main>

      <footer class="main-footer">
        <span>© 2026 ATI Aquaristik. Alle Rechte vorbehalten.</span>
        <div class="footer-links"><a href="#">Impressum</a><a href="#">Datenschutz</a><a href="#">AGB</a></div>
      </footer>
    </div>

    <!-- ── Mobile bottom tab bar ── -->
    <nav class="mobile-tabbar">
      <component
        v-for="item in mobilePrimary"
        :key="item.label"
        :is="item.to ? 'RouterLink' : 'button'"
        :to="item.to || undefined"
        type="button"
        class="tabbar-item"
        :class="{ 'tabbar-item--active': isActive(item) }"
      >
        <span class="tabbar-icon" v-html="item.icon"></span>
        <span class="tabbar-label">{{ item.label }}</span>
      </component>
      <button
        type="button"
        class="tabbar-item"
        :class="{ 'tabbar-item--active': mobileMenuOpen }"
        @click="mobileMenuOpen = true"
      >
        <span class="tabbar-icon" v-html="iconMore"></span>
        <span class="tabbar-label">Mehr</span>
      </button>
    </nav>

    <!-- ── Mobile „Mehr“-Sheet ── -->
    <transition name="sheet">
      <div v-if="mobileMenuOpen" class="mobile-sheet-overlay" @click.self="mobileMenuOpen = false">
        <div class="mobile-sheet">
          <div class="sheet-grip"></div>

          <div class="sheet-user">
            <div class="user-avatar">{{ initials }}</div>
            <div class="sheet-user-info">
              <strong>{{ displayName }}</strong>
              <span><span class="status-dot"></span> Online</span>
            </div>
            <LanguageSwitch class="sheet-lang" />
          </div>

          <div class="sheet-grid">
            <component
              v-for="item in sheetNav"
              :key="item.label"
              :is="item.to ? 'RouterLink' : 'button'"
              :to="item.to || undefined"
              type="button"
              class="sheet-item"
              :class="{ 'sheet-item--active': isActive(item) }"
              @click="mobileMenuOpen = false"
            >
              <span class="sheet-icon" v-html="item.icon"></span>
              <span>{{ item.label }}</span>
            </component>
          </div>

          <button class="sheet-logout" type="button" @click="logout">Abmelden</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LanguageSwitch from '@/components/LanguageSwitch.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const searchQuery = ref('')
const searchOpen = ref(false)
function closeSearchSoon() { setTimeout(() => { searchOpen.value = false }, 120) }

// Mobiles Menü: Bottom-Tabbar + „Mehr“-Sheet (wie im Hauptprojekt).
const mobileMenuOpen = ref(false)
watch(() => route.fullPath, () => { mobileMenuOpen.value = false })

const displayName = computed(() => auth.user?.name || 'Gast')
const initials = computed(() => displayName.value.slice(0, 2).toUpperCase())

const routeMeta = {
  '/dashboard': { title: 'Übersicht', sub: (u) => `Willkommen zurück, ${u}!` },
  '/aquariums': { title: 'Aquarien', sub: () => 'Ihre Becken im Überblick' },
}
const pageTitle = computed(() => routeMeta[route.path]?.title || 'ATI Reef Lab')
const pageSubtitle = computed(() => routeMeta[route.path]?.sub?.(displayName.value) || '')

function logout() {
  auth.logout()
  router.push('/login')
}

const iconHome = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17"><path d="M3 9.5L10 3l7 6.5V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M7 19v-6h6v6"/></svg>`
const iconTank = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M3 12c2 0 2-1.5 4-1.5S9 12 11 12s2-1.5 4-1.5"/><circle cx="7" cy="8" r="0.6" fill="currentColor"/></svg>`
const iconChart = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17"><path d="M3 17V3"/><path d="M3 17h14"/><path d="M6 13l3-4 3 2 4-6"/></svg>`
const iconBulb = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17"><path d="M7.5 14.5A5 5 0 1 1 12.5 14.5"/><path d="M8 17h4"/><path d="M8.5 14.5h3"/></svg>`
const iconClock = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>`
const iconTools = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17"><path d="M12 5a3 3 0 0 1 4 4l-7 7-3 1 1-3 5-5z"/><path d="M5 5l3 3"/></svg>`
const iconUser = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5"/></svg>`
const iconSettings = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"/></svg>`
const iconLifebuoy = `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.7" width="20" height="20"><circle cx="11" cy="11" r="8"/><circle cx="11" cy="11" r="3.2"/><path d="M5.3 5.3l3.4 3.4M13.3 13.3l3.4 3.4M16.7 5.3l-3.4 3.4M8.7 13.3l-3.4 3.4"/></svg>`

// Navigation – Aktiv-Zustand wird aus der aktuellen Route abgeleitet.
// Einträge ohne `to` sind Platzhalter bis die jeweiligen Seiten existieren.
const mainNav = [
  { label: 'Übersicht', icon: iconHome, to: '/dashboard' },
  { label: 'Aquarien', icon: iconTank, to: '/aquariums' },
  { label: 'Analysen', icon: iconChart, to: null },
  { label: 'Empfehlungen', icon: iconBulb, to: null },
  { label: 'Chronik', icon: iconClock, to: null },
]
const adminNav = [
  { label: 'Tools', icon: iconTools, to: null },
  { label: 'Profil', icon: iconUser, to: null },
  { label: 'Einstellungen', icon: iconSettings, to: null },
]
function isActive(item) {
  return !!item.to && route.path === item.to
}

const iconMore = `<svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17"><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6"/></svg>`

// Bottom-Tabbar: 4 Hauptziele, der Rest steckt im „Mehr“-Sheet.
const mobilePrimary = mainNav.slice(0, 4)
const sheetNav = [...mainNav, ...adminNav]
</script>

<style scoped>
.app-shell { display: flex; min-height: 100vh; --sidebar-width: 248px; --topbar-height: 68px; }

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-width);
  display: flex; flex-direction: column;
  position: fixed; top: 14px; left: 14px; bottom: 14px;
  z-index: 100; overflow-y: auto; overflow-x: hidden;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 30px 86px rgba(10,27,67,0.32);
  background:
    linear-gradient(180deg, rgba(10,27,67,0.96), rgba(10,27,67,0.99)),
    url('/reef-tank.webp') center bottom / cover no-repeat,
    #0a1b43;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 22px 22px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.ati-logo-img { width: 82px; height: auto; filter: brightness(0) invert(1); opacity: 0.92; }
.sidebar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--teal-500);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.user-info { display: flex; flex-direction: column; min-width: 0; }
.user-name { font-size: 14px; font-weight: 700; color: #fff; }
.user-status { font-size: 11px; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 5px; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; flex-shrink: 0; }
.sidebar-nav { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 5px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 12px;
  border-radius: 12px;
  color: rgba(255,255,255,0.68);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.16s, color 0.16s, transform 0.16s;
}
.nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.94); transform: translateX(2px); }
.nav-item--active { background: rgba(136,193,233,0.18); color: #fff; box-shadow: inset 3px 0 0 var(--teal-500), inset 0 0 0 1px rgba(136,193,233,0.22); }
.nav-item--active .nav-icon { background: var(--teal-500); color: #fff; opacity: 1; }
.nav-icon { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; opacity: 0.92; background: rgba(255,255,255,0.06); }
.nav-label { margin: 16px 12px 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.38); }
.sidebar-support { margin: 4px 14px 16px; padding: 16px; border-radius: 16px; border: 1px solid rgba(136,193,233,0.22); background: rgba(136,193,233,0.1); flex-shrink: 0; }
.support-icon { display: inline-flex; color: var(--teal-200); }
.sidebar-support strong { display: block; margin-top: 8px; font-size: 13px; font-weight: 700; color: #fff; }
.sidebar-support p { margin-top: 4px; font-size: 11.5px; line-height: 1.5; color: rgba(255,255,255,0.6); }
.support-btn { display: block; margin-top: 12px; padding: 9px; border-radius: 10px; text-align: center; font-size: 12px; font-weight: 700; color: var(--brand-900, #0a1b43); background: var(--teal-200); text-decoration: none; transition: background 0.15s; }
.support-btn:hover { background: #fff; }
.sidebar-version { display: flex; align-items: center; gap: 7px; padding: 12px 22px 16px; font-size: 11px; color: rgba(255,255,255,0.4); flex-shrink: 0; }
.version-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal-300); flex-shrink: 0; }

/* ── Main wrapper ── */
.main-wrapper { margin-left: calc(var(--sidebar-width) + 28px); flex: 1; display: flex; flex-direction: column; min-height: 100vh; }

/* ── Topbar ── */
.topbar {
  position: sticky; top: 0; z-index: 50;
  height: var(--topbar-height);
  background: rgba(251,252,253,0.86);
  backdrop-filter: blur(22px);
  border-bottom: 1px solid rgba(136,193,233,0.14);
  display: flex; align-items: center; gap: 20px;
  padding: 0 36px;
  box-shadow: 0 10px 34px rgba(10,27,67,0.045);
}
.topbar-page { flex-shrink: 0; }
.topbar-title { font-size: 19px; font-weight: 700; color: var(--text); line-height: 1.1; letter-spacing: -0.03em; }
.topbar-sub { font-size: 12px; color: var(--teal-600); font-weight: 600; }
.topbar-search { flex: 1; max-width: 420px; position: relative; margin: 0 auto; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); z-index: 2; }
.topbar-search input { width: 100%; padding: 11px 40px; border: 1px solid rgba(93,132,145,0.18); border-radius: 999px; font-size: 13px; color: var(--text); background: rgba(255,255,255,0.86); outline: none; transition: border-color 0.15s; }
.topbar-search input:focus { border-color: var(--teal-400); background: #fff; box-shadow: var(--shadow-focus); }
.search-clear { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border: 0; border-radius: 50%; background: rgba(100,130,165,0.12); color: var(--text-muted); cursor: pointer; z-index: 2; font-size: 18px; line-height: 1; }
.search-panel { position: absolute; left: 0; right: 0; top: calc(100% + 10px); padding: 8px; border-radius: 18px; background: rgba(255,255,255,0.96); border: 1px solid rgba(93,132,145,0.18); box-shadow: 0 22px 60px rgba(10,27,67,0.12); z-index: 300; backdrop-filter: blur(18px); }
.search-help { padding: 16px; }
.search-help span { display: block; color: var(--teal-700); font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.search-help strong { display: block; margin-top: 4px; color: var(--text); font-size: 13px; font-weight: 700; }
.topbar-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.icon-btn { position: relative; width: 40px; height: 40px; border-radius: 12px; border: 1px solid rgba(93,132,145,0.16); background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); transition: border-color 0.15s, color 0.15s; }
.icon-btn:hover { border-color: var(--teal-400); color: var(--teal-500); }
.notif-badge { position: absolute; top: -4px; right: -4px; background: #e85d4f; color: #fff; width: 18px; height: 18px; border-radius: 50%; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
.user-menu { position: relative; display: flex; align-items: center; gap: 8px; padding: 7px 10px 7px 7px; border-radius: 999px; cursor: pointer; border: 1px solid rgba(93,132,145,0.16); background: rgba(255,255,255,0.86); font-size: 13px; font-weight: 500; color: var(--text); transition: border-color 0.15s; }
.user-menu:hover { border-color: var(--teal-300); }
.user-menu:hover .user-dropdown { display: flex; }
.user-menu::after { content: ''; position: absolute; top: 100%; right: 0; width: 190px; height: 12px; }
.user-avatar-sm { width: 30px; height: 30px; border-radius: 10px; background: var(--teal-500); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; }
.user-dropdown { display: none; flex-direction: column; position: absolute; top: calc(100% + 6px); right: 0; background: #fff; border: 1px solid var(--border); border-radius: 12px; min-width: 178px; overflow: hidden; box-shadow: 0 22px 60px rgba(10,27,67,0.12); z-index: 200; padding: 4px; }
.dropdown-item { padding: 9px 14px; font-size: 13px; color: var(--text); cursor: pointer; border: none; background: none; display: block; width: 100%; text-align: left; border-radius: 6px; transition: background 0.1s; }
.dropdown-item:hover { background: var(--teal-50); color: var(--teal-700); }
.dropdown-item.danger { color: #e85d4f; }

/* ── Content + footer ── */
.main-content { flex: 1; display: flex; flex-direction: column; padding: 34px 36px; max-width: 1560px; width: 100%; }
.main-footer { padding: 16px 32px; border-top: 1px solid rgba(93,132,145,0.14); display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-muted); }
.footer-links { display: flex; gap: 20px; }
.footer-links a { color: var(--text-muted); }
.footer-links a:hover { color: var(--teal-500); }

/* ── Mobile bottom tab bar + sheet (hidden on desktop) ── */
.mobile-tabbar { display: none; }
.mobile-sheet-overlay { display: none; }

@media (max-width: 980px) {
  .app-shell { display: block; padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }
  .sidebar { display: none; }
  .main-wrapper { margin-left: 0; min-height: 100vh; }

  .topbar { height: auto; padding: 12px 16px; flex-wrap: wrap; gap: 10px 12px; }
  .topbar-page { min-width: 0; flex: 1; }
  .topbar-title { font-size: 18px; }
  .topbar-actions { margin-left: auto; gap: 8px; }
  .topbar-actions .lang-switch,
  .user-menu { display: none; }          /* wandern ins „Mehr“-Sheet */
  .topbar-search { order: 3; flex-basis: 100%; max-width: none; margin: 0; }
  .main-content { padding: 20px 16px; }
  .main-footer { padding: 14px 16px 20px; flex-direction: column; align-items: flex-start; gap: 8px; }

  /* Bottom tab bar */
  .mobile-tabbar {
    display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
    position: fixed; left: 10px; right: 10px;
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    z-index: 120; padding: 8px 6px;
    background: linear-gradient(180deg, rgba(10,27,67,0.97), rgba(10,27,67,0.99));
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 22px;
    box-shadow: 0 22px 54px rgba(10,27,67,0.36);
  }
  .tabbar-item {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; padding: 6px 4px;
    border: 0; background: none; cursor: pointer;
    color: rgba(255,255,255,0.6);
    font-size: 10px; font-weight: var(--fw-bold);
    text-decoration: none; -webkit-tap-highlight-color: transparent;
  }
  .tabbar-icon { display: grid; place-items: center; width: 38px; height: 30px; border-radius: 11px; transition: background 0.16s, box-shadow 0.16s; }
  .tabbar-item--active { color: #fff; }
  .tabbar-item--active .tabbar-icon { background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); box-shadow: 0 8px 18px rgba(0,114,206,0.42); }
  .tabbar-label { white-space: nowrap; }

  /* Slide-up sheet */
  .mobile-sheet-overlay {
    display: flex; align-items: flex-end;
    position: fixed; inset: 0; z-index: 200;
    background: rgba(10,27,67,0.45); backdrop-filter: blur(5px);
  }
  .mobile-sheet {
    width: 100%;
    background: var(--surface, #fff);
    border-radius: 26px 26px 0 0;
    padding: 8px 18px calc(22px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -24px 70px rgba(10,27,67,0.34);
    max-height: 86vh; overflow-y: auto;
  }
  .sheet-grip { width: 42px; height: 4px; border-radius: 999px; background: var(--border); margin: 8px auto 16px; }
  .sheet-user { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
  .sheet-user-info { display: flex; flex-direction: column; min-width: 0; }
  .sheet-user-info strong { font-size: 15px; font-weight: var(--fw-bold); color: var(--text); }
  .sheet-user-info span { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; }
  .sheet-lang { margin-left: auto; flex-shrink: 0; }

  .sheet-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .sheet-item {
    display: flex; flex-direction: column; align-items: center; gap: 9px;
    padding: 16px 8px; border-radius: 16px;
    background: var(--surface-soft, #f3f8fb);
    border: 1px solid var(--border);
    color: var(--text); text-decoration: none; cursor: pointer;
    font-size: 11px; font-weight: var(--fw-bold); text-align: center; line-height: 1.2;
  }
  .sheet-icon {
    display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px;
    background: linear-gradient(135deg, rgba(0,114,206,0.12), rgba(0,190,208,0.12));
    color: var(--brand-blue);
  }
  .sheet-item--active { border-color: var(--brand-blue); background: rgba(0,114,206,0.07); }
  .sheet-item--active .sheet-icon { background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); color: #fff; }
  .sheet-logout {
    margin-top: 16px; width: 100%; padding: 14px; border-radius: 14px;
    border: 1px solid var(--coral, #e85d4f);
    background: var(--coral-bg, #fdecea);
    color: var(--coral, #e85d4f);
    font-size: 14px; font-weight: var(--fw-bold); cursor: pointer;
  }

  .sheet-enter-active, .sheet-leave-active { transition: opacity 0.22s ease; }
  .sheet-enter-from, .sheet-leave-to { opacity: 0; }
  .sheet-enter-active .mobile-sheet, .sheet-leave-active .mobile-sheet { transition: transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .sheet-enter-from .mobile-sheet, .sheet-leave-to .mobile-sheet { transform: translateY(100%); }
}
</style>
