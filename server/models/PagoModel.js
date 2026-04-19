import mongoose from 'mongoose';

// Esquema para registrar los pagos de cuota de los clientes
// Los pagos se generan automáticamente: se crean con fecha y registrado_por vacíos
// y se rellenan al confirmar el pago manualmente
const pagoSchema = new mongoose.Schema({
    cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    mes: {type:String, required: true},
    tipo_cuota: {type:String, required: true},
    importe: {type:Number, required: true},
    pendiente: {type:Boolean, required: true, default: false},
    fecha: {type:Date}, // Se añadira al confirmar el pago
    registrado_por: {type: mongoose.Schema.Types.ObjectId, ref: 'Usuario'}, // Se añadira al confirmar el pago
    grupo_pago: {type: mongoose.Schema.Types.ObjectId}, // Agrupa pagos de varios meses generados juntos
});

export default mongoose.model('Pago', pagoSchema);
