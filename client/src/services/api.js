import axios from 'axios'

// Rutas relativas — en dev el proxy de Vite redirige /api → localhost:3000
//                 — en prod Vercel redirige /api → backend serverless
const api = axios.create({
  baseURL: '',
  withCredentials: true,
})

export default api
