import AuditLog from '../models/AuditLogModel.js';

// Registrar un evento de seguridad de forma asíncrona sin bloquear la respuesta
// Los errores de escritura no se propagan: un fallo de audit nunca interrumpe el flujo normal
export const auditar = async (evento, req, datos = {}) => {
    try {
        await AuditLog.create({
            evento,
            usuario_id: req.usuario?.id ?? datos.usuario_id,
            correo:     datos.correo,
            // x-forwarded-for es el header real en Vercel serverless (proxy inverso)
            ip:         req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip,
            user_agent: req.headers['user-agent'],
            detalles:   datos,
        });
    } catch (e) {
        console.error('[audit] fallo al registrar evento:', e.message);
    }
};
