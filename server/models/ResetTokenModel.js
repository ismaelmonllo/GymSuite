import mongoose from 'mongoose';

// Token de un solo uso para restablecer contraseña por link
// El índice TTL borra el documento automáticamente cuando pasa 'expira'
const resetTokenSchema = new mongoose.Schema({
    usuario_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    token:      { type: String, required: true, unique: true },
    expira:     { type: Date, required: true, expires: 0 },
});

export default mongoose.model('ResetToken', resetTokenSchema);
