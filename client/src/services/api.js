import axios from 'axios'

// En dev: vacío → el proxy de Vite redirige /api → localhost:5000
// En prod: VITE_API_URL apunta al dominio del backend en Vercel
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Enviar cookies (refresh_token) en peticiones cross-origin
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, // Defensa CSRF: los formularios HTML no pueden añadir este header
})

/**
 * Interceptor de request: adjuntar el token JWT de la cookie en cada petición autenticada.
 * @param {import('axios').InternalAxiosRequestConfig} config
 * @returns {import('axios').InternalAxiosRequestConfig}
 */
api.interceptors.request.use((config) => {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)
  if (match) config.headers.Authorization = `Bearer ${match[1]}`
  return config
})

// Función inyectada desde AuthContext para limpiar el estado de sesión si el refresh falla
let onSesionExpirada = null

/**
 * Registrar un callback que se ejecutará cuando la sesión expire (refresh fallido).
 * @param {() => void} fn Callback que limpia el estado de sesión en AuthContext
 */
export const setSesionExpiradaCallback = (fn) => { onSesionExpirada = fn }

/**
 * Interceptor de response: renovar el token de acceso automáticamente cuando el servidor responde 401.
 * Reintenta la petición original una sola vez tras refrescar el token.
 * @param {import('axios').AxiosResponse} response
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Evitar bucle infinito: solo reintentar una vez y no en la propia llamada de refresh
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        // Llamar a refresh con axios nativo para no pasar por este interceptor
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, {
          withCredentials: true,
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })

        // Guardar el nuevo token en cookie y reintentar la petición original
        document.cookie = `token=${data.token}; path=/; max-age=${2 * 60 * 60}; SameSite=Strict`
        original.headers.Authorization = `Bearer ${data.token}`
        return api(original)
      } catch {
        // Refresh fallido: limpiar token local y notificar al contexto
        document.cookie = 'token=; path=/; max-age=0'
        if (onSesionExpirada) onSesionExpirada()
      }
    }

    return Promise.reject(error)
  }
)

export default api
