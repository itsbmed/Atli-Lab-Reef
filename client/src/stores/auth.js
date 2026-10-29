import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as localStore from '@/services/localStore'
import { authApi, setAuthToken, useBackendAuth } from '@/services/api'

// Auth-Store (Frontend). Mit VITE_AUTH_BACKEND=true läuft der Login über das
// Laravel-Backend (Sanctum-Token), sonst über den lokalen Test-Speicher.
export const useAuthStore = defineStore('auth', () => {
  // Beim Start die gespeicherte Session laden → angemeldet bleiben nach Reload.
  const session = loadStoredSession()
  const user = ref(session?.user ?? null)
  const token = ref(session?.token ?? null)
  setAuthToken(useBackendAuth ? token.value : null)

  const isLoggedIn = computed(() => !!token.value)

  function setSession(u, t = u ? `local-${u.id || 'dev'}` : null, expiresAt = null) {
    user.value = u
    token.value = u ? t : null
    setAuthToken(useBackendAuth ? token.value : null)
    if (token.value) localStore.saveSession({ user: user.value, token: token.value, expiresAt })
    else localStore.clearSession()
  }

  function setBackendSession(res) {
    setSession(res.user, res.token, res.expiresAt)
    return res.user
  }

  // Neues Profil übernehmen, Token und Ablaufzeitpunkt bleiben gleich.
  function setBackendUser(u) {
    setSession(u, token.value, localStore.loadSession()?.expiresAt ?? null)
    return u
  }

  // Registrierung: Konto anlegen und direkt einloggen.
  async function register(data) {
    if (useBackendAuth) return setBackendSession(await authApi.register(data))
    const u = localStore.registerUser(data)
    setSession(u)
    return u
  }

  // Login: gegen das Backend bzw. den lokalen Speicher prüfen.
  async function login(credentials) {
    if (useBackendAuth) return setBackendSession(await authApi.login(credentials))
    const u = localStore.loginUser(credentials)
    setSession(u)
    return u
  }

  // Gespeicherten Token beim App-Start gegen das Backend prüfen und das Profil auffrischen.
  async function restore() {
    if (!useBackendAuth || !token.value) return
    try {
      setBackendUser((await authApi.me()).user)
    } catch (e) {
      if (e.status === 401) setSession(null)
    }
  }

  function logout() {
    // Token serverseitig widerrufen; lokal wird die Session sofort beendet.
    if (useBackendAuth && token.value) authApi.logout().catch(() => {})
    setSession(null)
  }

  async function updateProfile(data) {
    if (useBackendAuth) return setBackendUser((await authApi.updateProfile(data)).user)
    const updated = localStore.updateUserProfile(user.value.id, data)
    setSession(updated)
    return updated
  }

  async function changePassword(data) {
    if (useBackendAuth) return setBackendUser((await authApi.updatePassword(data)).user)
    const updated = localStore.updateUserPassword(user.value.id, data)
    setSession(updated)
    return updated
  }

  return { user, token, isLoggedIn, setSession, register, login, restore, logout, updateProfile, changePassword }
})

// Nur Sessions des aktiven Modus übernehmen (lokale Tokens beginnen mit „local-")
// und abgelaufene Backend-Tokens verwerfen.
function loadStoredSession() {
  const session = localStore.loadSession()
  if (!session?.token) return null
  const isLocal = session.token.startsWith('local-')
  const expired = session.expiresAt && new Date(session.expiresAt) <= new Date()
  if (isLocal === useBackendAuth || expired) {
    localStore.clearSession()
    return null
  }
  return session
}
