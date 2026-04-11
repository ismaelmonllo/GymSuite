const mongoose = require('mongoose');

/**
 * Se generan automaticamente
 * Se crea con fecha y registrado_por vacio
 * Al confirmar se añade fecha y registrado_por
 */
const pagoSchema = new mongoose.Schema({
    cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    mes: {type:String, required: true},
    tipo_cuota: {type:String, required: true},
    importe: {type:Number, required: true},
    pendiente: {type:Boolean, required: true, default: false},
    fecha: {type:Date}, // Se añadira al confirmar el pago
    registrado_por: {type: mongoose.Schema.Types.ObjectId, ref: 'Usuario'}, // Se añadira al confirmar el pago
});

module.exports = mongoose.model('Pago', pagoSchema);