import AuditLog from '../models/AuditLogModel.js';

/**
 * Registrar un evento de seguridad en la colección `audit_logs` sin bloquear
 * la respuesta. Los errores de escritura se capturan internamente: un fallo
 * de audit nunca debe interrumpir el flujo normal de la petición.
 * @param {string} evento - Identificador del evento (`login_ok`, `2fa_fail`, etc.).
 * @param {import('express').Request} req - Para extraer usuario, IP y user-agent.
 * @param {object} [datos={}] - Datos adicionales del evento (correo, contexto…).
 * @returns {Promise<void>}
 */
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
