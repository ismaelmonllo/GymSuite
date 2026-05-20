import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, CreditCard, Users, UserPlus } from 'lucide-react'
import Header from '../components/layout/Header'
import StatCard from '../components/dashboard/StatCard'
import ListaUsuarios from '../components/dashboard/ListaUsuarios'
import FiltrosUsuarios from '../components/dashboard/FiltrosUsuarios'
import { useAuth } from '../hooks/useAuth'
import { useUsuarios } from '../hooks/useUsuarios'
import { useCuotas } from '../hooks/useCuotas'
import { usePagosGenerar } from '../hooks/usePagosGenerar'
import { useConfirmarPago } from '../hooks/useConfirmarPago'
import api from '../services/api'
import { color, s } from '../styles'
import { formatearImporte } from '../utils'
import BtnGenerarPagos from '../components/dashboard/BtnGenerarPagos'
import ModalGestionCuotas from '../components/modals/ModalGestionCuotas'
import ModalConfirmacion from '../components/modals/ModalConfirmacion'
import ModalUsuario from '../components/modals/ModalUsuario'
import ModalCambioCuota from '../components/modals/ModalCambioCuota'
import ModalPagos from '../components/modals/ModalPagos'
import ModalConfirmarPago from '../components/modals/ModalConfirmarPago'


// Lanzar los 7 endpoints de stats en paralelo; si uno falla, el resto sigue
const fetchStats = async () => {
  const resultados = await Promise.allSettled([
    api.get('/api/stats/mes'),
    api.get('/api/stats/anual'),
    api.get('/api/stats/mes-pagados'),
    api.get('/api/stats/mes-pendientes'),
    api.get('/api/stats/total-clientes'),
    api.get('/api/stats/total-trabajadores'),
    api.get('/api/stats/altas-mensuales'),
  ])

  const ok = (i) => resultados[i].status === 'fulfilled' ? resultados[i].value.data : null

  const mesData    = ok(0)
  const anualData  = ok(1)
  const totalAnual = anualData ? anualData.reduce((acc, m) => acc + m.total, 0) : null

  return {
    mesPagado:     mesData    ? formatearImporte(mesData.total)    : null,
    anualTotal:    totalAnual !== null ? formatearImporte(totalAnual) : null,
    mesPagados:    ok(2)?.total    ?? null,
    mesPendientes: ok(3)?.total    ?? null,
    clientes:      ok(4)?.total    ?? null,
    trabajadores:  ok(5)?.total    ?? null,
    altasMes:      ok(6)?.ultimoMes  ?? null,
    altasAnio:     ok(6)?.ultimoAnio ?? null,
  }
}


