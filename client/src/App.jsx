import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import RutaProtegida from './components/auth/RutaProtegida'
import RutaRol from './components/auth/RutaRol'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import EntrenadorDashboard from './pages/EntrenadorDashboard'
import ClienteDashboard from './pages/ClienteDashboard'

const RUTAS_ROL = { admin: '/admin', entrenador: '/entrenador', cliente: '/cliente' }

// Redirigir al dashboard del rol si hay sesión, si no al login
function RedireccionInicio() {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  return <Navigate to={RUTAS_ROL[usuario.rol] ?? '/login'} replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RutaProtegida />}>
            <Route element={<RutaRol rol="admin" />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            <Route element={<RutaRol rol="entrenador" />}>
              <Route path="/entrenador" element={<EntrenadorDashboard />} />
            </Route>
            <Route element={<RutaRol rol="cliente" />}>
              <Route path="/cliente" element={<ClienteDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<RedireccionInicio />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
