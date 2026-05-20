import mongoose from 'mongoose';

// Esquema para registrar los pagos de cuota de los clientes
// Los pagos se generan automáticamente: se crean con fecha y registrado_por vacíos
// y se rellenan al confirmar el pago manualmente
// importe se guarda en céntimos (entero) para evitar errores de redondeo en aritmética con decimales
const pagoSchema = new mongoose.Schema({
    cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    mes: { type: String, required: true },
    tipo_cuota: { type: String, required: true },
    importe: { type: Number, required: true, min: 0 },
    pendiente: { type: Boolean, required: true, default: false },
    fecha: { type: Date }, // Se añadirá al confirmar el pago
    registrado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }, // Se añadirá al confirmar el pago
    grupo_pago: { type: mongoose.Schema.Types.ObjectId }, // Agrupa pagos de varios meses generados juntos
});

pagoSchema.index({ cliente_id: 1, mes: -1 });
pagoSchema.index({ grupo_pago: 1 });
pagoSchema.index({ mes: 1, pendiente: 1 });

export default mongoose.model('Pago', pagoSchema);
