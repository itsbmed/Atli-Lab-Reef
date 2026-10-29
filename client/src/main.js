import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import { ensureDemoUsers } from '@/services/localStore'
import { ensureDemoAquariums } from '@/services/aquariumStore'
import { useAuthStore } from '@/stores/auth'
import { useAquariumsStore } from '@/stores/aquariums'

// Demo-Konten und Aquarien abgleichen. Analysebeispiele werden erst nach
// der Konto-Prüfung im Analysen-Store synchronisiert.
ensureDemoUsers()
ensureDemoAquariums()

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Gespeicherte Backend-Session prüfen und die Aquarien vorladen, bevor der
// Router die erste Route auflöst – Berichte lesen die Becken synchron.
useAuthStore().restore()
  .then(() => useAquariumsStore().load())
  .finally(() => app.mount('#app'))
