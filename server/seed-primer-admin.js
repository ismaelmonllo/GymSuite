// Crear el primer usuario admin si la BD no tiene ningún usuario
// Ejecutar desde GymSuite/server/: node seed-primer-admin.js
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import Usuario from './models/UsuarioModel.js'

// ── Datos del primer admin ────────────────────────────────────────────────────
// Cambiar la contraseña en el primer login (forzar_cambio_password: true)
const PRIMER_ADMIN = {
  nombre:            'Ismael',
  apellidos:         'Monjas Llorente',
  correo:            'isma01mm@gmail.com',
  telefono:          '500000001',
  // ⚠️ DNI con algoritmo educativo (% 19 en lugar del oficial % 23)
  DNI:               '10000001Q',
  sexo:              'masculino',
  fecha_nacimiento:  new Date('2000-01-01'),
  rol:               'admin',
  activo:            true,
  forzar_cambio_password: true,
}

const PASSWORD_INICIAL = 'Admin1234'

// ── Conexión ──────────────────────────────────────────────────────────────────
// Intentar URI principal; si falla, usar la de backup

try {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Conectado a MongoDB (principal)')
} catch {
  console.warn('URI principal falló, intentando backup...')
  await mongoose.connect(process.env.MONGODB_URI_BACKUP)
  console.log('Conectado a MongoDB (backup)')
}

const totalUsuarios = await Usuario.countDocuments()

if (totalUsuarios > 0) {
  console.log(`BD ya tiene ${totalUsuarios} usuario(s). No se crea el admin inicial.`)
  await mongoose.disconnect()
  process.exit(0)
}

// ── Crear admin ───────────────────────────────────────────────────────────────

const contrasena = await bcrypt.hash(PASSWORD_INICIAL, 10)

await Usuario.create({ ...PRIMER_ADMIN, contrasena })

console.log('\n✓ Primer admin creado')
console.log('─────────────────────────────────────────')
console.log(`  Correo:     ${PRIMER_ADMIN.correo}`)
console.log(`  Contraseña: ${PASSWORD_INICIAL}  ← cambiar en el primer login`)
console.log('─────────────────────────────────────────')

await mongoose.disconnect()
