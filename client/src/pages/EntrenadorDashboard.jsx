import { useEffect, useState, useMemo } from 'react'
import Header from '../components/layout/Header'
import ListaUsuarios from '../components/dashboard/ListaUsuarios'
import FiltrosUsuarios from '../components/dashboard/FiltrosUsuarios'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import { color, s } from '../styles'
import BtnGenerarPagos from '../components/dashboard/BtnGenerarPagos'
import ModalConfirmacion from '../components/modals/ModalConfirmacion'
import ModalUsuario from '../components/modals/ModalUsuario'
import ModalCambioCuota from '../components/modals/ModalCambioCuota'
import ModalPagos from '../components/modals/ModalPagos'
import ModalMedicionesHistorial from '../components/modals/ModalMedicionesHistorial'
import ModalConfirmarPago from '../components/modals/ModalConfirmarPago'


const mesActual = new Date().toISOString().slice(0, 7)

function EntrenadorDashboard() {
  const { usuario, logout } = useAuth()

  const [clientes, setClientes]           = useState([])
  const [cargandoTabla, setCargandoTabla] = useState(true)
  const [ultimoPago, setUltimoPago]       = useState({})
  const [cuotas, setCuotas]               = useState([])

  const [busqueda, setBusqueda]             = useState('')
  const [campoBusqueda, setCampoBusqueda]   = useState('nombre')
  const [filtroActivo, setFiltroActivo]     = useState('activos')
  const [filtroPago, setFiltroPago]         = useState('todos')
  const [ordenar, setOrdenar]               = useState('fecha_desc')

  const [confirmarGenerarPagos, setConfirmarGenerarPagos] = useState(false)
  const [resultadoGenerarPagos, setResultadoGenerarPagos] = useState(null)
  const [generandoPagos, setGenerandoPagos]               = useState(false)

  const [modalUsuario, setModalUsuario]                 = useState(null)
  const [confirmacionBajaAlta, setConfirmacionBajaAlta] = useState(null)
  const [procesando, setProcesando]                     = useState(null)
  const [errorOperacion, setErrorOperacion]             = useState(null)
  const [confirmandoPago, setConfirmandoPago]           = useState(null)
  const [confirmacionPago, setConfirmacionPago]         = useState(null)
  const [modalPagos, setModalPagos]                     = useState(null)
  const [modalCambioCuota, setModalCambioCuota]         = useState(null)
  const [modalMediciones, setModalMediciones]           = useState(null)

  useEffect(() => {
    api.get('/api/cuotas').then(res => setCuotas(res.data.cuotas ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      api.get('/api/clientes'),
      api.get('/api/stats/ultimo-pago').then(res => res.data).catch(() => ({})),
    ])
      .then(([resClientes, mapaUltimoPago]) => {
        setClientes(resClientes.data.clientes ?? [])
        setUltimoPago(mapaUltimoPago)
      })
      .catch(err => console.error('Error cargando clientes:', err))
      .finally(() => setCargandoTabla(false))
  }, [])

  const listaFiltrada = useMemo(() => {
    if (!Array.isArray(clientes)) return []

    return clientes
      .filter(usr => {
        if (filtroActivo === 'activos') return usr.activo
        if (filtroActivo === 'baja')    return !usr.activo
        return true
      })
      .filter(usr => {
        if (filtroPago === 'todos') return true
        const pago = ultimoPago[usr._id]
        const sinPagoEsteMes = !pago || pago.mes < mesActual
        if (filtroPago === 'no-generado') return sinPagoEsteMes
        if (sinPagoEsteMes) return false
        if (filtroPago === 'confirmado') return !pago.pendiente
        if (filtroPago === 'pendiente')  return pago.pendiente
        return true
      })
      .filter(usr => {
        if (!busqueda.trim()) return true
        const valor = String(usr[campoBusqueda] ?? '').toLowerCase()
        return valor.includes(busqueda.toLowerCase())
      })
      .sort((a, b) => {
        if (ordenar === 'nombre_asc')  return a.nombre.localeCompare(b.nombre)
        if (ordenar === 'nombre_desc') return b.nombre.localeCompare(a.nombre)
        if (ordenar === 'fecha_asc')   return new Date(a.fecha_alta) - new Date(b.fecha_alta)
        if (ordenar === 'fecha_desc')  return new Date(b.fecha_alta) - new Date(a.fecha_alta)
        return 0
      })
  }, [clientes, busqueda, campoBusqueda, filtroActivo, filtroPago, ordenar, ultimoPago])

  // Dar de baja o de alta un cliente
  const toggleActivo = async (u) => {
    setProcesando(u._id)
    try {
      if (u.activo) {
        await api.patch(`/api/clientes/${u._id}/baja`)
      } else {
        await api.patch(`/api/clientes/${u._id}/alta`)
      }
      setClientes(prev => prev.map(item =>
        item._id === u._id ? { ...item, activo: !item.activo } : item
      ))
    } catch {
      setErrorOperacion(`No se pudo ${u.activo ? 'dar de baja' : 'dar de alta'} a ${u.nombre} ${u.apellidos}.`)
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
      api.get('/api/stats/ultimo-pago').then(resStats => setUltimoPago(resStats.data)).catch(() => {})
    } catch (err) {
      setResultadoGenerarPagos({ exito: false, mensaje: err.response?.data?.mensaje ?? 'Error al generar los pagos.' })
    } finally {
      setGenerandoPagos(false)
    }
  }

  // Cargar perfil propio del entrenador y abrir su modal
  const abrirPerfilPropio = async () => {
    try {
      const res = await api.get(`/api/entrenadores/${usuario.id}`)
      const datos = res.data.empleado ?? res.data
      setModalUsuario({ usuario: datos })
    } catch {
      setErrorOperacion('No se pudo cargar tu perfil. Inténtalo de nuevo.')
    }
  }

  // Abrir confirmación de pago con los datos del último pago pendiente
  const confirmarPago = (u) => {
    const pago = ultimoPago[u._id]
    if (!pago?.pendiente) return
    setConfirmacionPago({ usuario: u, pago })
  }

  // Marcar el grupo de pagos como cobrado y refrescar el mapa de últimos pagos
  // Refetch en lugar de patch local para que la fecha y demás campos queden actualizados
  const ejecutarConfirmacionPago = async () => {
    const { usuario: clienteConfirmado, pago } = confirmacionPago
    setConfirmacionPago(null)
    setConfirmandoPago(clienteConfirmado._id)
    try {
      await api.post('/api/pagos/registrar', { grupo_pago: pago.grupo_pago })
      const resStats = await api.get('/api/stats/ultimo-pago')
      setUltimoPago(resStats.data)
    } catch {
      setErrorOperacion(`No se pudo confirmar el pago de ${clienteConfirmado.nombre} ${clienteConfirmado.apellidos}.`)
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

        <BtnGenerarPagos onClick={() => setConfirmarGenerarPagos(true)} cargando={generandoPagos} className="sm:hidden" />

        <FiltrosUsuarios
          busqueda={busqueda}           onBusquedaChange={setBusqueda}
          campoBusqueda={campoBusqueda} onCampoBusquedaChange={setCampoBusqueda}
          filtroActivo={filtroActivo}   onFiltroActivoChange={setFiltroActivo}
          filtroPago={filtroPago}       onFiltroPagoChange={setFiltroPago}
          mostrarFiltroPago
          ordenar={ordenar}             onOrdenarChange={setOrdenar}
        >
          <div className="flex gap-3 w-full sm:w-auto sm:contents">
            <button
              className={`${s.btnPrimary} px-4 flex-1 sm:flex-none`}
              onClick={() => setModalUsuario({ usuario: null })}
            >
              + Añadir cliente
            </button>
          </div>
        </FiltrosUsuarios>

        <ListaUsuarios
          lista={listaFiltrada}
          cargando={cargandoTabla}
          esClientes
          ultimoPago={ultimoPago}
          mesActual={mesActual}
          procesando={procesando}
          confirmandoPago={confirmandoPago}
          mostrarMediciones
          onVerPerfil={usr => setModalUsuario({ usuario: usr })}
          onVerPagos={setModalPagos}
          onCambiarCuota={setModalCambioCuota}
          onVerMediciones={setModalMediciones}
          onBajaAlta={setConfirmacionBajaAlta}
          onConfirmarPago={confirmarPago}
        />

      </main>

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

      {modalUsuario && (
        <ModalUsuario
          usuario={modalUsuario.usuario ?? null}
          rolEditable={false}
          onClose={() => setModalUsuario(null)}
          onGuardar={(datosRespuesta) => {
            const esEdicion = !!modalUsuario.usuario
            setModalUsuario(null)

            if (esEdicion) {
              const usuarioActualizado = datosRespuesta.cliente ?? datosRespuesta.empleado
              if (usuarioActualizado) {
                setClientes(prev => prev.map(item =>
                  item._id === usuarioActualizado._id ? usuarioActualizado : item
                ))
              }
            } else {
              api.get('/api/clientes')
                .then(res => setClientes(res.data.clientes ?? []))
                .catch(err => console.error('Error recargando clientes tras alta:', err))
            }
          }}
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

      {errorOperacion && (
        <ModalConfirmacion
          mensaje={errorOperacion}
          textoConfirmar="Entendido"
          soloConfirmar
          onConfirmar={() => setErrorOperacion(null)}
          onCancelar={() => setErrorOperacion(null)}
        />
      )}

      {modalPagos && (
        <ModalPagos
          cliente={modalPagos}
          cuotas={cuotas}
          onClose={() => setModalPagos(null)}
          onPagoConfirmado={() => {
            api.get('/api/stats/ultimo-pago').then(res => setUltimoPago(res.data)).catch(() => {})
          }}
          onCuotaCambiada={(clienteActualizado) => {
            setClientes(prev => prev.map(cliente =>
              cliente._id === clienteActualizado._id ? clienteActualizado : cliente
            ))
            setModalPagos(clienteActualizado)
          }}
        />
      )}

      {modalMediciones && (
        <ModalMedicionesHistorial
          cliente={modalMediciones}
          onClose={() => setModalMediciones(null)}
        />
      )}

      {modalCambioCuota && (
        <ModalCambioCuota
          cliente={modalCambioCuota}
          cuotas={cuotas}
          onClose={() => setModalCambioCuota(null)}
          onGuardar={(clienteActualizado) => {
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

export default EntrenadorDashboard
