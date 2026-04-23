import axios from 'axios'

// En dev: vacío → el proxy de Vite redirige /api → localhost:5000
// En prod: VITE_API_URL apunta al dominio del backend en Vercel
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

// Adjuntar el token JWT de la cookie en cada petición autenticada
api.interceptors.request.use((config) => {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)
  if (match) config.headers.Authorization = `Bearer ${match[1]}`
  return config
})

export default api
