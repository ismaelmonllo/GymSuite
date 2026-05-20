import mongoose from 'mongoose';

// Registrar eventos de seguridad para detección e investigación de incidentes
// Los registros expiran automáticamente a los 90 días para no saturar Atlas free tier
const auditLogSchema = new mongoose.Schema({
    timestamp:  { type: Date, default: Date.now, index: true, expires: 90 * 24 * 60 * 60 },
    evento:     { type: String, required: true, index: true },
    usuario_id: { type: mongoose.Schema.Types.ObjectId, index: true },
    correo:     { type: String },
    ip:         { type: String },
    user_agent: { type: String },
    detalles:   { type: mongoose.Schema.Types.Mixed },
});

export default mongoose.model('AuditLog', auditLogSchema);
