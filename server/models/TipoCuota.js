import mongoose from 'mongoose';

const tipoCuotaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    meses: { type: Number, required: true },
    importe: { type: Number, required: true },
});

export default mongoose.model('TipoCuota', tipoCuotaSchema);
