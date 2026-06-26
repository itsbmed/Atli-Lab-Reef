import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as localStore from '@/services/localStore'

// Auth-Store (Frontend). Nutzt vorerst den lokalen Test-Speicher.
// Backend-Anbindung folgt später über services/api.js.
export const useAuthStore = defineStore('auth', () => {
  // Beim Start die gespeicherte Session laden → angemeldet bleiben nach Reload.
  const session = localStore.loadSession()
  const user = ref(session?.user ?? null)
  const token = ref(session?.token ?? null)

  const isLoggedIn = computed(() => !!token.value)

  function setSession(u) {
    user.value = u
    token.value = u ? `local-${u.id || 'dev'}` : null
    if (token.value) localStore.saveSession({ user: user.value, token: token.value })
    else localStore.clearSession()
  }

  // Registrierung: Nutzer im lokalen Speicher anlegen und einloggen.
  async function register(data) {
    const u = localStore.registerUser(data)
    setSession(u)
    return u
  }

  // Login: gegen den lokalen Speicher prüfen.
  async function login(credentials) {
    const u = localStore.loginUser(credentials)
    setSession(u)
    return u
  }

  function logout() {
    user.value = null
    token.value = null
    localStore.clearSession()
  }

  return { user, token, isLoggedIn, setSession, register, login, logout }
})
