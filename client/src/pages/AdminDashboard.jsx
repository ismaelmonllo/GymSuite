import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, CreditCard, Users, UserPlus } from 'lucide-react'
import Header from '../components/layout/Header'
import StatCard from '../components/dashboard/StatCard'
import ListaUsuarios from '../components/dashboard/ListaUsuarios'
import FiltrosUsuarios from '../components/dashboard/FiltrosUsuarios'
import { useAuth } from '../hooks/useAuth'
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


const mesActual = new Date().toISOString().slice(0, 7)

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
  const [errorOperacion, setErrorOperacion]               = useState(null)    // mensaje de error de baja/alta
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

  // Cargar lista de tipos de cuota (usada en ModalPagos, ModalCambioCuota y el modal de confirmación de pago)
  useEffect(() => {
    api.get('/api/cuotas').then(res => setCuotas(res.data.cuotas ?? [])).catch(() => {})
  }, [])

  // Cargar usuarios y último pago de cada cliente en paralelo
  useEffect(() => {
    Promise.all([
      fetchUsuarios(),
      api.get('/api/stats/ultimo-pago').then(res => res.data).catch(() => ({})),
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

  // Marcar el grupo de pagos como cobrado y refrescar el mapa de últimos pagos
  // Refetch en lugar de patch local para que la fecha y demás campos queden actualizados
  const ejecutarConfirmacionPago = async () => {
    const { usuario, pago } = confirmacionPago
    setConfirmacionPago(null)
    setConfirmandoPago(usuario._id)
    try {
      await api.post('/api/pagos/registrar', { grupo_pago: pago.grupo_pago })
      const resStats = await api.get('/api/stats/ultimo-pago')
      setUltimoPago(resStats.data)
    } catch {
      setErrorOperacion(`No se pudo confirmar el pago de ${usuario.nombre} ${usuario.apellidos}.`)
    } finally {
      setConfirmandoPago(null)
    }
  }

  return (
    <div className={`min-h-screen ${color.bgPagina} flex flex-col`}>
      <Header usuario={usuario} onLogout={logout} onAvatarClick={abrirPerfilPropio}>
        <BtnGenerarPagos onClick={() => setConfirmarGenerarPagos(true)} cargando={generandoPagos} />
      </Header>

      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl w-full mx-auto flex flex-col gap-6 sm:gap-8">

        {/* Generar pagos: visible solo en móvil (en desktop va en el header) */}
        <BtnGenerarPagos onClick={() => setConfirmarGenerarPagos(true)} cargando={generandoPagos} className="sm:hidden" />

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
          mesActual={mesActual}
          procesando={procesando}
          confirmandoPago={confirmandoPago}
          onVerPerfil={usr => setModalUsuario({ usuario: usr })}
          onVerPagos={setModalPagos}
          onCambiarCuota={setModalCambioCuota}
          onBajaAlta={setConfirmacionBajaAlta}
          onConfirmarPago={confirmarPago}
        />

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

      {errorOperacion && (
        <ModalConfirmacion
          mensaje={errorOperacion}
          textoConfirmar="Entendido"
          soloConfirmar
          onConfirmar={() => setErrorOperacion(null)}
          onCancelar={() => setErrorOperacion(null)}
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
            api.get('/api/stats/ultimo-pago').then(res => setUltimoPago(res.data)).catch(() => {})
          }}
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

      {confirmacionPago && (
        <ModalConfirmarPago
          cliente={confirmacionPago.usuario}
          pago={confirmacionPago.pago}
          cuota={cuotas.find(tipoCuota => tipoCuota.nombre === confirmacionPago.pago.tipo_cuota)}
          onConfirmar={ejecutarConfirmacionPago}
          onCancelar={() => setConfirmacionPago(null)}
        />
      )}
    </div>
  )
}

export default AdminDashboard
