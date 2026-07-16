import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import { ensureDemoUsers } from '@/services/localStore'
import { ensureDemoAquariums } from '@/services/aquariumStore'

// Demo-Konten und Aquarien abgleichen. Analysebeispiele werden erst nach
// der Konto-Prüfung im Analysen-Store synchronisiert.
ensureDemoUsers()
ensureDemoAquariums()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
