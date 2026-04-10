// Importamos las herramientas que necesita el servidor
const express = require('express');   // Express: el framework que gestiona las peticiones web
const cors = require('cors');         // CORS: permite que el frontend se comunique con el backend
require('dotenv').config(); // Carga las variables secretas del archivo .env (contraseñas, URLs, etc.)
const conectarDB = require('../config/db'); // Función que establece la conexión con MongoDB

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

// Conectamos con la base de datos antes de registrar las rutas
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

// En local arrancamos el servidor en el puerto 5000.
// En Vercel esto no se ejecuta: Vercel importa directamente el app exportado abajo.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
}

// Exportamos la app para que pueda usarse desde fuera (por ejemplo, en Vercel)
module.exports = app;
