import mongoose from 'mongoose';

// Esquema para los tipos de cuota disponibles en el gimnasio
// Cada tipo define su nombre, duración en meses e importe a pagar
const tipoCuotaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    meses: { type: Number, required: true },
    importe: { type: Number, required: true },
});

export default mongoose.model('TipoCuota', tipoCuotaSchema);
