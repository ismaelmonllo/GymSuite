// Punto de entrada principal del servidor Express
// Configura middlewares, rutas y arranca la conexión con la base de datos
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import conectarDB from '../config/db.js';

// Importar todas las rutas de la API
import authRoutes from '../routes/authRoutes.js';
import clientesRoutes from '../routes/clientesRoutes.js';
import entrenadoresRoutes from '../routes/entrenadoresRoutes.js';
import medicionesRoutes from '../routes/medicionesRoutes.js';
import pagosRoutes from '../routes/pagosRoutes.js';
import cuotasRoutes from '../routes/cuotasRoutes.js';

const app = express();

// Permitir peticiones desde cualquier origen y parsear el body como JSON
app.use(cors());
app.use(express.json());

// Conectar a MongoDB antes de empezar a atender peticiones
conectarDB();

// Registrar cada grupo de rutas bajo su prefijo correspondiente
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/entrenadores', entrenadoresRoutes);
app.use('/api/mediciones', medicionesRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/cuotas', cuotasRoutes);

// Comprobar el estado del servidor y de la conexión con la base de datos
app.get('/api/health', (_req, res) => {
  const dbEstado = mongoose.connection.readyState;
  // 0: desconectado, 1: conectado, 2: conectando, 3: desconectando
  const dbOk = dbEstado === 1;
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'error',
    servidor: 'funcionando',
    base_de_datos: dbOk ? 'conectada' : 'desconectada',
  });
});

// En local arrancamos el servidor en el puerto 5000.
// En Vercel esto no se ejecuta: Vercel importa directamente el app exportado abajo.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
}

export default app;
