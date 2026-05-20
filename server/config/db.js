import mongoose from 'mongoose';

// Cachear la conexión entre invocaciones serverless de Vercel para evitar reconexiones en cada request
// process.exit(1) causaría que la función serverless aborte, dejando el pool en estado inconsistente
let conexionCache = null;

const conectarDB = async () => {
    if (conexionCache) return conexionCache;
    try {
        conexionCache = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('MongoDB conectado');
        return conexionCache;
    } catch {
        console.log('URI principal fallida, probando URI de respaldo...');
        conexionCache = await mongoose.connect(process.env.MONGODB_URI_BACKUP, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('MongoDB conectado con URI de respaldo');
        return conexionCache;
    }
};

export default conectarDB;
