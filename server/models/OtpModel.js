import mongoose from 'mongoose';

// Códigos OTP de 2FA almacenados en BD para sobrevivir a reinicios serverless de Vercel
// El índice TTL sobre `expira` hace que MongoDB elimine el documento automáticamente al caducar
const otpSchema = new mongoose.Schema({
  correo: { type: String, required: true, index: true },
  codigo: { type: String, required: true },
  expira: { type: Date, required: true, expires: 0 },
});

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
