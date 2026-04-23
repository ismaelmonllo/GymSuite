import axios from 'axios'

// En dev: vacío → el proxy de Vite redirige /api → localhost:3000
// En prod: VITE_API_URL apunta al dominio del backend en Vercel
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
})

export default api
