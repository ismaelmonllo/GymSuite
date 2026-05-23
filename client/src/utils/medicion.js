// Constantes y helpers puros para el formulario de medición
// Centralizan los campos del modelo y las transformaciones del formulario

// Definición de los campos de perímetros (cm)
export const PERIMETROS = [
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
export const PLIEGUES = [
  { id: 'biceps',        label: 'Bíceps' },
  { id: 'triceps',       label: 'Tríceps' },
  { id: 'subescapular',  label: 'Subescapular' },
  { id: 'cresta_iliaca', label: 'Cresta ilíaca' },
]

// Campos obligatorios: fecha y porcentaje_grasa excluidos (auto-rellenados)
export const CAMPOS_OBLIGATORIOS = [
  'peso', 'altura',
  ...PERIMETROS.map(campo => campo.id),
  ...PLIEGUES.map(campo => campo.id),
]

// Campos que deben enviarse como número (no como string)
export const CAMPOS_NUMERICOS = new Set([
  'peso', 'altura', 'porcentaje_grasa',
  ...PERIMETROS.map(campo => campo.id),
  ...PLIEGUES.map(campo => campo.id),
])

/**
 * Obtener la fecha de hoy en formato YYYY-MM-DD para el input date.
 * @returns {string} Fecha de hoy en ISO recortada a 10 caracteres
 */
export const hoy = () => new Date().toISOString().slice(0, 10)

/**
 * Preparar el body para la API: convertir numéricos a Number y excluir strings vacíos.
 * @param {Record<string, unknown>} datos Formulario completo en bruto
 * @returns {Record<string, unknown>} Objeto listo para enviar al backend
 */
export const prepararBody = (datos) =>
  Object.fromEntries(
    Object.entries(datos)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => [k, CAMPOS_NUMERICOS.has(k) ? Number(v) : v])
  )

/**
 * Construir formulario vacío para nueva medición con fecha de hoy.
 * @returns {Record<string, string>} Estado inicial del formulario
 */
export const formVacio = () => ({
  fecha: hoy(), peso: '', altura: '', porcentaje_grasa: '',
  cuello: '', hombros: '', pecho_ins: '', pecho_exp: '',
  cintura: '', cadera: '', muslo: '', gemelo: '', brazo: '', antebrazo: '',
  biceps: '', triceps: '', subescapular: '', cresta_iliaca: '',
  observaciones: '',
})

/**
 * Rellenar formulario con los datos de una medición existente (todos los campos a string).
 * @param {Record<string, unknown>} medicion Documento de medición devuelto por la API
 * @returns {Record<string, string>} Estado del formulario listo para editar
 */
export const formDesdeMedicion = (medicion) => ({
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
