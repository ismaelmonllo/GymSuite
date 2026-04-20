import mongoose from 'mongoose';

// Conectar a MongoDB usando la URI del .env
// Si la principal falla, intentar con la URI de respaldo como alternativa
const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado');
  } catch {
    console.log('URI principal fallida, probando URI de respaldo...');
    try {
      await mongoose.connect(process.env.MONGODB_URI_BACKUP);
      console.log('MongoDB conectado con URI de respaldo');
    } catch (err) {
      // Registrar el error y detener el servidor si ambas URIs fallan
      console.error('Ambas URIs fallaron:', err);
      process.exit(1);
    }
  }
};

export default conectarDB;
