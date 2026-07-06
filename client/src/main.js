import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import { ensureDemoUsers } from '@/services/localStore'
import { ensureDemoAquariums } from '@/services/aquariumStore'
import { ensureDemoAnalyses } from '@/services/analysisStore'

// Demo-Konten, -Aquarien und -Analysen anlegen (falls noch nicht vorhanden).
ensureDemoUsers()
ensureDemoAquariums()
ensureDemoAnalyses()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
