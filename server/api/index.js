// Punto de entrada principal del servidor Express
// Configura middlewares, rutas y arranca la conexión con la base de datos
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import conectarDB from '../config/db.js';
import swaggerSpec from '../config/swagger.js';

// Importar todas las rutas de la API
import authRoutes from '../routes/authRoutes.js';
import clientesRoutes from '../routes/clientesRoutes.js';
import entrenadoresRoutes from '../routes/entrenadoresRoutes.js';
import administradoresRoutes from '../routes/administradoresRoutes.js';
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
app.use('/api/administradores', administradoresRoutes);
app.use('/api/mediciones', medicionesRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/cuotas', cuotasRoutes);

// Comprobar el estado del servidor y de la conexión con la base de datos
app.get('/api/health', (_req, res) => {
  // Traducir el código numérico de readyState a texto legible
  const estadoTexto = { 0: 'desconectada', 1: 'conectada', 2: 'conectando', 3: 'desconectando' };

  const dbEstado = mongoose.connection.readyState;
  // Solo el estado 1 significa conexión activa y lista
  const dbOk = dbEstado === 1;

  // Devolver 200 si la BD está lista, 503 si no lo está
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'error',
    servidor: 'funcionando',
    base_de_datos: estadoTexto[dbEstado] ?? 'desconectada',
  });
});

// Servir el spec JSON en /api/docs/spec (lo consume la UI)
app.get('/api/docs/spec', (_req, res) => res.json(swaggerSpec));

// Servir la UI de Swagger cargando assets desde CDN (compatible con Vercel serverless)
app.get('/api/docs', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>GymSuite API Docs</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
      body { background: #1a1a1a; }
      .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
      .swagger-ui .microlight,
      .swagger-ui code,
      .swagger-ui pre { filter: invert(100%) hue-rotate(180deg); }
      .swagger-ui img { filter: invert(100%) hue-rotate(180deg); }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/api/docs/spec',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout'
      });
    </script>
  </body>
</html>`);
});

// Arrancar el servidor solo en local (en Vercel se importa `app` directamente como función serverless)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
}

export default app;
