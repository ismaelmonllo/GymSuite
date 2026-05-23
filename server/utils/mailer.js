import nodemailer from 'nodemailer';

/**
 * Escapar caracteres HTML peligrosos para evitar XSS al interpolar campos
 * de usuario en plantillas HTML de email. Necesario porque los clientes de
 * correo que renderizan HTML ejecutarían scripts inyectados.
 * @param {string|null|undefined} txt - Texto a escapar (se convierte a string).
 * @returns {string} Texto con `& < > " '` reemplazados por sus entidades HTML.
 */
export const escaparHtml = (txt) => String(txt ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Envolver un contenido HTML en la plantilla visual de GymSuite con la paleta
 * de colores de la web. Usa tablas e inline styles para compatibilidad máxima
 * con los clientes de correo (Gmail, Outlook, Apple Mail…).
 * @param {string} titulo - Título mostrado en la cabecera del cuerpo.
 * @param {string} contenido - HTML del cuerpo del mensaje (ya escapado si aplica).
 * @returns {string} HTML completo del email listo para enviar.
 */
export const emailTemplate = (titulo, contenido) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#1A1A1A;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Cabecera naranja -->
          <tr>
            <td style="background-color:#E5702A;border-radius:8px 8px 0 0;padding:28px 32px;text-align:center;">
              <span style="font-size:26px;font-weight:bold;color:#1A1A1A;letter-spacing:2px;">GymSuite</span>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="background-color:#2D2D2D;padding:32px;border-radius:0 0 8px 8px;">
              <h2 style="margin:0 0 20px 0;font-size:20px;color:#F09540;font-weight:600;">${titulo}</h2>
              ${contenido}
              <p style="margin:28px 0 0 0;font-size:12px;color:#888;border-top:1px solid #3D3D3D;padding-top:16px;">
                Este es un mensaje automático de GymSuite. No respondas a este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Enviar un email transaccional vía Nodemailer + Gmail. El transporter se
 * crea dentro de la función (no a nivel de módulo) para garantizar que las
 * variables de entorno ya están cargadas por `dotenv.config()` cuando se usan.
 * @param {object} opciones
 * @param {string} opciones.to - Destinatario.
 * @param {string} opciones.subject - Asunto del correo.
 * @param {string} opciones.html - Cuerpo HTML del correo.
 * @returns {Promise<void>}
 */
export const sendMail = async ({ to, subject, html }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"GymSuite" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    });
};
