// Script de seed — poblar la BD con datos de prueba realistas
// Ejecutar desde GymSuite/server/: node seed.js
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import Usuario   from './models/UsuarioModel.js'
import TipoCuota from './models/TipoCuotaModel.js'
import Pago      from './models/PagoModel.js'
import Medicion  from './models/MedicionModel.js'

const formatearMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const sumarMeses   = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const rand         = (min, max) => Math.round(Math.random() * (max - min) + min)

// ── Datos base ────────────────────────────────────────────────────────────────

const HASH = await bcrypt.hash('Gym1234', 10)

const CUOTAS_DATA = [
  { nombre: 'Mensual',    meses: 1,  importe: 40  },
  { nombre: 'Trimestral', meses: 3,  importe: 110 },
  { nombre: 'Semestral',  meses: 6,  importe: 200 },
  { nombre: 'Anual',      meses: 12, importe: 360 },
]

const NOMBRES = [
  'Carlos', 'Laura', 'Pedro', 'Ana', 'Miguel', 'Sofía', 'Javier', 'Elena',
  'David', 'María', 'Rubén', 'Cristina', 'Antonio', 'Lucía', 'Fernando',
  'Beatriz', 'Alejandro', 'Patricia', 'Iván', 'Natalia', 'Raúl', 'Marta',
  'Sergio', 'Irene', 'Jorge', 'Alicia', 'Óscar', 'Verónica', 'Hugo', 'Alba',
]
const APELLIDOS = ['García', 'Martínez', 'López', 'Sánchez', 'González',
                   'Pérez', 'Rodríguez', 'Fernández', 'Jiménez', 'Ruiz',
                   'Álvarez', 'Díaz', 'Moreno', 'Muñoz', 'Romero']
const NIVELES = ['principiante', 'intermedio', 'avanzado']

// Fechas de alta distribuidas a lo largo de los últimos 2 años
const FECHAS_ALTA = [
  new Date('2023-01-01'), new Date('2023-02-01'), new Date('2023-04-01'),
  new Date('2023-06-01'), new Date('2023-07-01'), new Date('2023-09-01'),
  new Date('2023-10-01'), new Date('2023-11-01'), new Date('2024-01-01'),
  new Date('2024-02-01'), new Date('2024-03-01'), new Date('2024-05-01'),
  new Date('2024-06-01'), new Date('2024-08-01'), new Date('2024-09-01'),
  new Date('2024-10-01'), new Date('2024-11-01'), new Date('2024-12-01'),
  new Date('2025-01-01'), new Date('2025-02-01'), new Date('2025-03-01'),
  new Date('2025-04-01'), new Date('2025-01-15'), new Date('2024-07-01'),
  new Date('2023-03-01'), new Date('2023-08-01'), new Date('2024-04-01'),
  new Date('2025-02-15'), new Date('2024-06-15'), new Date('2023-05-01'),
]

// ── Conexión ──────────────────────────────────────────────────────────────────

await mongoose.connect(process.env.MONGODB_URI)
console.log('Conectado a MongoDB\n')

// Solo eliminar clientes, pagos y mediciones — respetar admin, entrenadores y cuotas
await Promise.all([
  Usuario.deleteMany({ rol: 'cliente' }),
  Pago.deleteMany({}),
  Medicion.deleteMany({}),
])
console.log('Clientes, pagos y mediciones eliminados')

// Obtener tipos de cuota existentes (o crearlos si no hay ninguno)
let cuotas = await TipoCuota.find()
if (cuotas.length === 0) {
  cuotas = await TipoCuota.insertMany(CUOTAS_DATA)
  console.log(`${cuotas.length} tipos de cuota creados`)
} else {
  console.log(`${cuotas.length} tipos de cuota existentes`)
}

// Obtener entrenadores existentes para asignar pagos y mediciones
const entrenadores = await Usuario.find({ rol: 'entrenador', activo: true })
if (entrenadores.length === 0) {
  console.error('No hay entrenadores en la BD. Ejecuta el seed completo primero.')
  process.exit(1)
}
console.log(`${entrenadores.length} entrenadores encontrados`)

// ── Clientes ──────────────────────────────────────────────────────────────────

