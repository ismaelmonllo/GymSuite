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
| 401 | Credenciales inválidas |
| 403 | Cuenta no coincide con la pestaña (`tab`) |
| 404 | Usuario no encontrado |

**Notas:**
- Si cookie `2fa_verificado` presente: salta el OTP.
- Si `DISABLE_2FA=true`: salta el OTP siempre (solo dev).

## `POST /api/auth/verificar-2fa`

Verifica el OTP enviado al email y emite tokens.

**Permisos:** público.

**Body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `correo` | string | sí | Email del usuario |
| `codigo` | string | sí | 6 dígitos |

**200:**

```json
{ "token": "..." }
```

Setea cookie `2fa_verificado` (30 días) y cookie `refresh_token` (7 días).

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | Faltan datos |
| 401 | Código no encontrado, expirado o incorrecto |
| 404 | Usuario no encontrado |

## `POST /api/auth/refresh`

Renueva el JWT de acceso a partir del refresh token en cookie.

**Permisos:** público (lee cookie `refresh_token`).

**Sin body.**

**200:**

```json
{ "token": "<nuevo JWT 2h>" }
```

**Errores:**

| Código | Causa |
|--------|-------|
| 401 | Sin cookie, inválida o expirada |

**Nota:** el refresh **no** rota. La cookie sigue viva hasta su expiración natural. Ver [ADR-007](../../arquitectura/decisiones.md#jwt-js).

## `POST /api/auth/logout`

Cierra sesión. Limpia cookie `refresh_token`.

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

Genera contraseña temporal con `generarPasswordTemporal()`, hashea con bcrypt, marca `forzar_cambio_password=true`, envía por email.

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | ID inválido |
| 404 | Usuario no encontrado |

## Lecturas relacionadas

- [Auth flujo](../auth-flujo.md) — diagramas de secuencia (login, 2FA, refresh, reset)
- [Seguridad → Tokens](../../seguridad/tokens.md)
- [Seguridad → 2FA](../../seguridad/2fa.md)
- [Seguridad → bcrypt](../../seguridad/bcrypt.md)
