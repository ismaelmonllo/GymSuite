import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, CreditCard, Users, UserPlus, User, Ban, RotateCcw, Loader2 } from 'lucide-react'
import Header from '../components/layout/Header'
import StatCard from '../components/dashboard/StatCard'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import { color, s } from '../styles'
import ModalGestionCuotas from '../components/modals/ModalGestionCuotas'
import ModalConfirmacion from '../components/modals/ModalConfirmacion'
import ModalUsuario from '../components/modals/ModalUsuario'

// Formatear importe: sin decimales si es entero, con dos si no
const formatearImporte = (n) => `${n % 1 === 0 ? n : n.toFixed(2)} €`

// Obtener los 7 endpoints de stats en paralelo
const fetchStats = async () => {
  const [mes, anual, pagados, pendientes, clientes, trabajadores, altas] = await Promise.all([
    api.get('/api/stats/mes'),
    api.get('/api/stats/anual'),
    api.get('/api/stats/mes-pagados'),
    api.get('/api/stats/mes-pendientes'),
    api.get('/api/stats/total-clientes'),
    api.get('/api/stats/total-trabajadores'),
    api.get('/api/stats/altas-mensuales'),
  ])

  // Sumar recaudación total del año a partir del array mensual
  const totalAnual = anual.data.reduce((acc, m) => acc + m.total, 0)

  return {
    mesPagado:     formatearImporte(mes.data.total),
    anualTotal:    formatearImporte(totalAnual),
    mesPagados:    pagados.data.total,
    mesPendientes: pendientes.data.total,
    clientes:      clientes.data.total,
    trabajadores:  trabajadores.data.total,
    altasMes:      altas.data.ultimoMes,
    altasAnio:     altas.data.ultimoAnio,
  }
}

// Cargar clientes, entrenadores y admins en paralelo; fusionar empleados en una sola lista
const fetchUsuarios = async () => {
  const [resClientes, resEntrenadores, resAdmins] = await Promise.all([
    api.get('/api/clientes'),
    api.get('/api/entrenadores'),
    api.get('/api/administradores'),
  ])
  return {
    clientes:  resClientes.data.clientes ?? [],
    empleados: [
      ...(resEntrenadores.data.empleados ?? []),
      ...(resAdmins.data.empleados       ?? []),
    ],
  }
}

const formatearFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-ES') : '—'

// Clases de color para el badge de nivel
const nivelBadge = {
  principiante: 'bg-blue-950 text-blue-400',
  intermedio:   'bg-amber-950 text-amber-400',
  avanzado:     'bg-green-950 text-green-400',
}

