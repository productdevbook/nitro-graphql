import { ref } from 'vue'

const isVisible = ref(false)
const errorMessage = ref('')

export function useErrorOverlay() {
  const show = (message: string) => {
    errorMessage.value = message
    isVisible.value = true
  }

  const hide = () => {
    isVisible.value = false
  }

  const reload = () => {
    window.location.reload()
  }

  return {
    isVisible,
    errorMessage,
    show,
    hide,
    reload,
  }
}
