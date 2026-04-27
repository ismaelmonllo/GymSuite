import nodemailer from 'nodemailer';

// Enviar email transaccional; recibe destinatario, asunto y cuerpo HTML
// Crear el transporter aquí (no a nivel de módulo) para leer las variables de entorno
// después de que dotenv.config() haya ejecutado
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
