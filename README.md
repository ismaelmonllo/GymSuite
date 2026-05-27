# GymSuite

Aplicación web de gestión integral para gimnasios. Permite administrar clientes, registrar mediciones antropométricas y controlar las cuotas mensuales con generación automática de pagos.

> **Proyecto Intermodular** del Grado Superior **Desarrollo de Aplicaciones Web (DAW)**.
> Autor: **Ismael Monjas Llorente** · Curso 2025/2026.

---

## Tabla de contenidos

- [GymSuite](#gymsuite)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Contexto académico](#contexto-académico)
  - [Características principales](#características-principales)
  - [Roles de usuario](#roles-de-usuario)
  - [Stack tecnológico](#stack-tecnológico)
  - [Arquitectura](#arquitectura)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Puesta en marcha en local](#puesta-en-marcha-en-local)
    - [Requisitos previos](#requisitos-previos)
    - [1. Clonar el repo](#1-clonar-el-repo)
    - [2. Backend](#2-backend)
    - [3. Frontend](#3-frontend)
    - [4. Acceder](#4-acceder)
  - [Variables de entorno](#variables-de-entorno)
    - [Backend (`server/.env`)](#backend-serverenv)
    - [Frontend (`client/.env`)](#frontend-clientenv)
  - [Scripts disponibles](#scripts-disponibles)
    - [Backend (`server/`)](#backend-server)
    - [Frontend (`client/`)](#frontend-client)
    - [Documentación (`docs-site/`)](#documentación-docs-site)
  - [Despliegue](#despliegue)
  - [Documentación](#documentación)
  - [Seguridad](#seguridad)
  - [Tests](#tests)
  - [Convenciones de código](#convenciones-de-código)
  - [Licencia](#licencia)
  - [Autor](#autor)

---

## Contexto académico

GymSuite es el Proyecto Intermodular que integra los módulos cursados en 2º DAW:

- **Desarrollo Web en Entorno Servidor** → API REST con Node.js, Express y MongoDB.
- **Desarrollo Web en Entorno Cliente** → SPA en React + Vite.
- **Diseño de Interfaces Web** → UI responsive con Tailwind, paleta corporativa y componentes reutilizables.
- **Despliegue de Aplicaciones Web** → Despliegue serverless en Vercel + cron externo.

---

## Características principales

- Gestión de **clientes**, **entrenadores** y **administradores** con CRUD completo y baja lógica.
- **Mediciones antropométricas**: peso, altura, 10 perímetros, 4 pliegues, cálculo automático de **IMC** y **% de grasa** (fórmula Durnin-Womersley).
- **Gráfica de evolución** de mediciones agrupadas por zonas anatómicas (Recharts).
- **Cuotas y pagos**: tipos de cuota configurables, generación automática mensual de pagos vía cron externo, reparto exacto al céntimo.
- **Autenticación robusta**: JWT de acceso (15 min) + refresh token httpOnly (7 días) + 2FA por email con OTP de 6 dígitos.
- **Reseteo de contraseñas** por admin con email transaccional.
- **Estadísticas de negocio** para admin: ingresos, morosidad, evolución mensual.
- **Documentación OpenAPI** autogenerada con Swagger UI en dev.
- **Responsive** (móvil y escritorio) con dark mode por defecto.

---

## Roles de usuario

| Rol | Permisos |
|---|---|
| **Admin** | Gestiona entrenadores y otros admins, ve clientes, configura tipos de cuota, accede a estadísticas y dispara la generación de pagos. |
| **Entrenador** | Gestiona clientes (alta, datos, mediciones, pagos). |
| **Cliente** | Consulta su perfil, su historial de mediciones y su estado de pagos. |

---

## Stack tecnológico

**Frontend**
- React 19 + Vite 8
- Tailwind CSS 4
- React Router 7
- Axios (con interceptores de refresh)
- Recharts (gráficas)
- lucide-react (iconos)

**Backend**
- Node.js (ES Modules) + Express 4
- Mongoose 8 (MongoDB Atlas)
- JSON Web Tokens + bcrypt (`^5.1.1`, **no** 6.x)
- Nodemailer (Gmail con contraseña de aplicación)
- Helmet, CORS, express-mongo-sanitize, express-rate-limit
- Pino (logger estructurado)
- swagger-jsdoc + swagger-ui-express
- Vitest (tests)

**Infraestructura**
- Vercel (frontend y backend en proyectos separados)
- MongoDB Atlas
- cron-job.org (disparador mensual de generación de pagos)

**Documentación**
- Docusaurus 3 (sitio navegable en `docs-site/`)

---

## Arquitectura

Diagrama de alto nivel:

```
┌─────────────────┐        HTTPS         ┌────────────────────┐
│  Navegador SPA  │ ───────────────────► │  Vercel · Frontend │
│  React + Vite   │                      │  client/ (Vite)    │
└─────────────────┘                      └────────────────────┘
        │ axios (withCredentials)                  │
        │ Authorization: Bearer <JWT>              │ build
        ▼                                          ▼
┌─────────────────────────────────────────────────────────┐
│           Vercel · Backend (server/api/index.js)        │
│   Express + Helmet + CORS + Sanitize + Rate-limit       │
│   ┌──────────┬──────────┬──────────┬──────────┐         │
│   │ /auth    │ /clientes│ /pagos   │ /stats   │  ...    │
│   └──────────┴──────────┴──────────┴──────────┘         │
└─────────────────────────────────────────────────────────┘
        │                                          │
        ▼                                          ▼
┌────────────────────┐                  ┌─────────────────────┐
│  MongoDB Atlas     │                  │  cron-job.org       │
│  Usuarios, Pagos,  │                  │  POST /pagos/       │
│  Mediciones, OTPs  │                  │   generar-cron      │
└────────────────────┘                  └─────────────────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │  Gmail SMTP         │
                                        │  (Nodemailer · OTP, │
                                        │   contraseñas temp) │
                                        └─────────────────────┘
```

---

## Estructura del proyecto

```
GymSuite/
├── client/                 # Frontend React + Vite + Tailwind
│   ├── public/
│   ├── src/
│   │   ├── assets/         # Imágenes estáticas
│   │   ├── components/     # Componentes UI por dominio (auth, dashboard, layout, modals, ui)
│   │   ├── context/        # AuthContext (sesión global)
│   │   ├── hooks/          # useAuth
│   │   ├── pages/          # LoginPage + 3 dashboards (admin, entrenador, cliente)
│   │   ├── services/       # api.js (axios + interceptores de refresh)
│   │   ├── utils/          # Helpers de medición y composición corporal
│   │   ├── App.jsx         # Router con rutas protegidas por rol
│   │   ├── styles.js       # Tokens de color y clases Tailwind reutilizables
│   │   └── utils.js        # Formato de fechas e importes (céntimos ↔ euros)
│   ├── vite.config.js      # Proxy /api → localhost:5000 en dev
│   └── vercel.json         # Rewrite SPA para React Router
├── server/                 # Backend Node + Express + Mongoose
│   ├── api/index.js        # Entry point serverless (middlewares + montaje de rutas)
│   ├── config/             # db.js (conexión Mongo con fallback), swagger.js
│   ├── controllers/        # auth, usuarios, mediciones, pagos, cuotas
│   ├── middleware/         # auth.js, asyncHandler, errorHandler
│   ├── models/             # Usuario, Medicion, Pago, TipoCuota, Otp, AuditLog
│   ├── routes/             # Rutas Express con doc Swagger
│   ├── utils/              # mailer, passwords, fechas, logger, audit
│   ├── validators/         # validarCampos.js + validarRegistros.js
│   ├── __tests__/          # Vitest (40 tests)
│   ├── scripts/            # Scripts auxiliares de mantenimiento
│   └── seed-primer-admin.js # Bootstrap idempotente del primer admin
├── docs-site/              # Documentación pública en Docusaurus 3
│   ├── docs/               # Contenido MDX (arquitectura, backend, frontend, …)
│   ├── docusaurus.config.js
│   └── sidebars.js
├── vercel.json             # Config despliegue backend
├── vercel.front.json       # Config despliegue frontend
├── LICENSE                 # MIT
└── README.md               # Este archivo
```

---

## Puesta en marcha en local

### Requisitos previos

- **Node.js** 20 o superior
- **npm** 10 o superior
- Cuenta gratuita en **MongoDB Atlas** (o Mongo local en `mongodb://localhost:27017`)
- Cuenta Gmail con **2FA activado** y **contraseña de aplicación** generada en https://myaccount.google.com/apppasswords (solo si quieres probar el 2FA real; en dev se puede saltar con `DISABLE_2FA=true`)

### 1. Clonar el repo

```bash
git clone https://github.com/ismaelmonllo/gymsuite.git
cd gymsuite/GymSuite
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env       # rellenar valores (ver siguiente sección)
npm run dev                # nodemon api/index.js → http://localhost:5000
```

En el primer arranque, `seed-primer-admin.js` crea automáticamente el primer admin si la BD está vacía (idempotente). Debes poner tu correo y datos

### 3. Frontend

En otra terminal:

```bash
cd client
npm install
npm run dev                # → http://localhost:5173
```

El proxy de Vite redirige `/api` a `localhost:5000`, así que no hace falta `VITE_API_URL` en local.

### 4. Acceder

Abrir http://localhost:5173 y entrar con las credenciales que crea `seed-primer-admin.js`:

- Correo: El que pongas en el seed
- Contraseña: `Admin1234` (se fuerza cambio en el primer login)

---

## Variables de entorno

### Backend (`server/.env`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `MONGODB_URI` | Sí | URI principal de MongoDB Atlas. |
| `MONGODB_URI_BACKUP` | Recomendada | URI de respaldo si la principal falla. |
| `JWT_SECRET` | Sí | Secret para firmar tokens de acceso (15 min). |
| `JWT_REFRESH_SECRET` | Sí | Secret **distinto** al anterior para refresh tokens (7 días). |
| `CRON_SECRET` | Sí | Header `x-cron-secret` para validar al disparador externo. |
| `FRONTEND_URL` | Sí en prod | URL exacta del frontend. Si falta en producción, la app aborta al arrancar (fail-closed CORS). |
| `EMAIL_USER` | Sí | Cuenta Gmail emisora. |
| `EMAIL_PASS` | Sí | **Contraseña de aplicación** de Google (16 chars). |
| `NODE_ENV` | Solo prod | `production` habilita `SameSite=none + Secure` en cookies. |
| `DISABLE_2FA` | No | `'true'` salta el OTP en dev. **No usar en prod.** |
| `PORT` | No | Solo dev (en Vercel es serverless). |
| `BCRYPT_ROUNDS` | No (default 12) | Rondas de bcrypt. |
| `LOG_LEVEL` | No (default info) | Nivel de pino. |

Hay un `server/.env.example` con la plantilla lista para copiar.

### Frontend (`client/.env`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_API_URL` | Sí en prod | URL base del backend. Vacío en dev (usa proxy de Vite). |

---

## Scripts disponibles

### Backend (`server/`)

```bash
npm run dev          # nodemon api/index.js
npm start            # node api/index.js
npm test             # vitest run
npm run test:watch   # vitest interactivo
node seed-primer-admin.js   # crear primer admin si la BD está vacía (idempotente)
```

### Frontend (`client/`)

```bash
npm run dev          # vite (HMR en :5173)
npm run build        # build de producción → dist/
npm run preview      # servir dist/ localmente
npm run lint         # ESLint
```

### Documentación (`docs-site/`)

```bash
npm install
npm start            # Docusaurus dev → http://localhost:3000
npm run build        # build estático → build/
```

---

## Despliegue

Frontend y backend se despliegan como **dos proyectos separados** en **Vercel**.

| Proyecto | Root Directory | Build command | Output |
|---|---|---|---|
| Backend | `GymSuite` | `cd server && npm install && node seed-primer-admin.js` | Función serverless (`server/api/index.js`) |
| Frontend | `GymSuite/client` | `npm run build` | `dist/` |
| Docs | `GymSuite/docs-site` | `npm run build` | `build/` |

La **generación mensual de pagos** se hace con [cron-job.org](https://cron-job.org) llamando a `POST /api/pagos/generar-cron` el día 1 de cada mes con el header `x-cron-secret`.

Checklist mínimo antes de hacer push a `main`:

- [ ] `NODE_ENV=production` en Vercel backend.
- [ ] `FRONTEND_URL` apunta al dominio correcto del frontend.
- [ ] `VITE_API_URL` apunta al dominio correcto del backend.
- [ ] `DISABLE_2FA` **no** está setado o es distinto de `'true'`.
- [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` son distintos entre sí y aleatorios (mín. 32 chars).
- [ ] `CRON_SECRET` configurado en cron-job.org igual que en Vercel.
- [ ] Contraseña de aplicación de Gmail válida en `EMAIL_PASS`.
- [ ] Login completo (con 2FA por email) funciona end-to-end.

---

## Documentación

La documentación pública vive en [`docs-site/`](docs-site/) y está construida con **Docusaurus 3**. Cubre arquitectura, backend, frontend, seguridad, operaciones y referencia de la API.

Levantar el sitio en local:

```bash
cd docs-site
npm install
npm start            # → http://localhost:3000
```

**API REST en runtime**: en dev, Swagger UI está disponible en `http://localhost:5000/api/docs` (autogenerada con `swagger-jsdoc` a partir de los comentarios en las rutas). En producción se desactiva por seguridad.

---

## Seguridad

- **Contraseñas** hasheadas con `bcrypt` (12 rondas por defecto). Política: mínimo 12 caracteres, mayúscula, minúscula, número y símbolo.
- **Tokens**: JWT de acceso de 15 min + refresh token httpOnly de 7 días + cookie firmada `2fa_verificado` ligada a `id_usuario + hash(User-Agent)`.
- **2FA** obligatorio por email (OTP de 6 dígitos con expiración TTL en Mongo).
- **CORS** fail-closed en producción (sin `FRONTEND_URL` la app aborta).
- **Helmet** con CSP estricta en prod.
- **express-mongo-sanitize** contra NoSQL injection y prototype pollution.
- **express-rate-limit** en endpoints sensibles (login, refresh).
- **AuditLog** de eventos críticos (logins fallidos, cambios de contraseña, generación de pagos).
- **Comparación de secrets** con `crypto.timingSafeEqual` (cron secret).

> ⚠️ **DNI y teléfono mockeados** en `server/validators/validarCampos.js` (divisor `% 19` y prefijo `5`) para usar datos de prueba sin cumplir el algoritmo oficial. Volver a producción real es cambiar el divisor a `% 23` y aceptar prefijos `6/7/8/9`.

---

## Tests

```bash
cd server
npm test
```

Cobertura actual con **Vitest**:

- `validadores.test.js` — 34 tests sobre validadores de campos (DNI, teléfono, email, contraseña, fechas, importes…).
- `pagos.test.js` — 6 tests sobre helpers de fechas y reparto exacto de importes al céntimo.

---

## Convenciones de código

- **Idioma:** todo en español (variables, comentarios, commits).
- **Comentarios:** JSDoc encima de cada función + comentarios de línea (`//`) en cada bloque interno, en **infinitivo** (`Buscar`, `Generar`, `Comparar`).
- **Importes monetarios:** siempre **enteros en céntimos** en BD y API. Conversión a euros solo en la capa de presentación (`client/src/utils.js`).
- **Backend en ES Modules:** `import`/`export`, nunca `require`. Dependencias que leen `process.env` se instancian **dentro de la función** que las usa, no a nivel de módulo.
- **Mongoose:** `find()` siempre devuelve array (comprobar `.length === 0`); `findById*` devuelve `null` si no existe.
- **Commits en español, primera persona del singular** (`Implemento`, `Añado`, `Corrijo`).
- **Nombres descriptivos** en funciones flecha (`usuario`, `cliente`, `pago`); evitar letras sueltas salvo `e` en handlers DOM.

---

## Licencia

Distribuido bajo **Licencia MIT**. Ver [`LICENSE`](LICENSE) para los términos completos.

---

## Autor

**Ismael Monjas Llorente**

- 2º DAW · Curso 2025/2026
- Proyecto Intermodular
- Email: ismael.monllo@educa.jcyl.es
- GitHub: [@ismaelmonllo](https://github.com/ismaelmonllo)

---

> Si encuentras un bug o tienes una sugerencia, abre un **issue** o un **pull request** en GitHub.
