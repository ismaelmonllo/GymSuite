import mongoose from 'mongoose';

// Conexión a la base de datos MongoDB usando las URLs guardadas en el archivo .env
// Si la URI principal falla, intenta conectar con la URI de respaldo
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
      // Si ambas URIs fallan, se muestra el error y se detiene el servidor
      console.error('Ambas URIs fallaron:', err);
      process.exit(1);
    }
  }
};

export default conectarDB;
