---
title: Estructura del backend
sidebar_position: 1
description: Árbol de server/ con el propósito de cada carpeta y archivo.
tags: [backend, estructura]
---

```
server/
├── api/
│   └── index.js              # Entry point Vercel serverless
├── config/
│   ├── db.js                 # Conexión Mongo (con URI fallback)
│   └── swagger.js            # Config swagger-jsdoc
├── controllers/
│   ├── authController.js     # Auth: login, 2FA, refresh, reset
│   ├── usuarioController.js  # CRUD usuarios + stats
│   ├── medicionController.js # CRUD mediciones
│   ├── pagosController.js    # Pagos + cron + stats
│   └── cuotaController.js    # CRUD tipos de cuota
├── middleware/
│   └── auth.js               # verificarToken, verificarRol…
├── models/
│   ├── UsuarioModel.js
│   ├── MedicionModel.js
│   ├── PagoModel.js
│   ├── TipoCuotaModel.js
│   └── OtpModel.js
├── routes/
│   ├── authRoutes.js
│   ├── clientesRoutes.js
│   ├── entrenadoresRoutes.js
│   ├── administradoresRoutes.js
│   ├── medicionesRoutes.js
│   ├── pagosRoutes.js
│   ├── cuotasRoutes.js
│   └── statsRoutes.js
├── utils/
│   ├── audit.js              # auditar(evento, req, datos) — registra eventos de seguridad en AuditLog
│   ├── mailer.js             # sendMail + escaparHtml (Nodemailer + Gmail)
│   └── passwords.js          # generarPasswordTemporal (CSPRNG)
├── validators/
│   ├── validarCampos.js      # Atómicos por campo
│   └── validarRegistros.js   # Compuestos por operación
├── seed.js                   # Poblar BD inicial
└── .env.example
```

## Capa por capa

### `api/index.js` — Entry point

Único archivo que se exporta como handler Vercel. Pasos en orden:

1. `dotenv.config()` — antes de imports que leen `process.env`.
2. Middlewares globales: `cors` (origen `FRONTEND_URL`), `cookieParser`, `express.json`.
3. `conectarDB()` (`config/db.js`).
4. Monta routers bajo `/api/{auth,clientes,entrenadores,administradores,mediciones,pagos,cuotas,stats}`.
5. Endpoints utilitarios: `/api/health`, `/api/docs/spec`, `/api/docs`.
6. `app.listen()` **solo** si `NODE_ENV !== 'production'`. En Vercel se importa `app` como función serverless.

### `config/`

| Archivo | Función |
|---------|---------|
| `db.js` | `conectarDB()` con fallback. Si `MONGODB_URI` falla, prueba `MONGODB_URI_BACKUP`. Si ambas, `process.exit(1)` |
| `swagger.js` | Config `swagger-jsdoc` para generar OpenAPI desde comentarios `@swagger` en routes |

### `controllers/`

Lógica de negocio. Cada función:
- Recibe `(req, res)`.
- Valida con un validador de `validators/`.
- Llama al modelo Mongoose.
- Responde con `res.status(N).json(...)`.

Detalle por dominio:
- [Auth flujo](./auth-flujo.md)
- [Pagos lógica](./pagos-logica.md)
- [Mediciones cálculo](./mediciones-calculo.md)

### `middleware/auth.js`

Pipeline de autorización. Ver tabla en [Modelo de roles](../arquitectura/modelo-roles.md#middlewares-de-autorizacion).

### `models/`

Schemas Mongoose. Detalle de campos: [Modelos](./modelos.md).

### `routes/`

Definición de Express Routers con comentarios `@swagger` para la doc OpenAPI. Cada ruta concatena: ruta + middlewares + controller.

Ejemplo (`pagosRoutes.js`):
```js
router.post('/generar-cron', verificarCronSecret, generarPagos);
```

### `utils/`

| Archivo | Función |
|---------|---------|
| `audit.js` | `auditar(evento, req, datos)`. Escribe en `AuditLog` sin lanzar — fallo de audit no interrumpe el flujo |
| `mailer.js` | `sendMail({ to, subject, html })` + `escaparHtml(txt)`. Transporter Nodemailer **dentro de la función** (gotcha ESM) |
| `passwords.js` | `generarPasswordTemporal()` con `crypto.randomInt` (sin sesgo de módulo), 12 chars garantizando 1 min/may/num/símb |

### `validators/`

| Archivo | Estilo de retorno |
|---------|-------------------|
| `validarCampos.js` | `{ valido, error }` — atómico por campo |
| `validarRegistros.js` | `{ valido, errores: [{ campo, error }] }` — compuesto por entidad |

Detalle: [Validadores](./validadores.md).

## Convenciones del backend

- **ES modules** (`import`/`export`). `package.json` con `"type": "module"`. Ver [ADR-003](../arquitectura/decisiones.md#esm).
- **Comentarios en español, infinitivo** (`Buscar`, `Comparar`).
- **Importes en céntimos** (enteros). Ver [ADR-002](../arquitectura/decisiones.md#centimos).
- **Errores con `{ mensaje }` o `{ errores: [{ campo, error }] }`**. Ver [Errores del backend](./errores.md).
- **No usar `findAll`** (eso es Sequelize). Métodos Mongoose: `find`, `findById`, `findByIdAndUpdate`, `findByIdAndDelete`, `save`. Ver [ADR-004](../arquitectura/decisiones.md#consultas-mongoose).
