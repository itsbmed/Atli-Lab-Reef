import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/', name: 'Home', component: () => import('@/views/HomeView.vue'), meta: { public: true } },
  { path: '/login', name: 'Login', component: () => import('@/views/auth/LoginView.vue'), meta: { guest: true } },
  { path: '/register', name: 'Register', component: () => import('@/views/auth/RegisterView.vue'), meta: { guest: true } },
  // TEMP: public für die Vorschau; shell = rendert in AppLayout. Vor Produktiv auf { auth: true, shell: true }.
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/views/DashboardView.vue'), meta: { public: true, shell: true } },
  { path: '/aquariums', name: 'Aquariums', component: () => import('@/views/aquariums/AquariumsView.vue'), meta: { public: true, shell: true } },
  { path: '/aquariums/new', name: 'AquariumNew', component: () => import('@/views/aquariums/AquariumNewView.vue'), meta: { public: true, shell: true } },
  { path: '/aquariums/:id', name: 'AquariumDetail', component: () => import('@/views/aquariums/AquariumDetailView.vue'), meta: { public: true, shell: true } },
  { path: '/analyses', name: 'Analyses', component: () => import('@/views/analyses/AnalysesView.vue'), meta: { public: true, shell: true } },
  { path: '/analyses/activate', name: 'ActivateAnalysis', component: () => import('@/views/analyses/ActivateView.vue'), meta: { public: true, shell: true } },
  { path: '/account', name: 'Account', component: () => import('@/views/AccountView.vue'), meta: { public: true, shell: true } },

  // 404 → Startseite
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.auth && !auth.isLoggedIn) return { name: 'Login' }
  // TEMP (Vorschau): Gäste-Weiterleitung deaktiviert, damit Login/Registrierung
  // während der Entwicklung jederzeit aufrufbar sind – auch bei aktiver Session.
  // Vor Produktiv wieder aktivieren (Ziel dann bewusst /dashboard statt Landing):
  // if (to.meta.guest && auth.isLoggedIn) return { name: 'Dashboard' }
})

export default router
