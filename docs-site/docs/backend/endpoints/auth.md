---
title: Endpoints de Auth
sidebar_position: 2
description: Operaciones REST de autenticación, 2FA, refresh y reseteo de contraseñas.
tags: [backend, api, auth]
---

Endpoints bajo `/api/auth/*`. Controller: `server/controllers/authController.js`. Flujo completo + diagramas: [Auth flujo](../auth-flujo.md).

## `POST /api/auth/login`

Inicia sesión. Devuelve token directo o pide 2FA.

**Permisos:** público.

**Rate limit:** `limiteAuth` — 5 req / 15 min por IP, contador compartido con `/verificar-2fa`.

**Body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `correo` | string | sí | Email |
| `contrasena` | string | sí | Contraseña en claro (TLS la cubre) |
| `tab` | `'cliente'` \| `'trabajador'` | sí | Pestaña del formulario |

**200 (sin 2FA):**

```json
{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

Se setea cookie `refresh_token` (httpOnly, 7d).

**200 (con 2FA):**

```json
{ "requiere2FA": true }
```

OTP de 6 dígitos enviado por email. Caducidad 5 min.

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | `{ errores }` validación falló |
| 401 | `"Credenciales incorrectas"` — correo inexistente o contraseña incorrecta (mismo mensaje y latencia en ambos casos) |
| 403 | Cuenta no coincide con la pestaña (`tab`), o cuenta deshabilitada (`activo: false`) → `"Cuenta deshabilitada"` |
| 429 | `"Demasiados intentos. Espera 15 minutos."` |

**Notas:**
- Si cookie `2fa_verificado` presente y `verificar2FACookie` valida la firma frente al `id` del usuario y el `User-Agent` actual: salta el OTP. Si la cookie se copió a otro navegador (UA distinta), se ignora y se sigue al OTP.
- Si `DISABLE_2FA=true` **y** `NODE_ENV !== 'production'`: salta el OTP. En producción el guard ignora la flag aunque esté seteada.
- `bcrypt.compare` se ejecuta también cuando el correo no existe (contra `HASH_DUMMY`) para igualar el tiempo de respuesta y evitar enumeración de cuentas por timing.
- El check de `activo` se evalúa después de `bcrypt.compare` para no filtrar el estado de la cuenta a quien no tiene credenciales válidas.

## `POST /api/auth/verificar-2fa`

Verifica el OTP enviado al email y emite tokens.

**Permisos:** público.

**Rate limit:** `limiteAuth` — 5 req / 15 min por IP, contador compartido con `/login`.

**Body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `correo` | string | sí | Email del usuario |
| `codigo` | string | sí | 6 dígitos |

**200:**

```json
{ "token": "..." }
```

Setea cookie `2fa_verificado` firmada (7 días, HMAC sobre `id_usuario + hash(User-Agent)`) y cookie `refresh_token` (7 días).

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | Faltan datos |
| 401 | Código no encontrado, expirado o incorrecto. Cada fallo incrementa `Otp.intentos` |
| 404 | Usuario no encontrado |
| 429 | `"Demasiados intentos. Espera 15 minutos."` (tope `limiteAuth` por IP) **o** `"Demasiados intentos. Vuelve a iniciar sesión."` (5 OTPs fallidos sobre el mismo correo: el OTP se invalida y obliga a relogin) |

## `POST /api/auth/refresh`

Renueva el JWT de acceso a partir del refresh token en cookie.

**Permisos:** público (lee cookie `refresh_token`).

**Rate limit:** `limiteRefresh` — 30 req / 15 min por IP.

**Sin body.**

**200:**

```json
{ "token": "<nuevo JWT 15m>" }
```

**Errores:**

| Código | Causa |
|--------|-------|
| 401 | Sin cookie, inválida o expirada, o `usuario.activo === false` → `"Sesión inválida"` |
| 429 | Tope de refresh superado |

**Nota:** el refresh **no** rota. La cookie sigue viva hasta su expiración natural. Ver [ADR-007](../../arquitectura/decisiones.md#jwt-js).

## `POST /api/auth/logout`

Cierra sesión. Limpia cookies `refresh_token` y `2fa_verificado`.

**Permisos:** público.

**Sin body.**

**200:**

```json
{ "mensaje": "Sesión cerrada" }
```

> ⚠️ **Coincidir opciones de cookie**
>
> La cookie se borra con las mismas opciones (`httpOnly`, `sameSite`, `secure`) que cuando se setó. En prod, si `sameSite` o `secure` no coinciden, el navegador no la borra.

## `PATCH /api/auth/cambiar-contrasena`

Cambia la propia contraseña.

**Permisos:** `verificarToken`.

**Body:**

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `contrasenaActual` | string | sí |
| `contrasenaNueva` | string | sí — válida: 12+, min, may, num, símb |

**200:**

```json
{ "ok": true, "token": "<nuevo JWT sin forzar_cambio_password>" }
```

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | `{ errores }` validación falló |
| 401 | Contraseña actual incorrecta |

**Nota:** el frontend llama a `actualizarToken(data.token)` para refrescar la sesión y cerrar el modal forzado automáticamente.

## `PATCH /api/auth/resetear-password/:id`

Un admin resetea la contraseña de otro usuario.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**Params:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | ObjectId | Usuario a resetear |

**200:**

```json
{ "ok": true }
```

Genera token `crypto.randomBytes(32)` (64 hex), lo guarda en `reset_tokens` con TTL de 30 min (upsert — solo uno activo por usuario), y envía email con el link `${FRONTEND_URL}/restablecer/<token>`. La contraseña actual **no cambia**.

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | ID inválido |
| 404 | Usuario no encontrado |

## `POST /api/auth/restablecer-password`

Aplica la nueva contraseña usando el token del link de email. **Público** (sin JWT).

**Body:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `token` | string | Token del link (`/restablecer/:token`) |
| `contrasenaNueva` | string | Nueva contraseña (mínimo 8 chars) |

**200:**

```json
{ "ok": true }
```

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | Token ausente, inválido, ya usado o caducado |

## Lecturas relacionadas

- [Auth flujo](../auth-flujo.md) — diagramas de secuencia (login, 2FA, refresh, reset)
- [Seguridad → Tokens](../../seguridad/tokens.md)
- [Seguridad → 2FA](../../seguridad/2fa.md)
- [Seguridad → bcrypt](../../seguridad/bcrypt.md)
