---
title: Códigos de error
sidebar_position: 3
description: Tabla unificada de mensajes de error del backend.
tags: [referencia, errores]
---

Mensajes literales devueltos por el backend, agrupados por código HTTP. Útil para grep / búsqueda rápida.

## 400 — Bad Request

| Mensaje / forma | Endpoint(s) | Causa |
|------------------|-------------|-------|
| `{ "errores": [{ "campo": "...", "error": "..." }] }` | múltiples | Validación falló |
| `"Email y contraseña obligatorios"` o equivalente | `/api/auth/login` | Faltan campos |
| `"ID inválido"` | endpoints con `:id` | No es ObjectId |
| `"ID de cuota inválido"` | `PATCH /api/clientes/:id/cuota` | `nuevaCuota` no es ObjectId |
| `"Validación falló"` con `{ campo, mensaje }` | crear clientes/empleados | Duplicado activo |

### Errores específicos por validador

| Validador | Mensajes literales típicos |
|-----------|----------------------------|
| `validarNombre` | "Nombre no válido" |
| `validarCorreo` | "Correo no válido" |
| `validarContrasena` | "Contraseña debe tener mínimo 12 caracteres con minúscula, mayúscula, número y símbolo" |
| `validarDNI` | "DNI no válido" |
| `validarTelefono` | "Teléfono no válido" |
| `validarFechaNacimiento` | "Edad debe estar entre 16 y 120 años" / "Fecha no puede ser futura" |
| `validarImporte` | "Importe debe ser un número entero positivo en céntimos" |
| `validarMeses` | "Meses debe ser un entero entre 1 y 24" |
| `validarMedicion` | "Valor fuera de rango para `<campo>`" |
| `validarObjectId` | "ID no válido" |

## 401 — Unauthorized

| Mensaje | Endpoint(s) | Causa |
|---------|-------------|-------|
| `"Token no proporcionado"` | rutas con `verificarToken` | Sin header `Authorization` |
| `"Token inválido o expirado"` | rutas con `verificarToken` | `jwt.verify` falló |
| `"Credenciales incorrectas"` | `/api/auth/login` | bcrypt.compare falló o correo inexistente (mismo mensaje y latencia) |
| `"Contraseña actual incorrecta"` | `/api/auth/cambiar-contrasena` | bcrypt.compare falló |
| `"No hay código pendiente"` o equivalente | `/api/auth/verificar-2fa` | OTP no encontrado |
| `"Código expirado"` | `/api/auth/verificar-2fa` | `Date.now() > expira` |
| `"Código incorrecto"` | `/api/auth/verificar-2fa` | OTP no coincide |
| `"Refresh token no proporcionado"` | `/api/auth/refresh` | Sin cookie |
| `"Refresh token inválido"` | `/api/auth/refresh` | `jwt.verify` falló |
| `"No autorizado"` | `/api/pagos/generar-cron` | Header `x-cron-secret` mal |

## 403 — Forbidden

| Mensaje | Endpoint(s) | Causa |
|---------|-------------|-------|
| `"Acceso denegado"` | rutas con `verificarRol` | Rol no en lista |
| `"Esta cuenta no es de cliente. Usa la pestaña Trabajador."` | `/api/auth/login` | tab=cliente pero rol≠cliente |
| `"Esta cuenta no es de trabajador. Usa la pestaña Cliente."` | `/api/auth/login` | tab=trabajador pero rol=cliente |
| `"Solo puedes ver tu propio perfil"` | `GET /api/entrenadores/:id` | `verificarPropioOAdmin` |
| `"No se puede editar un cliente desde esta ruta"` | `PUT /api/entrenadores/:id` | Target es cliente |
| `"Rol incorrecto en el body"` | crear empleado | `verificarRolBody` |
| `"Acceso denegado"` | `GET /api/mediciones/:id` | Cliente intenta leer medición de otro cliente |
| `"Solo el entrenador que la registró puede modificarla"` | `PUT /api/mediciones/:id` | Otro entrenador intenta editar |
| `"Solo el entrenador que la registró puede eliminarla"` | `DELETE /api/mediciones/:id` | Otro entrenador intenta borrar |

## 404 — Not Found

| Mensaje | Endpoint(s) | Causa |
|---------|-------------|-------|
| `"Usuario no encontrado"` | múltiples | `findById` devolvió null |
| `"Cliente no encontrado"` | `/api/clientes/*` | — |
| `"Empleado no encontrado"` | `/api/entrenadores/*`, `/api/administradores/*` | — |
| `"Medición no encontrada"` | `/api/mediciones/*` | — |
| `"Sin mediciones registradas"` | `GET /api/mediciones[/cliente/:id]` | `find` devolvió array vacío |
| `"Sin pagos registrados"` | `GET /api/pagos/*` | `find` devolvió array vacío |
| `"Grupo de pago no encontrado"` | `POST /api/pagos/registrar` | `findOne` devolvió null |
| `"Tipo de cuota no encontrado"` | `/api/cuotas/:id` | — |

## 429 — Too Many Requests

| Mensaje | Endpoint(s) | Causa |
|---------|-------------|-------|
| `"Demasiados intentos. Espera 15 minutos."` | `/api/auth/login`, `/api/auth/verificar-2fa` | `limiteAuth` superado (5 req / 15 min por IP, contador compartido entre ambas) |
| `"Demasiados intentos. Vuelve a iniciar sesión."` | `/api/auth/verificar-2fa` | 5 OTPs fallidos sobre el mismo correo; el OTP se invalida y obliga a relogin |
| `"Too many requests, please try again later."` (default `express-rate-limit`) | `/api/auth/refresh` | `limiteRefresh` superado (30 req / 15 min) |
| `"Too many requests, please try again later."` | cualquier endpoint | `limiteGlobal` superado (300 req / 15 min) |

Cabeceras estándar en todas las respuestas con rate limit aplicado: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

## 409 — Conflict

| Forma | Endpoint(s) | Causa |
|-------|-------------|-------|
| `{ "inactivos": [...] }` | crear cliente/empleado | Coincide con usuario(s) de baja del mismo rol |

Estructura completa: ver [Errores del backend](../backend/errores.md#error-de-duplicado-al-crear-campo-concreto).

## 500 — Internal Server Error

| Mensaje | Causa |
|---------|-------|
| `"Error al ..."` (genérico por endpoint) | Excepción no controlada (try/catch general) |

## 503 — Service Unavailable

| Mensaje | Endpoint | Causa |
|---------|----------|-------|
| `{ "estado": "degradado", "mongo": "desconectado" }` | `/api/health` | `readyState !== 1` |

## Formato canónico

Casi todos los errores siguen una de estas dos formas:

```json
{ "mensaje": "..." }
```

```json
{ "errores": [
  { "campo": "correo", "error": "Correo no válido" },
  { "campo": "DNI", "error": "DNI no válido" }
] }
```

El frontend distingue por la presencia de `errores` (validación → pintar bajo inputs) vs `mensaje` (genérico → toast / modal).

## Lecturas relacionadas

- [Backend → Errores](../backend/errores.md) — formato + buenas prácticas
- [Backend → Validadores](../backend/validadores.md) — qué valida cada uno
- [Troubleshooting](./troubleshooting.md) — síntoma → solución
