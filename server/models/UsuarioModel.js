import mongoose from 'mongoose';

// Esquema unificado para todos los usuarios del sistema (admin, entrenador y cliente)
// Los campos nivel y tipo_cuota solo aplican a los usuarios con rol 'cliente'
const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidos: { type: String, required: true },
    correo: { type: String, required: true, unique: true, lowercase: true, trim: true },
    contrasena: { type: String, required: true, select: false },
    telefono: { type: String },
    direccion: { type: String },
    fecha_nacimiento: { type: Date, required: true },
    DNI: { type: String, required: true },
    rol: { type: String, required: true, enum: ['admin', 'entrenador', 'cliente'] },
    sexo:  { type: String, enum: ['masculino', 'femenino'] },
    nivel: { type: String, enum: ['principiante', 'intermedio', 'avanzado'] }, // solo cliente
    fecha_alta: { type: Date, required: true, default: Date.now },
    activo: { type: Boolean, required: true, default: true },
    tipo_cuota: { type: mongoose.Schema.Types.ObjectId, ref: 'TipoCuota' }, // solo cliente
    // Marca true tras un alta o reseteo: el usuario debe cambiar la contraseña temporal en su próximo login
    forzar_cambio_password: { type: Boolean, default: false },
})

// DNI único por rol: una misma persona puede tener cuentas como cliente, entrenador y admin
// pero no dos cuentas del mismo rol con el mismo DNI
usuarioSchema.index({ DNI: 1, rol: 1 }, { unique: true });

export default mongoose.model('Usuario', usuarioSchema);
