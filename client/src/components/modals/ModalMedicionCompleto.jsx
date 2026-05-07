import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import ModalBase from './ModalBase'
import ModalConfirmacion from './ModalConfirmacion'
import ModalResultado from './ModalResultado'
import CampoFormulario from '../ui/CampoFormulario'
import api from '../../services/api'
import { color, s } from '../../styles'
import { useAuth } from '../../hooks/useAuth'

// Fecha de hoy en formato YYYY-MM-DD para el input date
const hoy = () => new Date().toISOString().slice(0, 10)

// Calcular IMC = peso(kg) / altura(m)²; devuelve null si los datos no son válidos
const calcularIMC = (peso, altura) => {
  const p = Number(peso)
  const a = Number(altura)
  if (!p || !a || a <= 0) return null
  return Math.round((p / (a / 100) ** 2) * 10) / 10
}

// Constantes Durnin-Womersley (1974) por sexo y grupo de edad
// Fórmula: densidad = a - b × log10(Σ4 pliegues); %grasa = (4.95/densidad - 4.5) × 100
const CONSTANTES_DW = {
  masculino: [
    { maxEdad: 16, a: 1.1533, b: 0.0643 },
    { maxEdad: 19, a: 1.1620, b: 0.0630 },
    { maxEdad: 29, a: 1.1631, b: 0.0632 },
    { maxEdad: 39, a: 1.1422, b: 0.0544 },
    { maxEdad: 49, a: 1.1620, b: 0.0700 },
    { maxEdad: Infinity, a: 1.1715, b: 0.0779 },
  ],
  femenino: [
    { maxEdad: 16, a: 1.1369, b: 0.0598 },
    { maxEdad: 19, a: 1.1549, b: 0.0678 },
    { maxEdad: 29, a: 1.1599, b: 0.0717 },
    { maxEdad: 39, a: 1.1423, b: 0.0632 },
    { maxEdad: 49, a: 1.1333, b: 0.0612 },
    { maxEdad: Infinity, a: 1.1339, b: 0.0645 },
  ],
}

// Calcular % grasa con Durnin-Womersley a partir de los 4 pliegues, sexo y fecha de nacimiento
const calcularPorcentajeGrasa = (pliegues, sexo, fechaNacimiento) => {
  if (!sexo || !CONSTANTES_DW[sexo]) return null

  const suma = ['biceps', 'triceps', 'subescapular', 'cresta_iliaca']
    .reduce((acc, campo) => acc + Number(pliegues[campo] ?? 0), 0)
  if (suma <= 0) return null

  // Calcular edad en años; si no hay fecha de nacimiento usar 30 como estimación
  let edad = 30
  if (fechaNacimiento) {
    const hoyDate = new Date()
    const nac     = new Date(fechaNacimiento)
    edad = hoyDate.getFullYear() - nac.getFullYear()
    const pasoCumple = hoyDate.getMonth() > nac.getMonth() ||
      (hoyDate.getMonth() === nac.getMonth() && hoyDate.getDate() >= nac.getDate())
    if (!pasoCumple) edad--
  }

  const { a, b } = CONSTANTES_DW[sexo].find(fila => edad <= fila.maxEdad)
  const densidad   = a - b * Math.log10(suma)
  const porcentaje = (4.95 / densidad - 4.5) * 100
  return Math.round(Math.max(0, Math.min(100, porcentaje)) * 10) / 10
}

// Definición de los campos de perímetros (cm)
const PERIMETROS = [
  { id: 'cuello',    label: 'Cuello' },
  { id: 'hombros',   label: 'Hombros' },
  { id: 'pecho_ins', label: 'Pecho ins.' },
  { id: 'pecho_exp', label: 'Pecho exp.' },
  { id: 'cintura',   label: 'Cintura' },
  { id: 'cadera',    label: 'Cadera' },
  { id: 'muslo',     label: 'Muslo' },
  { id: 'gemelo',    label: 'Gemelo' },
  { id: 'brazo',     label: 'Brazo' },
  { id: 'antebrazo', label: 'Antebrazo' },
]

// Definición de los campos de pliegues (mm)
const PLIEGUES = [
  { id: 'biceps',        label: 'Bíceps' },
  { id: 'triceps',       label: 'Tríceps' },
  { id: 'subescapular',  label: 'Subescapular' },
  { id: 'cresta_iliaca', label: 'Cresta ilíaca' },
]

// Campos obligatorios: fecha y porcentaje_grasa excluidos (auto-rellenados)
const CAMPOS_OBLIGATORIOS = [
  'peso', 'altura',
  ...PERIMETROS.map(campo => campo.id),
  ...PLIEGUES.map(campo => campo.id),
]

// Campos que deben enviarse como número (no como string)
const CAMPOS_NUMERICOS = new Set([
  'peso', 'altura', 'porcentaje_grasa',
  ...PERIMETROS.map(campo => campo.id),
  ...PLIEGUES.map(campo => campo.id),
])

