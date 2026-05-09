import { useState } from 'react'
import { Plus } from 'lucide-react'
import ModalBase from './ModalBase'
import ModalConfirmacion from './ModalConfirmacion'
import ModalResultado from './ModalResultado'
import CampoFormulario from '../ui/CampoFormulario'
import StepperFecha from '../ui/StepperFecha'
import api from '../../services/api'
import { color, s } from '../../styles'
import { useAuth } from '../../hooks/useAuth'
import { calcularIMC, calcularPorcentajeGrasa } from '../../utils/composicionCorporal'
import {
  PERIMETROS, PLIEGUES, CAMPOS_OBLIGATORIOS,
  prepararBody, formVacio, formDesdeMedicion,
} from '../../utils/medicion'

// Modal de detalle completo de una medición: ver, editar o crear nueva
// Si se pasa `mediciones` y hay más de una, en modo ver aparecen flechas para navegar cronológicamente
function ModalMedicionCompleto({ cliente, medicion, mediciones, modoInicial = 'ver', onClose, onGuardado }) {
  const { usuario } = useAuth()
  const esEmpleado = usuario.rol === 'admin' || usuario.rol === 'entrenador'

  // Hay navegación si recibimos un array con más de una medición
  const tieneNavegacion = Array.isArray(mediciones) && mediciones.length > 1

  // Índice de la medición mostrada dentro del array (0 = más reciente)
  const [indice, setIndice] = useState(() => {
    if (!tieneNavegacion || !medicion) return 0
    const idx = mediciones.findIndex(item => item._id === medicion._id)
    return idx >= 0 ? idx : 0
  })

  // Medición que se está mostrando: la del índice si hay navegación, si no la prop original
  const medicionActual = tieneNavegacion ? mediciones[indice] : medicion

  const [modo, setModo]                     = useState(modoInicial)
  const [form, setForm]                     = useState(modoInicial === 'nueva' ? formVacio() : (medicion ? formDesdeMedicion(medicion) : formVacio()))
  const [errores, setErrores]               = useState({})
  const [guardando, setGuardando]           = useState(false)
  const [confirmandoGuardar, setConfirmandoGuardar] = useState(false)
  const [resultado, setResultado]           = useState(null)

  // Resetear el formulario al cambiar de medición vía las flechas — patrón "adjust state during render"
  // Detectar el cambio comparando el id mostrado anteriormente con el actual
  const [idMostrado, setIdMostrado] = useState(medicionActual?._id ?? null)
  if (modoInicial !== 'nueva' && medicionActual && medicionActual._id !== idMostrado) {
    setIdMostrado(medicionActual._id)
    setForm(formDesdeMedicion(medicionActual))
    setErrores({})
  }

  const esNueva       = modo === 'nueva'
  const esEditar      = modo === 'editar'
  const esVer         = modo === 'ver'
  const camposActivos = esNueva || esEditar

  // Valores de la medición anterior para mostrar como placeholder al crear una nueva
  const previo    = esNueva && medicion ? formDesdeMedicion(medicion) : null
  const imcPrevio = previo ? calcularIMC(previo.peso, previo.altura) : null

  // Actualizar un campo del formulario; si es un pliegue, recalcular % grasa en el mismo setState
  const actualizarCampo = (campo, valor) => {
    setForm(prev => {
      const nuevo = { ...prev, [campo]: valor }
      if (['biceps', 'triceps', 'subescapular', 'cresta_iliaca'].includes(campo)) {
        const grasa = calcularPorcentajeGrasa(nuevo, cliente.sexo, cliente.fecha_nacimiento)
        nuevo.porcentaje_grasa = grasa !== null ? String(grasa) : ''
      }
      return nuevo
    })
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }))
  }

  // Resetear a modo nueva medición con formulario vacío
  const iniciarNueva = () => {
    setModo('nueva')
    setForm(formVacio())
    setErrores({})
  }

  // Comprobar que todos los campos obligatorios tienen valores válidos
  const validar = () => {
    const nuevosErrores = {}
    for (const campo of CAMPOS_OBLIGATORIOS) {
      if (campo === 'fecha') {
        if (!form.fecha) nuevosErrores.fecha = 'Campo obligatorio'
      } else {
        const val = Number(form[campo])
        if (form[campo] === '') {
          nuevosErrores[campo] = 'Campo obligatorio'
        } else if (isNaN(val) || val < 0) {
          nuevosErrores[campo] = 'Valor inválido'
        }
      }
    }
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  // Enviar el formulario a la API: POST para nueva, PUT para edición
  const guardar = async () => {
    setConfirmandoGuardar(false)
    setGuardando(true)
    try {
      let medicionGuardada
      if (esNueva) {
        const res = await api.post('/api/mediciones', prepararBody({ ...form, cliente_id: cliente._id }))
        medicionGuardada = res.data.medicion ?? res.data
      } else {
        const res = await api.put(`/api/mediciones/${medicionActual._id}`, prepararBody(form))
        medicionGuardada = res.data.medicion ?? res.data
      }
      onGuardado?.(medicionGuardada)
    } catch (err) {
      setResultado({ exito: false, mensaje: err.response?.data?.mensaje ?? 'No se pudo guardar la medición.' })
    } finally {
      setGuardando(false)
    }
  }

  // Cancelar edición: revertir el formulario a los datos originales y volver al modo ver
  const cancelarEdicion = () => {
    if (medicionActual) setForm(formDesdeMedicion(medicionActual))
    setErrores({})
    setModo('ver')
  }

  // Validar y decidir si pedir confirmación (editar) o guardar directamente (nueva)
  const intentarGuardar = () => {
    if (!validar()) return
    if (esEditar) {
      setConfirmandoGuardar(true)
    } else {
      guardar()
    }
  }

  // Título dinámico según el modo actual
  const titulo = esNueva
    ? `Nueva medición — ${cliente.nombre} ${cliente.apellidos}`
    : `Medición`

  // Input numérico reutilizable para perímetros y pliegues
  const inputNumerico = (id, placeholder) => (
    <input
      type="number" step="0.1" min="0"
      value={form[id]}
      onChange={e => actualizarCampo(id, e.target.value)}
      disabled={!camposActivos}
      placeholder={previo?.[id] ? String(previo[id]) : (camposActivos ? placeholder : '')}
      className={`${s.input} w-full disabled:opacity-60`}
    />
  )

  return (
    <ModalBase titulo={titulo} onClose={onClose} ancho="max-w-2xl">

      {/* Wrapper con display:contents para centrar todos los inputs, textareas y labels del modal */}
      {/* contents preserva el flex/gap del padre ModalBase y solo se usa para acotar los selectores */}
      <div className="contents [&_input]:text-center [&_label]:text-center [&_textarea]:text-center">

      {/* Botón nueva medición (solo empleados, no visible ya en modo nueva) */}
      {esEmpleado && !esNueva && (
        <button
          onClick={iniciarNueva}
          className="self-start flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white transition-colors"
        >
          <Plus size={16} />
          Nueva medición
        </button>
      )}

      {/* Campo de fecha con flechas para navegar entre mediciones por orden cronológico */}
      {/* ← retrocede a una más antigua (índice +1, ya que [0] es la más reciente) */}
      {/* Las flechas se desactivan en modo editar/nueva o en los extremos del array */}
      <CampoFormulario label="Fecha" className="sm:text-center">
        <StepperFecha
          fecha={form.fecha}
          puedeAnterior={esVer && tieneNavegacion && indice < mediciones.length - 1}
          puedeSiguiente={esVer && tieneNavegacion && indice > 0}
          onAnterior={() => setIndice(indice + 1)}
          onSiguiente={() => setIndice(indice - 1)}
        />
      </CampoFormulario>

      {/* Sección: Datos generales */}
      <div className="flex flex-col gap-3">
        <h3 className={`text-sm font-semibold ${color.textoAcento2}`}>Datos generales</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CampoFormulario label="Peso (kg)" error={errores.peso}>
            {inputNumerico('peso', 'kg')}
          </CampoFormulario>
          <CampoFormulario label="Altura (cm)" error={errores.altura}>
            {inputNumerico('altura', 'cm')}
          </CampoFormulario>
          {/* % Grasa: calculado automáticamente de los pliegues */}
          <CampoFormulario label="% Grasa (auto)">
            <input
              type="text"
              value={form.porcentaje_grasa !== '' ? `${form.porcentaje_grasa} %` : ''}
              placeholder={previo?.porcentaje_grasa ? `${previo.porcentaje_grasa} %` : '—'}
              disabled
              className={`${s.input} w-full opacity-60 cursor-default`}
            />
          </CampoFormulario>
          {/* IMC: calculado de peso y altura, no se guarda */}
          <CampoFormulario label="IMC (auto)">
            <input
              type="text"
              value={(() => { const v = calcularIMC(form.peso, form.altura); return v !== null ? String(v) : '' })()}
              placeholder={imcPrevio !== null ? String(imcPrevio) : '—'}
              disabled
              className={`${s.input} w-full opacity-60 cursor-default`}
            />
          </CampoFormulario>
        </div>
      </div>

      {/* Sección: Perímetros */}
      <div className="flex flex-col gap-3">
        <h3 className={`text-sm font-semibold ${color.textoAcento2}`}>Perímetros (cm)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PERIMETROS.map(({ id, label }) => (
            <CampoFormulario key={id} label={label} error={errores[id]}>
              {inputNumerico(id, 'cm')}
            </CampoFormulario>
          ))}
        </div>
      </div>

      {/* Sección: Pliegues */}
      <div className="flex flex-col gap-3">
        <h3 className={`text-sm font-semibold ${color.textoAcento2}`}>Pliegues (mm)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PLIEGUES.map(({ id, label }) => (
            <CampoFormulario key={id} label={label} error={errores[id]}>
              {inputNumerico(id, 'mm')}
            </CampoFormulario>
          ))}
        </div>
      </div>

      {/* Sección: Observaciones (opcional) */}
      <div className="flex flex-col gap-3">
        <h3 className={`text-sm font-semibold ${color.textoAcento2}`}>Observaciones</h3>
        <textarea
          value={form.observaciones}
          onChange={e => actualizarCampo('observaciones', e.target.value)}
          disabled={!camposActivos}
          placeholder={camposActivos ? (previo?.observaciones || 'Notas adicionales (opcional)') : ''}
          rows={3}
          className={`${s.input} w-full resize-none disabled:opacity-60 text-left!`}
        />
      </div>

      {/* Botón de acción inferior (solo empleados) */}
      {/* En editar: Cancelar + Guardar; en nueva: solo Guardar; en ver: Editar */}
      {esEmpleado && (
        esVer ? (
          <button onClick={() => setModo('editar')} className={`w-full ${s.btnPrimary}`}>
            Editar
          </button>
        ) : esEditar ? (
          <div className="flex gap-3">
            <button onClick={cancelarEdicion} disabled={guardando} className={s.btnSecundario}>
              Cancelar
            </button>
            <button onClick={intentarGuardar} disabled={guardando} className={`flex-1 ${s.btnPrimary}`}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        ) : (
          <button onClick={intentarGuardar} disabled={guardando} className={`w-full ${s.btnPrimary}`}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        )
      )}

      {/* Confirmación antes de guardar cambios en una medición existente */}
      {confirmandoGuardar && (
        <ModalConfirmacion
          mensaje="¿Guardar los cambios en esta medición?"
          textoConfirmar="Guardar"
          onConfirmar={guardar}
          onCancelar={() => setConfirmandoGuardar(false)}
        />
      )}

      {/* Resultado de error al guardar */}
      {resultado && (
        <ModalResultado
          exito={resultado.exito}
          mensaje={resultado.mensaje}
          onCerrar={() => setResultado(null)}
        />
      )}

      </div>

    </ModalBase>
  )
}

export default ModalMedicionCompleto
