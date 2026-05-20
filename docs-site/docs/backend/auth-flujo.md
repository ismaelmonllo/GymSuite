---
title: Flujo de autenticación
sidebar_position: 4
description: Login, 2FA, refresh y reset de contraseña paso a paso.
tags: [backend, auth, jwt, 2fa]
---

Sistema de auth completo: JWT acceso (15m) + refresh token (7d, httpOnly) + 2FA por email + cambio forzoso de contraseña.

Controller: `server/controllers/authController.js` — endpoints en [Endpoints → Auth](./endpoints/auth.md). Middlewares: `server/middleware/auth.js`.

## Helpers internos del controller

- `cookieOpciones` — `{ httpOnly, sameSite, secure, maxAge: 7 días }`. Cambia según `NODE_ENV`.
- `HASH_DUMMY` — `bcrypt.hashSync('dummy', 10)` evaluado al cargar el módulo. Se compara contra él cuando el correo no existe para igualar el tiempo de respuesta al de un correo válido.
- `generarOTP()` — 6 dígitos con `crypto.randomInt(100000, 1000000)` (CSPRNG, no `Math.random`).
- `emitirTokens(usuario, res)` — firma JWT acceso (15m) con payload `{ id, rol, nombre, apellidos, forzar_cambio_password }` (`JWT_SECRET`), firma refresh (7d, payload `{ id }`) con `JWT_REFRESH_SECRET`, setea cookie `refresh_token`, devuelve el JWT acceso.

## 1. Login con 2FA por email

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as /api/auth/login
  participant DB as MongoDB
  participant Mail as Gmail SMTP

  FE->>API: POST {correo, contrasena, tab}
  API->>API: validarLogin(...)
  API->>DB: Usuario.findOne({correo})
  DB-->>API: usuario | null
  API->>API: bcrypt.compare(contrasena, usuario?.contrasena ?? HASH_DUMMY)
  API->>API: si !usuario o no coincide → 401 Credenciales incorrectas
  API->>API: si !usuario.activo → 403 Cuenta deshabilitada
  alt DISABLE_2FA=true (dev)
    API->>API: emitirTokens
    API-->>FE: 200 {token} + Set-Cookie refresh_token
  else cookie 2fa_verificado válida (firma + UA OK)
    API->>API: emitirTokens
    API-->>FE: 200 {token} + Set-Cookie refresh_token
  else 2FA activo, dispositivo nuevo
    API->>API: validar tab vs rol
    API->>API: generarOTP
    API->>DB: Otp.findOneAndUpdate (upsert, expira +5min)
    API->>Mail: sendMail OTP
    API-->>FE: 200 {requiere2FA: true}
    FE->>API: POST /verificar-2fa {correo, codigo}
    API->>DB: Otp.findOne({correo})
    API->>API: si intentos >= 5 → Otp.deleteOne + 429
    API->>API: comprobar expira; si vence → deleteOne + 401
    API->>API: si codigo mal → Otp.$inc intentos + 401
    API->>DB: Otp.deleteOne (evitar reuso)
    API->>API: Set-Cookie 2fa_verificado firmada (7d, HMAC sobre id+UA)
    API->>API: emitirTokens
    API-->>FE: 200 {token}
  end
```

### Validación de pestaña

| Pestaña (`tab`) | Roles aceptados | 403 si no encaja |
|-----------------|-----------------|-------------------|
| `cliente` | `cliente` | "Esta cuenta no es de cliente. Usa la pestaña Trabajador." |
| `trabajador` | `admin`, `entrenador` | "Esta cuenta no es de trabajador. Usa la pestaña Cliente." |

## 2. Refresh

Renueva el JWT de acceso sin reloguear.

```mermaid
sequenceDiagram
  participant FE as axios interceptor
  participant API as /api/auth/refresh
  participant DB

  FE->>API: POST (cookie httpOnly refresh_token)
  API->>API: jwt.verify(refresh, JWT_REFRESH_SECRET)
  alt válido y usuario.activo
    API->>DB: User.findById(payload.id)
    DB-->>API: usuario
    API->>API: firmar nuevo JWT acceso (15m)
    API-->>FE: 200 {token}
  else inválido/expirado/sin cookie/usuario inactivo
    API-->>FE: 401
    FE->>FE: limpiarSesion + redirect /login
  end
