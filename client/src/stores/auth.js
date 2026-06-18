import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Auth-Store (Frontend). Backend-Anbindung folgt — vorerst lokaler Stub.
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)

  const isLoggedIn = computed(() => !!token.value)

  function setSession(payload) {
    user.value = payload?.user ?? null
    token.value = payload?.token ?? null
  }

  function logout() {
    user.value = null
    token.value = null
  }

  return { user, token, isLoggedIn, setSession, logout }
})