// Preparar el body para la API: convertir numéricos a Number y excluir strings vacíos
const prepararBody = (datos) =>
  Object.fromEntries(
    Object.entries(datos)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => [k, CAMPOS_NUMERICOS.has(k) ? Number(v) : v])
  )

// Construir formulario vacío para nueva medición con fecha de hoy
const formVacio = () => ({
  fecha: hoy(), peso: '', altura: '', porcentaje_grasa: '',
  cuello: '', hombros: '', pecho_ins: '', pecho_exp: '',
  cintura: '', cadera: '', muslo: '', gemelo: '', brazo: '', antebrazo: '',
  biceps: '', triceps: '', subescapular: '', cresta_iliaca: '',
  observaciones: '',
})

// Rellenar formulario con los datos de una medición existente
const formDesdeMedicion = (medicion) => ({
  fecha:            medicion.fecha?.slice(0, 10) ?? hoy(),
  peso:             String(medicion.peso            ?? ''),
  altura:           String(medicion.altura          ?? ''),
  porcentaje_grasa: String(medicion.porcentaje_grasa ?? ''),
  cuello:           String(medicion.cuello           ?? ''),
  hombros:          String(medicion.hombros          ?? ''),
  pecho_ins:        String(medicion.pecho_ins        ?? ''),
  pecho_exp:        String(medicion.pecho_exp        ?? ''),
  cintura:          String(medicion.cintura          ?? ''),
  cadera:           String(medicion.cadera           ?? ''),
  muslo:            String(medicion.muslo            ?? ''),
  gemelo:           String(medicion.gemelo           ?? ''),
  brazo:            String(medicion.brazo            ?? ''),
  antebrazo:        String(medicion.antebrazo        ?? ''),
  biceps:           String(medicion.biceps           ?? ''),
  triceps:          String(medicion.triceps          ?? ''),
  subescapular:     String(medicion.subescapular     ?? ''),
  cresta_iliaca:    String(medicion.cresta_iliaca    ?? ''),
  observaciones:    medicion.observaciones           ?? '',
})

// Modal de detalle completo de una medición: ver, editar o crear nueva
function ModalMedicionCompleto({ cliente, medicion, modoInicial = 'ver', onClose, onGuardado }) {
  const { usuario } = useAuth()
  const esEmpleado = usuario.rol === 'admin' || usuario.rol === 'entrenador'

  const [modo, setModo]                     = useState(modoInicial)
  const [form, setForm]                     = useState(modoInicial === 'nueva' ? formVacio() : (medicion ? formDesdeMedicion(medicion) : formVacio()))
  const [errores, setErrores]               = useState({})
  const [guardando, setGuardando]           = useState(false)
  const [confirmandoGuardar, setConfirmandoGuardar] = useState(false)
  const [resultado, setResultado]           = useState(null)

  const esNueva       = modo === 'nueva'
  const esEditar      = modo === 'editar'
  const esVer         = modo === 'ver'
  const camposActivos = esNueva || esEditar

  // Valores de la medición anterior para mostrar como placeholder al crear una nueva
  const previo    = esNueva && medicion ? formDesdeMedicion(medicion) : null
  const imcPrevio = previo ? calcularIMC(previo.peso, previo.altura) : null

  // Recalcular % grasa automáticamente cuando cambian los pliegues
  useEffect(() => {
    if (!camposActivos) return
    const resultado = calcularPorcentajeGrasa(form, cliente.sexo, cliente.fecha_nacimiento)
    setForm(prev => ({ ...prev, porcentaje_grasa: resultado !== null ? String(resultado) : '' }))
  }, [form.biceps, form.triceps, form.subescapular, form.cresta_iliaca, camposActivos])

  // Actualizar un campo del formulario y limpiar su error si lo tenía
  const actualizarCampo = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
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
        const res = await api.put(`/api/mediciones/${medicion._id}`, prepararBody(form))
        medicionGuardada = res.data.medicion ?? res.data
      }
      onGuardado?.(medicionGuardada)
    } catch (err) {
      setResultado({ exito: false, mensaje: err.response?.data?.mensaje ?? 'No se pudo guardar la medición.' })
    } finally {
      setGuardando(false)
    }
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
    : `Medición — ${form.fecha ? new Date(form.fecha + 'T00:00:00').toLocaleDateString('es-ES') : ''}`

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

      {/* Sección: Datos generales */}
      <div className="flex flex-col gap-3">
        <h3 className={`text-sm font-semibold ${color.textoAcento2}`}>Datos generales</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <CampoFormulario label="Fecha" className="col-span-2 sm:col-span-1">
            <input
              type="date"
              value={form.fecha}
              disabled
              className={`${s.input} w-full opacity-60 cursor-default`}
            />
          </CampoFormulario>
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
          className={`${s.input} w-full resize-none disabled:opacity-60`}
        />
      </div>

      {/* Botón de acción inferior (solo empleados) */}
      {esEmpleado && (
        esVer ? (
          <button onClick={() => setModo('editar')} className={`w-full ${s.btnPrimary}`}>
            Editar
          </button>
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

    </ModalBase>
  )
}

export default ModalMedicionCompleto
