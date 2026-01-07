import { createApp, defineComponent, h, ref } from 'vue'
import App from './App.vue'
import ComposableDemo from './ComposableDemo.vue'
import './style.css'

// Simple hash-based routing
const route = ref(window.location.hash || '#/')

window.addEventListener('hashchange', () => {
  route.value = window.location.hash || '#/'
})

const Router = defineComponent({
  setup() {
    return () => {
      if (route.value === '#/demo') {
        return h(ComposableDemo)
      }
      return h(App)
    }
  },
})

createApp(Router).mount('#app')
