// Script de desarrollo — genera los 4 templates de email como archivos HTML y los abre en el navegador
// Ejecutar desde la carpeta server: node preview-emails.js
import { writeFileSync, mkdirSync } from 'fs';
import { exec } from 'child_process';
import { emailTemplate, escaparHtml } from './utils/mailer.js';

const OUT_DIR = '.email-preview';
mkdirSync(OUT_DIR, { recursive: true });

const emails = [
    {
        nombre: 'otp',
        html: emailTemplate('Código de verificación', `
            <p style="margin:0 0 20px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Introduce este código para completar tu inicio de sesión:
            </p>
            <div style="background-color:#1A1A1A;border:2px solid #E5702A;border-radius:8px;padding:20px;text-align:center;margin:0 0 20px 0;">
                <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#F09540;font-family:monospace;">847293</span>
            </div>
            <p style="margin:0;color:#888;font-size:13px;">Caduca en 5 minutos. Si no iniciaste sesión, ignora este correo.</p>
        `),
    },
    {
        nombre: 'reset-password',
        html: emailTemplate('Restablece tu contraseña', `
            <p style="margin:0 0 16px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Hola, <strong style="color:#F09540;">${escaparHtml('Ismael')}</strong>.
            </p>
            <p style="margin:0 0 24px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Un administrador ha solicitado el restablecimiento de tu contraseña en GymSuite.
                Haz clic en el botón para establecer una nueva (caduca en 30 minutos):
            </p>
            <div style="text-align:center;margin:0 0 24px 0;">
                <a href="#" style="display:inline-block;background-color:#E5702A;color:#1A1A1A;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:6px;">
                    Restablecer contraseña
                </a>
            </div>
            <p style="margin:0;color:#888;font-size:13px;">
                Si el botón no funciona, copia este enlace en tu navegador:<br>
                <a href="#" style="color:#F09540;word-break:break-all;">https://gymsuite.vercel.app/restablecer/abc123token</a>
            </p>
            <p style="margin:16px 0 0 0;color:#888;font-size:13px;">Si no esperabas este correo, ignóralo — tu contraseña actual no ha cambiado.</p>
        `),
    },
    {
        nombre: 'bienvenida-cliente',
        html: emailTemplate('¡Bienvenido/a a GymSuite!', `
            <p style="margin:0 0 16px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Hola, <strong style="color:#F09540;">${escaparHtml('María García')}</strong>.
            </p>
            <p style="margin:0 0 20px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Tu cuenta ha sido creada. Inicia sesión con tu correo y esta contraseña temporal:
            </p>
            <div style="background-color:#1A1A1A;border:2px solid #E5702A;border-radius:8px;padding:16px;text-align:center;margin:0 0 20px 0;">
                <span style="font-size:22px;font-weight:bold;letter-spacing:4px;color:#F09540;font-family:monospace;">Kx7$mP2q</span>
            </div>
            <p style="margin:0;color:#888;font-size:13px;">Por seguridad, deberás cambiarla nada más iniciar sesión.</p>
        `),
    },
    {
        nombre: 'bienvenida-empleado',
        html: emailTemplate('¡Bienvenido/a a GymSuite!', `
            <p style="margin:0 0 16px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Hola, <strong style="color:#F09540;">${escaparHtml('Carlos Entrenador')}</strong>.
            </p>
            <p style="margin:0 0 20px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Tu cuenta ha sido creada. Inicia sesión con tu correo y esta contraseña temporal:
            </p>
            <div style="background-color:#1A1A1A;border:2px solid #E5702A;border-radius:8px;padding:16px;text-align:center;margin:0 0 20px 0;">
                <span style="font-size:22px;font-weight:bold;letter-spacing:4px;color:#F09540;font-family:monospace;">Np4&vR8j</span>
            </div>
            <p style="margin:0;color:#888;font-size:13px;">Por seguridad, deberás cambiarla nada más iniciar sesión.</p>
        `),
    },
];

emails.forEach(({ nombre, html }) => {
    const ruta = `${OUT_DIR}/${nombre}.html`;
    writeFileSync(ruta, html, 'utf-8');
    console.log(`Generado: ${ruta}`);
    exec(`start "" "${ruta}"`);
});