```

> ℹ️ **Refresh no rota**
>
> La cookie `refresh_token` sigue viva hasta su expiración natural. Si quisieras rotación, llamar a `emitirTokens` en lugar de firmar directo. Trade-off: más seguro vs más writes a la cookie.

## 3. Cambio de contraseña (propia)

`PATCH /api/auth/cambiar-contrasena`.

```mermaid
sequenceDiagram
  participant FE as Modal
  participant API
  participant DB

  FE->>API: PATCH {contrasenaActual, contrasenaNueva}
  API->>API: validarCambioContrasenaPropio
  API->>DB: User.findById(req.usuario.id)
  API->>API: bcrypt.compare(actual, hash)
  alt OK
    API->>API: bcrypt.hash(nueva, 10)
    API->>DB: findByIdAndUpdate {contrasena, forzar_cambio_password: false}
    API->>API: emitirTokens (JWT sin la flag)
    API-->>FE: 200 {ok: true, token}
    FE->>FE: actualizarToken(token) → modal forzado se desmonta
  else mal
    API-->>FE: 401
  end
```

## 4. Reset por admin

`PATCH /api/auth/resetear-password/:id`. Solo admin.

```mermaid
sequenceDiagram
  participant Admin as Modal
  participant API
  participant DB
  participant Mail

  Admin->>API: PATCH /resetear-password/:id
  API->>DB: User.findById(id)
  API->>API: generarPasswordTemporal()
  API->>API: bcrypt.hash(temp, 10)
  API->>DB: findByIdAndUpdate {contrasena, forzar_cambio_password: true}
  API->>Mail: sendMail (HTML con password temp)
  API-->>Admin: 200 {ok: true}
