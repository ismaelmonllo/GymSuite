import mongoose from 'mongoose';

// Esquema para los tipos de cuota disponibles en el gimnasio
// Cada tipo define su nombre, duración en meses e importe a pagar
// importe se guarda en céntimos (entero) para evitar errores de redondeo en aritmética con decimales
const tipoCuotaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    meses: { type: Number, required: true },
    importe: { type: Number, required: true, min: 0 },
});

export default mongoose.model('TipoCuota', tipoCuotaSchema);
