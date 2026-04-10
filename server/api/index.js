// Importamos las herramientas que necesita el servidor
const express = require('express');   // Express: el framework que gestiona las peticiones web
const cors = require('cors');         // CORS: permite que el frontend se comunique con el backend
const mongoose = require('mongoose'); // Mongoose: nos facilita trabajar con la base de datos MongoDB
require('dotenv').config({ path: '../.env' }); // Carga las variables secretas del archivo .env (contraseñas, URLs, etc.)

// Importamos los archivos de rutas, cada uno se encarga de una parte de la app
const authRoutes = require('../routes/auth');               // Rutas de inicio/cierre de sesión
const clientesRoutes = require('../routes/clientes');       // Rutas para gestionar clientes
const entrenadoresRoutes = require('../routes/entrenadores'); // Rutas para gestionar entrenadores
const medicionesRoutes = require('../routes/mediciones');   // Rutas para gestionar mediciones
const pagosRoutes = require('../routes/pagos');             // Rutas para gestionar pagos
const cuotasRoutes = require('../routes/cuotas');           // Rutas para gestionar cuotas

// Creamos la aplicación del servidor
const app = express();

// Configuración general
app.use(cors());           // Permitimos que el frontend (en otro dominio) pueda hacer peticiones aquí
app.use(express.json());   // Permitimos que el servidor entienda datos en formato JSON

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

conectarDB();

// Registramos las rutas: cuando alguien visite estas direcciones, se usará el archivo correspondiente
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/entrenadores', entrenadoresRoutes);
app.use('/api/mediciones', medicionesRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/cuotas', cuotasRoutes);

// Ruta de prueba para comprobar que el servidor está encendido y funcionando
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Servidor funcionando' });
});

// Exportamos la app para que pueda usarse desde fuera (por ejemplo, en Vercel)
module.exports = app;