```

El usuario afectado verá `ModalCambiarContrasena forzado` en su próximo login.

## 5. Logout

`POST /api/auth/logout`. Limpia cookie `refresh_token` con **mismas opciones** que al setearla (importante en prod: `sameSite: 'none', secure: true`).

```js
res.clearCookie('refresh_token', { httpOnly: true, sameSite, secure });
```

<a id="rate-limiting"></a>

## Rate limiting

`express-rate-limit` con store en memoria. Tres limitadores en cascada:

| Limitador | Ventana | Tope por IP | Aplicado a | Definido en |
|-----------|---------|-------------|------------|-------------|
| `limiteGlobal` | 15 min | 300 req | Todas las rutas (vía `app.use`) | `server/api/index.js` |
| `limiteAuth` | 15 min | 5 req | `POST /api/auth/login`, `POST /api/auth/verificar-2fa` (contador compartido entre ambas por instancia única) | `server/routes/authRoutes.js` |
| `limiteRefresh` | 15 min | 30 req | `POST /api/auth/refresh` | `server/routes/authRoutes.js` |

Respuestas al superar el tope: **429** con cabeceras estándar `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`. `limiteAuth` devuelve `{ mensaje: 'Demasiados intentos. Espera 15 minutos.' }`; el resto, el mensaje por defecto.

:::warning Vercel serverless
El store por defecto vive en memoria del proceso. Cada función serverless arranca su propio contador en cold start, así que el límite **no se comparte entre invocaciones**. Para garantía completa contra brute force distribuido: mover a Redis con `rate-limit-redis` (Upstash). Detalle: [Operaciones → Despliegue](../operaciones/despliegue.md).
:::

<a id="middlewares"></a>

## Middlewares

`server/middleware/auth.js`:

### `verificarToken(req, res, next)`

```
Extrae token de Authorization: Bearer
jwt.verify(token, JWT_SECRET)
req.usuario = decoded   // {id, rol, nombre, apellidos, forzar_cambio_password}
```

401 si falta o falla.

### `verificarRol(...roles)`

Factory. 403 si `req.usuario.rol` no en `roles`.

### `verificarPropioOAdmin(req, res, next)`

Admin pasa libre. Otro solo si `req.usuario.id === req.params.id`. Usado en `GET /api/entrenadores/:id`.

### `verificarRolBody(rolEsperado)`

Factory. Exige `req.body.rol === rolEsperado`. Evita crear admin vía `POST /api/entrenadores` y viceversa.

### `forzarRolQuery(rolEsperado)`

Factory. Sobrescribe `req.query.rol` antes del handler.

### `requiereCustomHeader(req, res, next)`

Exige `req.headers['x-requested-with'] === 'XMLHttpRequest'`. 403 si falta.

Aplicado a `POST /refresh` y `POST /logout`. Un formulario HTML o `fetch` simple de otro origen no puede añadir headers personalizados sin pasar por CORS preflight; el preflight es bloqueado por nuestra config CORS. Mitiga logout-CSRF y refresh-CSRF en entornos con `SameSite=none`.

El frontend lo incluye en todos los requests vía `headers: { 'X-Requested-With': 'XMLHttpRequest' }` en el axios instance y también en la llamada nativa de `/refresh` del interceptor.

### `verificarCronSecret(req, res, next)`

Lee `req.headers['x-cron-secret']` y compara con `process.env.CRON_SECRET` usando `crypto.timingSafeEqual` (comparación en tiempo constante, previene timing attacks). 401 si falta el header, falta la env var, longitudes distintas o valores no coinciden. **No requiere JWT** (cron-job.org no se autentica).

## Audit log

`server/utils/audit.js` expone `auditar(evento, req, datos)`. Escribe en la colección `AuditLog` sin lanzar excepciones: un fallo de escritura solo hace `console.error` y no interrumpe el flujo de la petición.

El modelo `AuditLogModel.js` tiene TTL de 90 días (`expires: 90*24*60*60` en el campo `timestamp`) — Atlas limpia los registros automáticamente.

| Evento | Cuándo |
|--------|--------|
| `login_ok` | Login exitoso (dispositivo de confianza o modo dev sin 2FA) |
| `login_fail` | Credenciales incorrectas |
| `2fa_ok` | OTP verificado |
| `2fa_fail` | OTP incorrecto, expirado o max intentos alcanzados |
| `password_change` | Usuario cambia su propia contraseña |
| `password_reset_admin` | Admin dispara reseteo por link |
| `crear_cliente` | Alta de cliente |
| `crear_entrenador` | Alta de entrenador |
| `crear_admin` | Alta de admin |
| `baja_usuario` | Usuario desactivado |
| `alta_usuario` | Usuario reactivado |
| `cron_pago_generacion` | Generación mensual de pagos |

## Cambio forzoso de contraseña — Flujo completo

1. **Activación:** `crearCliente`, `crearEmpleado`, `resetearPassword` setean `forzar_cambio_password: true`. El JWT emitido lleva la flag.
2. **Detección:** `AuthContext` decodifica el JWT al cargar. `usuario.forzar_cambio_password === true`.
3. **Bloqueo de UI:** `App.jsx` monta `<ModalCambiarContrasena forzado />` por encima de toda la app. **No se puede cerrar** (`cerrable={false}` en `ModalBase`).
4. **Cambio:** `PATCH /api/auth/cambiar-contrasena`.
5. **Desactivación:** backend setea `forzar_cambio_password: false` y emite JWT nuevo sin la flag.
6. **Cierre:** `actualizarToken(data.token)` → el modal se desmonta automáticamente.

## Gotchas

- **Respuesta genérica + timing constante en login:** correo inexistente y contraseña incorrecta devuelven el mismo 401 `"Credenciales incorrectas"`. `bcrypt.compare` se ejecuta siempre, contra `HASH_DUMMY` si el correo no existe, para que la latencia no permita enumerar cuentas. No introducir un `return` temprano cuando `findOne` devuelva `null`.
- **Cookies cross-origin en prod:** `sameSite: 'none', secure: true` + `withCredentials: true` en axios. Si falla auth en prod, revisar primero CORS (`FRONTEND_URL`) y cookies en DevTools.
- **`verificar2FA` borra el OTP antes de devolver el token.** Si la respuesta falla en tránsito, el usuario tiene que repetir login (y se le manda nuevo OTP).
- **`cookieOpciones` del logout debe coincidir con la del login.** Si no, el navegador no borra la cookie en prod.
- **`validarLogin` no valida formato de contraseña.** Solo en login (para no bloquear usuarios con contraseñas antiguas).
- **Baja lógica (`activo: false`)** corta sesión en `login` (403 `"Cuenta deshabilitada"`) y `refresh` (401 `"Sesión inválida"`). El JWT de acceso vivo (máx 15m) sigue siendo válido hasta su expiración natural.
