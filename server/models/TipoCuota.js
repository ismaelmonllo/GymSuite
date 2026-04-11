const mongoose = require('mongoose');

const tipoCuotaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    meses: { type: Number, required: true },
    importe: { type: Number, required: true },
});

module.exports = mongoose.model('TipoCuota', tipoCuotaSchema);