function AdminDashboard() {
  const { usuario, logout } = useAuth()

  // Stats
  const [stats, setStats]       = useState(null)
  const [cargando, setCargando] = useState(true)

  // Datos de tabla
  const [clientes, setClientes]       = useState([])
  const [empleados, setEmpleados]     = useState([])
  const [cargandoTabla, setCargandoTabla] = useState(true)

  // Controles
  const [vista, setVista]               = useState('clientes')
  const [busqueda, setBusqueda]         = useState('')
  const [campoBusqueda, setCampoBusqueda] = useState('nombre')
  const [filtroActivo, setFiltroActivo] = useState('activos')
  const [ordenar, setOrdenar]           = useState('fecha_desc')

  // Modales
  const [modalCuotas, setModalCuotas]                   = useState(false)
  const [modalUsuario, setModalUsuario]                 = useState(null) // null = cerrado, objeto usuario o 'crear'
  const [confirmacionBajaAlta, setConfirmacionBajaAlta] = useState(null) // usuario pendiente de confirmar
  const [procesando, setProcesando]                     = useState(null)  // _id del usuario en proceso
  const [errorBajaAlta, setErrorBajaAlta]               = useState(null)  // mensaje de error visible

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(err => console.error('Error cargando stats:', err))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    fetchUsuarios()
      .then(({ clientes, empleados }) => {
        setClientes(clientes)
        setEmpleados(empleados)
      })
      .catch(err => console.error('Error cargando usuarios:', err))
      .finally(() => setCargandoTabla(false))
  }, [])

  // Aplicar filtros y orden sobre la lista activa
  const listaFiltrada = useMemo(() => {
    const lista = vista === 'clientes' ? clientes : empleados
    if (!Array.isArray(lista)) return []

    return lista
      .filter(u => {
        if (filtroActivo === 'activos') return u.activo
        if (filtroActivo === 'baja')    return !u.activo
        return true
      })
      .filter(u => {
        if (!busqueda.trim()) return true
        const valor = String(u[campoBusqueda] ?? '').toLowerCase()
        return valor.includes(busqueda.toLowerCase())
      })
      .sort((a, b) => {
        if (ordenar === 'nombre_asc')  return a.nombre.localeCompare(b.nombre)
        if (ordenar === 'nombre_desc') return b.nombre.localeCompare(a.nombre)
        if (ordenar === 'fecha_asc')   return new Date(a.fecha_alta) - new Date(b.fecha_alta)
        if (ordenar === 'fecha_desc')  return new Date(b.fecha_alta) - new Date(a.fecha_alta)
        return 0
      })
  }, [vista, clientes, empleados, busqueda, campoBusqueda, filtroActivo, ordenar])

  const esClientes = vista === 'clientes'

  // Dar de baja o de alta según el estado actual del usuario
  const toggleActivo = async (u) => {
    const tipo = esClientes ? 'clientes' : (u.rol === 'admin' ? 'administradores' : 'entrenadores')
    setProcesando(u._id)
    try {
      if (u.activo) {
        await api.patch(`/api/${tipo}/${u._id}/baja`)
      } else {
        await api.put(`/api/${tipo}/${u._id}`, { activo: true })
      }
      // Actualizar el estado local sin recargar toda la lista
      const actualizar = lista => lista.map(item =>
        item._id === u._id ? { ...item, activo: !item.activo } : item
      )
      esClientes ? setClientes(actualizar) : setEmpleados(actualizar)
    } catch {
      setErrorBajaAlta(`No se pudo ${u.activo ? 'dar de baja' : 'dar de alta'} a ${u.nombre} ${u.apellidos}.`)
    } finally {
      setProcesando(null)
    }
  }

  return (
    <div className={`min-h-screen ${color.bgPagina} flex flex-col`}>
      <Header usuario={usuario} onLogout={logout} />

      <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto flex flex-col gap-8">

        {/* Cards de estadísticas + botón gestionar cuotas */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">

          <StatCard
            icono={TrendingUp}
            titulo="Facturación"
            cargando={cargando}
            principal={{ label: 'Este mes',   valor: stats?.mesPagado  }}
            secundario={{ label: 'Este año',  valor: stats?.anualTotal }}
          />

          <StatCard
            icono={CreditCard}
            titulo="Pagos del mes"
            cargando={cargando}
            principal={{ label: 'Confirmados', valor: stats?.mesPagados   }}
            secundario={{ label: 'Pendientes', valor: stats?.mesPendientes }}
          />

          <StatCard
            icono={Users}
            titulo="Usuarios"
            cargando={cargando}
            principal={{ label: 'Clientes',     valor: stats?.clientes     }}
            secundario={{ label: 'Trabajadores', valor: stats?.trabajadores }}
          />

          <StatCard
            icono={UserPlus}
            titulo="Altas"
            cargando={cargando}
            principal={{ label: 'Este mes',  valor: stats?.altasMes  }}
            secundario={{ label: 'Este año', valor: stats?.altasAnio }}
          />

          <button
            className={`${s.btnPrimary} px-4`}
            onClick={() => setModalCuotas(true)}
          >
            Gestionar cuotas
          </button>

        </div>

        {/* Controles: toggle + buscador + filtros + añadir */}
        <div className="flex gap-3 items-center">

          <div className={`flex rounded-lg overflow-hidden border ${color.borde} shrink-0`}>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${esClientes ? s.tabActivo : s.tabInactivo}`}
              onClick={() => { setVista('clientes'); setBusqueda(''); setFiltroActivo('activos') }}
            >
              Clientes
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${!esClientes ? s.tabActivo : s.tabInactivo}`}
              onClick={() => { setVista('empleados'); setBusqueda(''); setFiltroActivo('activos') }}
            >
              Empleados
            </button>
          </div>

          <input
            className={`${s.input} flex-1`}
            placeholder="Buscar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />

          <select
            className={`${s.input}`}
            value={campoBusqueda}
            onChange={e => setCampoBusqueda(e.target.value)}
          >
            <option value="nombre">Nombre</option>
            <option value="apellidos">Apellidos</option>
            <option value="correo">Correo</option>
            <option value="DNI">DNI</option>
          </select>

          <select
            className={`${s.input}`}
            value={filtroActivo}
            onChange={e => setFiltroActivo(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="baja">Baja</option>
          </select>

          <select
            className={`${s.input}`}
            value={ordenar}
            onChange={e => setOrdenar(e.target.value)}
          >
            <option value="nombre_asc">Nombre A-Z</option>
            <option value="nombre_desc">Nombre Z-A</option>
            <option value="fecha_asc">Alta ↑</option>
            <option value="fecha_desc">Alta ↓</option>
          </select>

          <button
            className={`${s.btnPrimary} px-4 shrink-0`}
            onClick={() => setModalUsuario({ usuario: null, rolEditable: !esClientes })}
          >
            + Añadir {esClientes ? 'cliente' : 'empleado'}
          </button>

        </div>

        {/* Tabla de usuarios */}
        <div className={`${s.card} rounded-xl overflow-hidden`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${color.bordeHeader} text-left`}>
                <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Nombre</th>
                <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Correo</th>
                <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Teléfono</th>
                <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Alta</th>
                <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Estado</th>
                {esClientes && (
                  <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Nivel</th>
                )}
                {!esClientes && (
                  <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Tipo</th>
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {cargandoTabla ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-8 text-center text-sm ${color.textoApagado}`}>
                    Cargando...
                  </td>
                </tr>
              ) : listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-8 text-center text-sm ${color.textoApagado}`}>
                    No se encontraron resultados.
                  </td>
                </tr>
              ) : (
                listaFiltrada.map(u => (
                  <tr
                    key={u._id}
                    className={`border-b ${color.bordeHeader} last:border-0 ${color.bgHover} transition-colors`}
                  >
                    <td className={`px-4 py-3 text-sm font-medium ${color.texto}`}>
                      {u.nombre} {u.apellidos}
                    </td>
                    <td className={`px-4 py-3 text-sm ${color.textoApagado}`}>{u.correo}</td>
                    <td className={`px-4 py-3 text-sm ${color.textoApagado}`}>{u.telefono ?? '—'}</td>
                    <td className={`px-4 py-3 text-sm ${color.textoApagado}`}>{formatearFecha(u.fecha_alta)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.activo ? 'bg-green-950 text-green-400' : 'bg-neutral-700 text-neutral-400'}`}>
                        {u.activo ? 'Activo' : 'Baja'}
                      </span>
                    </td>
                    {esClientes && (
                      <td className="px-4 py-3">
                        {u.nivel ? (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${nivelBadge[u.nivel] ?? ''}`}>
                            {u.nivel.charAt(0).toUpperCase() + u.nivel.slice(1)}
                          </span>
                        ) : '—'}
                      </td>
                    )}
                    {!esClientes && (
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.rol === 'admin' ? 'bg-neutral-700 text-neutral-400' : 'bg-orange-950 text-orange-400'}`}>
                          {u.rol === 'admin' ? 'Admin' : 'Entrenador'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-3 items-center justify-end">
                        <button
                          onClick={() => setModalUsuario({ usuario: u })}
                          className={`${color.textoApagado} hover:text-orange-400 transition-colors`}
                          title="Ver perfil"
                        >
                          <User size={18} />
                        </button>
                        <button
                          onClick={() => setConfirmacionBajaAlta(u)}
                          disabled={procesando === u._id}
                          className={`transition-colors ${procesando === u._id ? 'opacity-40' : `${color.textoApagado} ${u.activo ? 'hover:text-red-400' : 'hover:text-green-400'}`}`}
                          title={u.activo ? 'Dar de baja' : 'Dar de alta'}
                        >
                          {procesando === u._id
                            ? <Loader2 size={18} className="animate-spin" />
                            : u.activo ? <Ban size={18} /> : <RotateCcw size={18} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </main>

      {modalCuotas && (
        <ModalGestionCuotas onClose={() => setModalCuotas(false)} />
      )}

      {modalUsuario && (
        <ModalUsuario
          usuario={modalUsuario.usuario ?? null}
          rolEditable={modalUsuario.rolEditable ?? false}
          onClose={() => setModalUsuario(null)}
          onGuardar={(datosRespuesta) => {
            const esEdicion = !!modalUsuario.usuario
            setModalUsuario(null)

            if (esEdicion) {
              // Actualizar el usuario en la lista local sin recargar todo
              const usuarioActualizado = datosRespuesta.cliente ?? datosRespuesta.empleado
              if (usuarioActualizado) {
                const actualizar = lista => lista.map(item =>
                  item._id === usuarioActualizado._id ? usuarioActualizado : item
                )
                esClientes ? setClientes(actualizar) : setEmpleados(actualizar)
              }
            } else {
              // Alta nueva: recargar para obtener el documento completo con _id y fecha_alta
              fetchUsuarios()
                .then(({ clientes, empleados }) => {
                  setClientes(clientes)
                  setEmpleados(empleados)
                })
                .catch(err => console.error('Error recargando usuarios tras alta:', err))
            }
          }}
        />
      )}

      {errorBajaAlta && (
        <ModalConfirmacion
          mensaje={errorBajaAlta}
          textoConfirmar="Entendido"
          soloConfirmar
          onConfirmar={() => setErrorBajaAlta(null)}
          onCancelar={() => setErrorBajaAlta(null)}
        />
      )}

      {confirmacionBajaAlta && (
        <ModalConfirmacion
          mensaje={`¿${confirmacionBajaAlta.activo ? 'Dar de baja' : 'Dar de alta'} a ${confirmacionBajaAlta.nombre} ${confirmacionBajaAlta.apellidos}?`}
          textoConfirmar={confirmacionBajaAlta.activo ? 'Dar de baja' : 'Dar de alta'}
          peligro={confirmacionBajaAlta.activo}
          onConfirmar={() => { toggleActivo(confirmacionBajaAlta); setConfirmacionBajaAlta(null) }}
          onCancelar={() => setConfirmacionBajaAlta(null)}
        />
      )}
    </div>
  )
}

export default AdminDashboard
