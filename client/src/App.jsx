import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RutaProtegida from './components/auth/RutaProtegida'
import RutaRol from './components/auth/RutaRol'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import EntrenadorDashboard from './pages/EntrenadorDashboard'
import ClienteDashboard from './pages/ClienteDashboard'

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

          {/* Redirigir raíz a login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
