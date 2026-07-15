import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import { ensureDemoUsers } from '@/services/localStore'
import { ensureDemoAquariums } from '@/services/aquariumStore'
import { removeDemoAnalyses } from '@/services/analysisStore'

// Demo-Konten und -Aquarien anlegen; alte Beispielberichte aus lokalen Sitzungen entfernen.
ensureDemoUsers()
ensureDemoAquariums()
removeDemoAnalyses()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