const clientes = await Usuario.insertMany(
  NOMBRES.map((nombre, i) => ({
    nombre,
    apellidos: `${APELLIDOS[i % APELLIDOS.length]} ${APELLIDOS[(i + 5) % APELLIDOS.length]}`,
    correo: `cliente${i + 1}@gymsuite.com`, contrasena: HASH,
    telefono: `6${String(i + 1).padStart(8, '0')}`,
    direccion: `Calle Cliente ${i + 1}`,
    fecha_nacimiento: new Date(`199${i % 9}-${String((i % 12) + 1).padStart(2, '0')}-15`),
    DNI: `${String(10000000 + i).padStart(8, '0')}B`,
    rol: 'cliente', nivel: NIVELES[i % 3],
    fecha_alta: FECHAS_ALTA[i],
    activo: i < 27, // últimos 3 inactivos
    tipo_cuota: cuotas[i % cuotas.length]._id,
  }))
)
console.log(`${clientes.length} clientes creados (${clientes.filter(c => !c.activo).length} inactivos)`)

// ── Pagos ─────────────────────────────────────────────────────────────────────
// Un pago por mes desde fecha_alta hasta el mes actual
// Meses pasados: confirmados. Mes actual: pendiente.

const ahora      = new Date()
const mesActual  = formatearMes(ahora)
const pagos      = []

for (const cliente of clientes.filter(c => c.activo)) {
  const cuota = cuotas.find(c => c._id.equals(cliente.tipo_cuota))
  const importeMensual = Math.round((cuota.importe / cuota.meses) * 100) / 100
  const grupoPago = new mongoose.Types.ObjectId()

  // Iterar mes a mes desde fecha_alta hasta hoy
  let cursor = new Date(cliente.fecha_alta.getFullYear(), cliente.fecha_alta.getMonth(), 1)
  while (formatearMes(cursor) <= mesActual) {
    const esMesActual = formatearMes(cursor) === mesActual
    pagos.push({
      cliente_id:     cliente._id,
      mes:            formatearMes(cursor),
      tipo_cuota:     cuota.nombre,
      importe:        importeMensual,
      pendiente:      esMesActual,
      fecha:          !esMesActual ? new Date(cursor) : undefined,
      registrado_por: !esMesActual ? entrenadores[rand(0, entrenadores.length - 1)]._id : undefined,
      grupo_pago:     grupoPago,
    })
    cursor = sumarMeses(cursor, 1)
  }
}

await Pago.insertMany(pagos)
console.log(`${pagos.length} pagos creados`)

// ── Mediciones ────────────────────────────────────────────────────────────────
// Una medición cada 2 meses desde fecha_alta (máximo 6)

const mediciones = []

for (const cliente of clientes.filter(c => c.activo)) {
  const entrenador = entrenadores[rand(0, entrenadores.length - 1)]
  const mesesDesdeAlta = Math.floor(
    (ahora - new Date(cliente.fecha_alta)) / (1000 * 60 * 60 * 24 * 30)
  )
  const numMediciones = Math.min(Math.max(1, Math.floor(mesesDesdeAlta / 2)), 6)

  for (let i = 0; i < numMediciones; i++) {
    mediciones.push({
      cliente_id:       cliente._id,
      entrenador_id:    entrenador._id,
      fecha:            sumarMeses(new Date(cliente.fecha_alta), i * 2),
      peso:             rand(58, 98),
      altura:           rand(158, 192),
      porcentaje_grasa: rand(10, 32),
      cuello:           rand(34, 43),
      hombros:          rand(108, 132),
      pecho_ins:        rand(88, 112),
      pecho_exp:        rand(93, 117),
      cintura:          rand(68, 98),
      cadera:           rand(83, 107),
      muslo:            rand(48, 67),
      gemelo:           rand(32, 43),
      brazo:            rand(27, 41),
      antebrazo:        rand(23, 33),
      biceps:           rand(5, 16),
      triceps:          rand(7, 19),
      subescapular:     rand(7, 21),
      cresta_iliaca:    rand(9, 26),
      observaciones:    i === 0 ? 'Medición inicial de control' : '',
    })
  }
}

await Medicion.insertMany(mediciones)
console.log(`${mediciones.length} mediciones creadas`)

// ── Resumen ───────────────────────────────────────────────────────────────────

await mongoose.disconnect()
console.log('\n✓ Seed completado')
console.log('─────────────────────────────────────────')
console.log('Credenciales (contraseña: Gym1234)')
console.log(`  Clientes: cliente1@gymsuite.com … cliente${NOMBRES.length}@gymsuite.com`)
console.log('─────────────────────────────────────────')
