import mongoose from 'mongoose';

// Esquema unificado para todos los usuarios del sistema (admin, entrenador y cliente)
// Los campos nivel y tipo_cuota solo aplican a los usuarios con rol 'cliente'
const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidos: { type: String, required: true },
    correo: { type: String, required: true, unique: true },
    contrasena: { type: String, required: true },
    telefono: { type: String },
    direccion: { type: String },
    fecha_nacimiento: { type: Date, required: true },
    DNI: { type: String, required: true, unique: true },
    rol: { type: String, required: true, enum: ['admin', 'entrenador', 'cliente'] },
    nivel: { type: String, enum: ['principiante', 'intermedio', 'avanzado'] }, // solo cliente
    fecha_alta: { type: Date, required: true, default: Date.now },
    activo: { type: Boolean, required: true, default: true },
    tipo_cuota: { type: mongoose.Schema.Types.ObjectId, ref: 'TipoCuota' }, // solo cliente
})

export default mongoose.model('Usuario', usuarioSchema);
