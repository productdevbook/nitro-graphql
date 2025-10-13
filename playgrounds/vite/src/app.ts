export function setupApp(element: HTMLButtonElement) {
  const button = document.createElement('button')
  button.textContent = 'Click me to call /api/hello'
  element.appendChild(button)
  const fetchAPI = async () => {
    const res = await fetch('/api/hello')
    button.innerHTML = await res.text()
  }
  button.addEventListener('click', () => fetchAPI())
}
