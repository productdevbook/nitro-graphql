/// <reference types="vite/client" />
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/index.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../pages/about.vue'),
    },
    {
      path: '/contact',
      name: 'contact',
      component: () => import('../pages/contact.vue'),
    },
    {
      path: '/pinia-colada-demo',
      name: 'pinia-colada-demo',
      component: () => import('../pages/pinia-colada-demo.vue'),
    },
    // Catch-all 404 route - must be last
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../pages/404.vue'),
    },
  ],
})

export default router
