import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, CreditCard, Users, UserPlus, User, Ban, RotateCcw, Loader2, CheckCircle, CalendarDays, Receipt } from 'lucide-react'
import Header from '../components/layout/Header'
import StatCard from '../components/dashboard/StatCard'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import { color, s } from '../styles'
import ModalGestionCuotas from '../components/modals/ModalGestionCuotas'
import ModalConfirmacion from '../components/modals/ModalConfirmacion'
import ModalUsuario from '../components/modals/ModalUsuario'
import ModalCambioCuota from '../components/modals/ModalCambioCuota'
import ModalPagos from '../components/modals/ModalPagos'

// Formatear importe: sin decimales si es entero, con dos si no
const formatearImporte = (n) => `${n % 1 === 0 ? n : n.toFixed(2)} €`

// Lanzar los 7 endpoints de stats en paralelo y devolver un objeto normalizado
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

// Clases de color para el badge de nivel del cliente
const nivelBadge = {
  principiante: 'bg-blue-950 text-blue-400',
  intermedio:   'bg-amber-950 text-amber-400',
  avanzado:     'bg-green-950 text-green-400',
}

function AdminDashboard() {
  const { usuario, logout } = useAuth()

  // Datos de las cards de estadísticas
  const [stats, setStats]       = useState(null)
  const [cargando, setCargando] = useState(true)

  // Listas de usuarios para la tabla
  const [clientes, setClientes]           = useState([])
  const [empleados, setEmpleados]         = useState([])
  const [cargandoTabla, setCargandoTabla] = useState(true)
  // Mapa clienteId → { pendiente, mes, grupo_pago, tipo_cuota } con el último pago de cada cliente
  const [ultimoPago, setUltimoPago]       = useState({})

  // Controles de la tabla: vista, búsqueda, filtros y orden
  const [vista, setVista]                   = useState('clientes')
  const [busqueda, setBusqueda]             = useState('')
  const [campoBusqueda, setCampoBusqueda]   = useState('nombre')
  const [filtroActivo, setFiltroActivo]     = useState('activos')
  const [filtroPago, setFiltroPago]         = useState('todos')
  const [ordenar, setOrdenar]               = useState('fecha_desc')

  // Estado de modales y operaciones en curso
  const [modalCuotas, setModalCuotas]                     = useState(false)
  const [modalUsuario, setModalUsuario]                   = useState(null)    // null = cerrado | { usuario, rolEditable }
  const [confirmacionBajaAlta, setConfirmacionBajaAlta]   = useState(null)    // usuario pendiente de baja/alta
  const [procesando, setProcesando]                       = useState(null)    // _id del usuario en proceso de baja/alta
  const [errorBajaAlta, setErrorBajaAlta]                 = useState(null)    // mensaje de error de baja/alta
  const [confirmandoPago, setConfirmandoPago]             = useState(null)    // _id del cliente cuyo pago se está confirmando
  const [confirmacionPago, setConfirmacionPago]           = useState(null)    // { usuario, pago } pendiente de confirmar
  const [cuotas, setCuotas]                               = useState([])      // lista de tipos de cuota (para mostrar importe en modal)
  const [modalPagos, setModalPagos]                       = useState(null)    // cliente cuyos pagos se van a ver
  const [modalCambioCuota, setModalCambioCuota]           = useState(null)    // cliente cuya cuota se va a cambiar
  const [confirmarGenerarPagos, setConfirmarGenerarPagos] = useState(false)   // modal de confirmación previa a generar
  const [resultadoGenerarPagos, setResultadoGenerarPagos] = useState(null)    // { exito, mensaje } tras generar
  const [generandoPagos, setGenerandoPagos]               = useState(false)

  // Cargar stats al montar
  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(err => console.error('Error cargando stats:', err))
      .finally(() => setCargando(false))
  }, [])

  // Cargar lista de tipos de cuota (usada en el modal de confirmación de pago)
  useEffect(() => {
    api.get('/api/cuotas').then(r => setCuotas(r.data.cuotas ?? [])).catch(() => {})
  }, [])

  // Cargar usuarios y último pago de cada cliente en paralelo
  useEffect(() => {
    Promise.all([
      fetchUsuarios(),
      api.get('/api/stats/ultimo-pago').then(r => r.data).catch(() => ({})),
    ])
      .then(([{ clientes, empleados }, mapaUltimoPago]) => {
        setClientes(clientes)
        setEmpleados(empleados)
        setUltimoPago(mapaUltimoPago)
      })
      .catch(err => console.error('Error cargando usuarios:', err))
      .finally(() => setCargandoTabla(false))
  }, [])

  // Calcular la lista visible aplicando filtros y orden; se recalcula solo cuando cambia alguna dependencia
  const listaFiltrada = useMemo(() => {
    const lista = vista === 'clientes' ? clientes : empleados
    if (!Array.isArray(lista)) return []

    return lista
      // Filtrar por estado activo/baja
      .filter(u => {
        if (filtroActivo === 'activos') return u.activo
        if (filtroActivo === 'baja')    return !u.activo
        return true
      })
      // Filtrar por estado del último pago (solo en vista clientes)
      .filter(u => {
        if (vista !== 'clientes' || filtroPago === 'todos') return true
        const pago = ultimoPago[u._id]
        if (!pago) return false
        if (filtroPago === 'confirmado') return !pago.pendiente
        if (filtroPago === 'pendiente')  return pago.pendiente
        return true
      })
      // Filtrar por texto de búsqueda sobre el campo seleccionado
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
  }, [vista, clientes, empleados, busqueda, campoBusqueda, filtroActivo, filtroPago, ordenar, ultimoPago])

  const esClientes = vista === 'clientes'

  // Dar de baja o reactivar un usuario; actualiza el estado local sin recargar la lista completa
  const toggleActivo = async (u) => {
    const tipo = esClientes ? 'clientes' : (u.rol === 'admin' ? 'administradores' : 'entrenadores')
    setProcesando(u._id)
    try {
      if (u.activo) {
        await api.patch(`/api/${tipo}/${u._id}/baja`)
      } else {
        await api.put(`/api/${tipo}/${u._id}`, { activo: true })
      }
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

  // Llamar al endpoint de generación y mostrar el resultado en un modal
  const ejecutarGenerarPagos = async () => {
    setConfirmarGenerarPagos(false)
    setGenerandoPagos(true)
    try {
      const res = await api.post('/api/pagos/generar')
      const { generados, clientes_procesados } = res.data
      setResultadoGenerarPagos(
        generados === 0
          ? { exito: true, mensaje: 'Todos los clientes ya tienen pagos generados para este mes.' }
          : { exito: true, mensaje: `Pagos generados correctamente.\n${clientes_procesados} clientes procesados, ${generados} pagos creados.` }
      )
    } catch (err) {
      setResultadoGenerarPagos({ exito: false, mensaje: err.response?.data?.mensaje ?? 'Error al generar los pagos.' })
    } finally {
      setGenerandoPagos(false)
    }
  }

  // Abrir el modal de confirmación con los datos del pago antes de confirmar
  const confirmarPago = (u) => {
    const pago = ultimoPago[u._id]
    if (!pago?.pendiente) return
    setConfirmacionPago({ usuario: u, pago })
  }

  // Marcar el grupo de pagos como cobrado y actualizar el badge en la tabla sin recargar
  const ejecutarConfirmacionPago = async () => {
    const { usuario, pago } = confirmacionPago
    setConfirmacionPago(null)
    setConfirmandoPago(usuario._id)
    try {
      await api.post('/api/pagos/registrar', { grupo_pago: pago.grupo_pago })
      setUltimoPago(prev => ({
        ...prev,
        [usuario._id]: { ...prev[usuario._id], pendiente: false }
      }))
    } catch {
      setErrorBajaAlta(`No se pudo confirmar el pago de ${usuario.nombre} ${usuario.apellidos}.`)
    } finally {
      setConfirmandoPago(null)
    }
  }

  return (
    <div className={`min-h-screen ${color.bgPagina} flex flex-col`}>
      <Header usuario={usuario} onLogout={logout}>
        <button
          onClick={() => setConfirmarGenerarPagos(true)}
          disabled={generandoPagos}
          className={`text-sm px-4 py-2 rounded-lg border ${color.borde} ${color.textoApagado} hover:text-orange-400 transition-colors disabled:opacity-40`}
        >
          {generandoPagos ? 'Generando...' : 'Generar pagos'}
        </button>
      </Header>

      <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto flex flex-col gap-8">

        {/* Cards de estadísticas + botón gestionar cuotas */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">

          <StatCard
            icono={TrendingUp}
            titulo="Facturación"
            cargando={cargando}
            valorCompacto
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

          <div className="flex flex-col gap-2">
            <button
              className={`${s.btnPrimary} flex-1 px-4`}
              onClick={() => setModalCuotas(true)}
            >
              Gestionar cuotas
            </button>
            <button
              className={`${s.btnPrimary} flex-1 px-4`}
              onClick={() => setModalUsuario({ usuario: null, rolEditable: !esClientes })}
            >
              + Añadir {esClientes ? 'cliente' : 'empleado'}
            </button>
          </div>

        </div>

        {/* Controles: toggle + buscador + filtros + añadir */}
        <div className="flex gap-3 items-center">

          <button
            className={`${s.btnPrimary} px-4 shrink-0`}
            onClick={() => { setVista(esClientes ? 'empleados' : 'clientes'); setBusqueda(''); setFiltroActivo('activos'); setFiltroPago('todos') }}
          >
            Ver {esClientes ? 'empleados' : 'clientes'}
          </button>

          <input
            className={`${s.input} flex-1`}
            placeholder="Buscar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />

          <select
            className={`${s.input} shrink-0`}
            value={campoBusqueda}
            onChange={e => setCampoBusqueda(e.target.value)}
          >
            <option value="nombre">Nombre</option>
            <option value="apellidos">Apellidos</option>
            <option value="correo">Correo</option>
            <option value="DNI">DNI</option>
          </select>

          <select
            className={`${s.input} shrink-0`}
            value={filtroActivo}
            onChange={e => setFiltroActivo(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="baja">Baja</option>
          </select>

          {esClientes && (
            <select
              className={`${s.input} shrink-0`}
              value={filtroPago}
              onChange={e => setFiltroPago(e.target.value)}
            >
              <option value="todos">Pago: todos</option>
              <option value="confirmado">Confirmado</option>
              <option value="pendiente">Pendiente</option>
            </select>
          )}

          <select
            className={`${s.input} shrink-0`}
            value={ordenar}
            onChange={e => setOrdenar(e.target.value)}
          >
            <option value="nombre_asc">Nombre A-Z</option>
            <option value="nombre_desc">Nombre Z-A</option>
            <option value="fecha_asc">Alta ↑</option>
            <option value="fecha_desc">Alta ↓</option>
          </select>


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
                {esClientes && (
                  <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Último pago</th>
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
                  <td colSpan={esClientes ? 8 : 7} className={`px-4 py-8 text-center text-sm ${color.textoApagado}`}>
                    Cargando...
                  </td>
                </tr>
              ) : listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={esClientes ? 8 : 7} className={`px-4 py-8 text-center text-sm ${color.textoApagado}`}>
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
                    {esClientes && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {ultimoPago[u._id] ? (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${ultimoPago[u._id].pendiente ? 'bg-red-950 text-red-400' : 'bg-green-950 text-green-400'}`}>
                              {ultimoPago[u._id].pendiente ? 'Pendiente' : 'Confirmado'}
                            </span>
                          ) : '—'}
                          {ultimoPago[u._id]?.pendiente && (
                            <button
                              onClick={() => confirmarPago(u)}
                              disabled={confirmandoPago === u._id}
                              className={`transition-colors ${confirmandoPago === u._id ? 'opacity-40' : `${color.textoApagado} hover:text-green-400`}`}
                              title="Confirmar pago"
                            >
                              {confirmandoPago === u._id
                                ? <Loader2 size={16} className="animate-spin" />
                                : <CheckCircle size={16} />
                              }
                            </button>
                          )}
                        </div>
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
                        {esClientes && (
                          <button
                            onClick={() => setModalPagos(u)}
                            className={`${color.textoApagado} hover:text-orange-400 transition-colors`}
                            title="Ver pagos"
                          >
                            <Receipt size={18} />
                          </button>
                        )}
                        {esClientes && (
                          <button
                            onClick={() => setModalCambioCuota(u)}
                            className={`${color.textoApagado} hover:text-orange-400 transition-colors`}
                            title="Cambiar cuota"
                          >
                            <CalendarDays size={18} />
                          </button>
                        )}
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

      {confirmarGenerarPagos && (
        <ModalConfirmacion
          mensaje="¿Generar pagos del mes actual para todos los clientes que no los tengan?"
          textoConfirmar="Generar"
          onConfirmar={ejecutarGenerarPagos}
          onCancelar={() => setConfirmarGenerarPagos(false)}
        />
      )}

      {resultadoGenerarPagos && (
        <ModalConfirmacion
          mensaje={resultadoGenerarPagos.mensaje}
          textoConfirmar="Cerrar"
          soloConfirmar
          onConfirmar={() => setResultadoGenerarPagos(null)}
          onCancelar={() => setResultadoGenerarPagos(null)}
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

      {modalPagos && (
        <ModalPagos
          cliente={modalPagos}
          cuotas={cuotas}
          onClose={() => setModalPagos(null)}
          onPagoConfirmado={() => {
            // Refrescar el mapa de último pago para que el badge de la tabla se actualice
            api.get('/api/stats/ultimo-pago').then(r => setUltimoPago(r.data)).catch(() => {})
          }}
          onCuotaCambiada={(clienteActualizado) => {
            // Actualizar el cliente en la lista local tras cambiar la cuota desde dentro del modal
            setClientes(prev => prev.map(c =>
              c._id === clienteActualizado._id ? clienteActualizado : c
            ))
            setModalPagos(clienteActualizado)
          }}
        />
      )}

      {modalCambioCuota && (
        <ModalCambioCuota
          cliente={modalCambioCuota}
          cuotas={cuotas}
          onClose={() => setModalCambioCuota(null)}
          onGuardar={(clienteActualizado) => {
            // Actualizar el cliente en la lista local para reflejar la nueva cuota sin recargar
            setClientes(prev => prev.map(c =>
              c._id === clienteActualizado._id ? clienteActualizado : c
            ))
          }}
        />
      )}

      {confirmacionPago && (() => {
        const { usuario, pago } = confirmacionPago
        const cuota = cuotas.find(c => c.nombre === pago.tipo_cuota)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" />
            <div className={`relative z-10 w-full max-w-sm mx-4 rounded-xl ${s.card} p-6 flex flex-col gap-4`}>
              <h3 className={`font-semibold ${color.texto}`}>Confirmar pago</h3>
              <div className={`flex flex-col gap-1 text-sm ${color.textoApagado}`}>
                <p><span className={color.texto}>{usuario.nombre} {usuario.apellidos}</span></p>
                <p>Cuota: <span className={color.texto}>{pago.tipo_cuota}{cuota ? ` — ${formatearImporte(cuota.importe)}` : ''}</span></p>
                <p>Mes: <span className={color.texto}>{pago.mes}</span></p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmacionPago(null)}
                  className={`flex-1 py-2 rounded-lg border ${color.borde} ${color.texto} ${color.bgHover} transition-colors`}
                >
                  Cancelar
                </button>
                <button onClick={ejecutarConfirmacionPago} className={`flex-1 ${s.btnPrimary}`}>
                  Confirmar pago
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default AdminDashboard
