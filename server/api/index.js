// Punto de entrada principal del servidor Express
// Configura middlewares, rutas y arranca la conexión con la base de datos
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import conectarDB from '../config/db.js';
import swaggerSpec from '../config/swagger.js';
import { errorHandler } from '../middleware/errorHandler.js';

// Importar todas las rutas de la API
import authRoutes from '../routes/authRoutes.js';
import clientesRoutes from '../routes/clientesRoutes.js';
import entrenadoresRoutes from '../routes/entrenadoresRoutes.js';
import administradoresRoutes from '../routes/administradoresRoutes.js';
import medicionesRoutes from '../routes/medicionesRoutes.js';
import pagosRoutes from '../routes/pagosRoutes.js';
import cuotasRoutes from '../routes/cuotasRoutes.js';
import statsRoutes from '../routes/statsRoutes.js';

const app = express();

// Headers de seguridad HTTP: clickjacking, MIME sniffing, HSTS, Referrer-Policy, etc.
// En prod la CSP no necesita abrir unpkg porque los endpoints de Swagger no existen
const esProd = process.env.NODE_ENV === 'production';
const scriptSrc = esProd ? ["'self'"] : ["'self'", "'unsafe-inline'", 'https://unpkg.com'];
const styleSrc  = esProd ? ["'self'"] : ["'self'", "'unsafe-inline'", 'https://unpkg.com'];
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc,
            styleSrc,
            imgSrc:     ["'self'", 'data:'],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: false },
}));

// Permitir peticiones solo desde el frontend (variable de entorno en prod, localhost en dev)
// En producción, FRONTEND_URL es obligatoria: si falta, abortar antes de aceptar peticiones para
// evitar que un fallo de configuración deje un CORS abierto con credentials (robo de sesión cross-site)
const frontendUrl = process.env.FRONTEND_URL;
if (process.env.NODE_ENV === 'production' && !frontendUrl) {
  throw new Error('FRONTEND_URL es obligatoria en producción');
}
const origenesPermitidos = frontendUrl
  ? [frontendUrl]
  : ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({ origin: origenesPermitidos, credentials: true }));
app.use(cookieParser());
app.use(express.json());
// Eliminar $ y . de keys en req.body/req.query/req.params: bloquea NoSQL injection y prototype pollution
app.use(mongoSanitize({ replaceWith: '_' }));

// Rate limit global: tope amplio por IP para amortiguar ráfagas y escaneos automatizados
// En Vercel serverless el store en memoria solo cubre el ciclo de vida de la función; aún así
// frena las ráfagas durante un cold-warm. Para mayor robustez, mover a Redis (Upstash).
const limiteGlobal = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiteGlobal);

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
app.use('/api/stats', statsRoutes);

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

// Documentación solo disponible fuera de producción: en prod estos endpoints no existen
// Evita exponer la superficie completa de la API a un atacante
if (process.env.NODE_ENV !== 'production') {

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
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.32.4/swagger-ui.css"
          integrity="sha384-AHNbXeU7DPcgcihnwKYc3FOT0hTfhEwVFc2JRxxF5S/mplUdt/7G1g6nIblzENrX"
          crossorigin="anonymous">
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
    <script src="https://unpkg.com/swagger-ui-dist@5.32.4/swagger-ui-bundle.js"
            integrity="sha384-FgJpbEfGqpFeiFJh0+HNvyohx84XMd+IwgPyxJxjuDFMHVYmoFqrDEJNrVFexwA0"
            crossorigin="anonymous"></script>
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

}

// Middleware de error centralizado: captura cualquier error no manejado en controllers o middlewares
app.use(errorHandler);

// Arrancar el servidor solo en local (en Vercel se importa `app` directamente como función serverless)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
}

export default app;