function AdminDashboard() {
  const { usuario, logout } = useAuth()

  // Datos de las cards de estadísticas
  const [stats, setStats]       = useState(null)
  const [cargando, setCargando] = useState(true)

  // Mapa clienteId → { pendiente, mes, grupo_pago, tipo_cuota } con el último pago de cada cliente
  const [ultimoPago, setUltimoPago] = useState({})
  const [errorOperacion, setErrorOperacion] = useState(null)

  // Hooks de usuarios, cuotas y operaciones
  const { clientes, empleados, setClientes, setEmpleados, cargando: cargandoTabla, recargar } = useUsuarios('admin')
  const cuotas = useCuotas()

  const recargarUltimoPago = () =>
    api.get('/api/stats/ultimo-pago').then(res => setUltimoPago(res.data)).catch(() => {})

  const generarPagos = usePagosGenerar(recargarUltimoPago)
  const confirmarPago = useConfirmarPago(setUltimoPago, setErrorOperacion)

  // Controles de la tabla: vista, búsqueda, filtros y orden
  const [vista, setVista]                   = useState('clientes')
  const [busqueda, setBusqueda]             = useState('')
  const [campoBusqueda, setCampoBusqueda]   = useState('nombre')
  const [filtroActivo, setFiltroActivo]     = useState('activos')
  const [filtroPago, setFiltroPago]         = useState('todos')
  const [ordenar, setOrdenar]               = useState('fecha_desc')

  // Estado de modales
  const [modalCuotas, setModalCuotas]                   = useState(false)
  const [modalUsuario, setModalUsuario]                 = useState(null)    // null = cerrado | { usuario, rolEditable }
  const [confirmacionBajaAlta, setConfirmacionBajaAlta] = useState(null)    // usuario pendiente de baja/alta
  const [procesando, setProcesando]                     = useState(null)    // _id del usuario en proceso de baja/alta
  const [modalPagos, setModalPagos]                     = useState(null)    // cliente cuyos pagos se van a ver
  const [modalCambioCuota, setModalCambioCuota]         = useState(null)    // cliente cuya cuota se va a cambiar

  // Cargar stats al montar
  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(err => console.error('Error cargando stats:', err))
      .finally(() => setCargando(false))
  }, [])

  // Cargar último pago de cada cliente al montar
  useEffect(() => {
    recargarUltimoPago()
  }, [])

  // Calcular la lista visible aplicando filtros y orden; se recalcula solo cuando cambia alguna dependencia
  const listaFiltrada = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0, 7)
    const lista = vista === 'clientes' ? clientes : empleados
    if (!Array.isArray(lista)) return []

    return lista
      // Filtrar por estado activo/baja
      .filter(usr => {
        if (filtroActivo === 'activos') return usr.activo
        if (filtroActivo === 'baja')    return !usr.activo
        return true
      })
      // Filtrar por estado del último pago (solo en vista clientes)
      .filter(usr => {
        if (vista !== 'clientes' || filtroPago === 'todos') return true
        const pago = ultimoPago[usr._id]
        const sinPagoEsteMes = !pago || pago.mes < mesActual
        if (filtroPago === 'no-generado') return sinPagoEsteMes
        if (sinPagoEsteMes) return false
        if (filtroPago === 'confirmado') return !pago.pendiente
        if (filtroPago === 'pendiente')  return pago.pendiente
        return true
      })
      // Filtrar por texto de búsqueda sobre el campo seleccionado
      .filter(usr => {
        if (!busqueda.trim()) return true
        const valor = String(usr[campoBusqueda] ?? '').toLowerCase()
        return valor.includes(busqueda.toLowerCase())
      })
      .filter(usr => !(vista === 'empleados' && usr._id === usuario.id))
      .sort((a, b) => {
        if (ordenar === 'nombre_asc')  return a.nombre.localeCompare(b.nombre)
        if (ordenar === 'nombre_desc') return b.nombre.localeCompare(a.nombre)
        if (ordenar === 'fecha_asc')   return new Date(a.fecha_alta) - new Date(b.fecha_alta)
        if (ordenar === 'fecha_desc')  return new Date(b.fecha_alta) - new Date(a.fecha_alta)
        return 0
      })
  }, [vista, clientes, empleados, busqueda, campoBusqueda, filtroActivo, filtroPago, ordenar, ultimoPago, usuario.id])

  const esClientes = vista === 'clientes'

  // Dar de baja (PATCH /baja) o reactivar (PATCH /alta) un usuario; actualiza el estado local sin recargar la lista completa
  const toggleActivo = async (u) => {
    const tipo = esClientes ? 'clientes' : (u.rol === 'admin' ? 'administradores' : 'entrenadores')
    setProcesando(u._id)
    try {
      if (u.activo) {
        await api.patch(`/api/${tipo}/${u._id}/baja`)
      } else {
        await api.patch(`/api/${tipo}/${u._id}/alta`)
      }
      const actualizar = lista => lista.map(item =>
        item._id === u._id ? { ...item, activo: !item.activo } : item
      )
      esClientes ? setClientes(actualizar) : setEmpleados(actualizar)
    } catch {
      setErrorOperacion(`No se pudo ${u.activo ? 'dar de baja' : 'dar de alta'} a ${u.nombre} ${u.apellidos}.`)
    } finally {
      setProcesando(null)
    }
  }

  // Cargar el perfil completo del usuario autenticado y abrir su modal
  const abrirPerfilPropio = async () => {
    try {
      const endpoint = usuario.rol === 'admin' ? 'administradores' : 'entrenadores'
      const res = await api.get(`/api/${endpoint}/${usuario.id}`)
      const datos = res.data.empleado ?? res.data
      setModalUsuario({ usuario: datos, rolEditable: false })
    } catch {
      setErrorOperacion('No se pudo cargar tu perfil. Inténtalo de nuevo.')
    }
  }

  return (
    <div className={`min-h-screen ${color.bgPagina} flex flex-col`}>
      <Header usuario={usuario} onLogout={logout} onAvatarClick={abrirPerfilPropio}>
        <BtnGenerarPagos onClick={generarPagos.abrir} cargando={generarPagos.cargando} />
      </Header>

      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl w-full mx-auto flex flex-col gap-6 sm:gap-8">

        {/* Generar pagos: visible solo en móvil (en desktop va en el header) */}
        <BtnGenerarPagos onClick={generarPagos.abrir} cargando={generarPagos.cargando} className="sm:hidden" />

        {/* Cards de estadísticas + botón gestionar cuotas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">

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

          <div className="flex flex-col gap-2 lg:col-span-1">
            <button
              className={`${s.btnPrimary} flex-1 px-4`}
              onClick={() => setModalCuotas(true)}
            >
              Gestionar cuotas
            </button>
            <button
              className={`hidden sm:block ${s.btnPrimary} flex-1 px-4`}
              onClick={() => setModalUsuario({ usuario: null, rolEditable: !esClientes })}
            >
              + Añadir {esClientes ? 'cliente' : 'empleado'}
            </button>
          </div>

        </div>

        {/* Controles: toggle + buscador + filtros */}
        <FiltrosUsuarios
          busqueda={busqueda}           onBusquedaChange={setBusqueda}
          campoBusqueda={campoBusqueda} onCampoBusquedaChange={setCampoBusqueda}
          filtroActivo={filtroActivo}   onFiltroActivoChange={setFiltroActivo}
          filtroPago={filtroPago}       onFiltroPagoChange={setFiltroPago}
          mostrarFiltroPago={esClientes}
          ordenar={ordenar}             onOrdenarChange={setOrdenar}
        >
          {/* Ver + Añadir en la misma fila en móvil */}
          <div className="flex gap-3 w-full sm:w-auto sm:contents">
            <button
              className={`${s.btnPrimary} px-4 flex-1 sm:flex-none`}
              onClick={() => { setVista(esClientes ? 'empleados' : 'clientes'); setBusqueda(''); setFiltroActivo('activos'); setFiltroPago('todos') }}
            >
              Ver {esClientes ? 'empleados' : 'clientes'}
            </button>
            <button
              className={`sm:hidden ${s.btnPrimary} px-4 flex-1`}
              onClick={() => setModalUsuario({ usuario: null, rolEditable: !esClientes })}
            >
              + Añadir {esClientes ? 'cliente' : 'empleado'}
            </button>
          </div>
        </FiltrosUsuarios>

        <ListaUsuarios
          lista={listaFiltrada}
          cargando={cargandoTabla}
          esClientes={esClientes}
          ultimoPago={ultimoPago}
          mesActual={new Date().toISOString().slice(0, 7)}
          procesando={procesando}
          confirmandoPago={confirmarPago.confirmandoPago}
          onVerPerfil={usr => setModalUsuario({ usuario: usr })}
          onVerPagos={setModalPagos}
          onCambiarCuota={setModalCambioCuota}
          onBajaAlta={setConfirmacionBajaAlta}
          onConfirmarPago={usr => confirmarPago.abrirConfirmacion(usr, ultimoPago)}
        />

      </main>

      {modalCuotas && (
        <ModalGestionCuotas onClose={() => setModalCuotas(false)} />
      )}

      {modalUsuario && (
        <ModalUsuario
          usuario={modalUsuario.usuario ?? null}
          rolEditable={modalUsuario.rolEditable ?? false}
          soloLectura={modalUsuario.usuario && modalUsuario.usuario.activo === false}
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
              recargar()
            }
          }}
        />
      )}

      {errorOperacion && (
        <ModalConfirmacion
          mensaje={errorOperacion}
          textoConfirmar="Entendido"
          soloConfirmar
          onConfirmar={() => setErrorOperacion(null)}
          onCancelar={() => setErrorOperacion(null)}
        />
      )}

      {generarPagos.confirmar && (
        <ModalConfirmacion
          mensaje="¿Generar pagos del mes actual para todos los clientes que no los tengan?"
          textoConfirmar="Generar"
          onConfirmar={generarPagos.ejecutar}
          onCancelar={() => generarPagos.cerrarResultado()}
        />
      )}

      {generarPagos.resultado && (
        <ModalConfirmacion
          mensaje={generarPagos.resultado.mensaje}
          textoConfirmar="Cerrar"
          soloConfirmar
          onConfirmar={generarPagos.cerrarResultado}
          onCancelar={generarPagos.cerrarResultado}
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
          bloqueadoEdicion={!modalPagos.activo}
          onClose={() => setModalPagos(null)}
          onPagoConfirmado={recargarUltimoPago}
          onCuotaCambiada={(clienteActualizado) => {
            // Actualizar el cliente en la lista local tras cambiar la cuota desde dentro del modal
            setClientes(prev => prev.map(cliente =>
              cliente._id === clienteActualizado._id ? clienteActualizado : cliente
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
            setClientes(prev => prev.map(cliente =>
              cliente._id === clienteActualizado._id ? clienteActualizado : cliente
            ))
          }}
        />
      )}

      {confirmarPago.confirmacionPago && (
        <ModalConfirmarPago
          cliente={confirmarPago.confirmacionPago.usuario}
          pago={confirmarPago.confirmacionPago.pago}
          cuota={cuotas.find(tipoCuota => tipoCuota.nombre === confirmarPago.confirmacionPago.pago.tipo_cuota)}
          onConfirmar={confirmarPago.ejecutar}
          onCancelar={() => confirmarPago.setConfirmacionPago(null)}
        />
      )}
    </div>
  )
}

export default AdminDashboard
