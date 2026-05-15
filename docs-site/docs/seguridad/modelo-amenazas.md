---
title: Modelo de amenazas
sidebar_position: 1
description: Aplicación de STRIDE light al proyecto.
tags: [seguridad, stride]
---

Aplicación de **STRIDE light** a GymSuite. Para cada categoría: amenazas relevantes, vector y mitigaciones implementadas.

> ℹ️ **Alcance**
>
> GymSuite es un proyecto académico. Este modelo cubre las amenazas más obvias del stack web típico. **No es** un análisis exhaustivo de seguridad para producción real con datos sensibles.

## S — Spoofing (suplantación)

| Amenaza | Vector | Mitigación |
|---------|--------|-----------|
| Suplantar a otro usuario | Login con credenciales robadas | Contraseñas hasheadas (bcrypt 10 rounds) + 2FA por email |
| Token robado | XSS o filtración cookie no-httpOnly | Refresh token httpOnly; JWT acceso vive 2h; 2FA cookie 30 días |
| Cron API impersonado | Llamar `/generar-cron` sin permiso | Header `x-cron-secret` con valor secreto |

## T — Tampering (manipulación)

| Amenaza | Vector | Mitigación |
|---------|--------|-----------|
| Modificar JWT en cliente | Cambiar payload del token | Firma HS256 verificada en cada request (`JWT_SECRET`) |
| Modificar cookies httpOnly | — | Firmadas por backend; verificación con `JWT_REFRESH_SECRET` |
| Enviar `cliente_id` arbitrario en medición | Form alterado | `entrenador_id` se toma de `req.usuario.id`; `validarEditarMedicion` rechaza cambio de `cliente_id` |
| Inyección Mongo | Body malicioso | Mongoose castea según schema; validadores chequean ranges/regex |
| XSS en outputs | Datos del usuario sin sanitizar | React escapa por defecto el JSX (sin `dangerouslySetInnerHTML`) |

## R — Repudio

| Amenaza | Vector | Mitigación |
|---------|--------|-----------|
| Usuario niega haber confirmado un pago | — | `pagos.registrado_por` guarda `req.usuario.id` + `fecha` del confirm |
| Usuario niega haber sido medido | — | `mediciones.entrenador_id` guarda quién registró |

> ⚠️ **Sin audit log**
>
> No hay log de auditoría completo. Los `registrado_por` y `entrenador_id` permiten trazabilidad básica pero no de cambios (editar / borrar). Para producción real: añadir log de cambios.

## I — Information disclosure

| Amenaza | Vector | Mitigación |
|---------|--------|-----------|
| Filtrar emails / DNIs vía respuestas | Mensajes de error verbosos | Login devuelve "Credenciales inválidas" genérico (no distingue email no existe vs password mal) |
| Cliente ve datos de otro cliente | Llamar a `/api/clientes/perfil` con IDs ajenos | El controller lee `req.usuario.id`, ignora params |
| Contraseñas en logs | `console.log` en controllers | Nunca loguear `req.body` completo en endpoints de auth |
| Tráfico interceptado | HTTP plano | HTTPS obligatorio en prod (Vercel) |
| `process.env` filtrado en cliente | Bundle Vite | Vite solo expone vars que empiezan por `VITE_` |
| CORS abierto | Origen `*` con credentials | En prod, `cors({ origin: FRONTEND_URL, credentials: true })` |

## D — Denial of service

| Amenaza | Vector | Mitigación |
|---------|--------|-----------|
| Spam de login | Probar contraseñas | bcrypt es **costoso por diseño** (10 rounds ≈ ms); 2FA mete latencia adicional |
| Spam de creación de cuentas | Crear usuarios masivos | Solo admin/entrenador pueden crear |
| Spam OTP | Pedir OTPs masivos | `findOneAndUpdate({ correo }, ..., upsert)` sobrescribe el anterior — no acumula |
| Generar cuotas masivas | POST `/generar` repetido | El controller filtra clientes con pago del mes existente (`distinct + Set`) — idempotente |
| Vercel timeout | Función > 10s | Generación con muchos clientes podría exceder. Monitorizar |

> ⚠️ **Sin rate limiting**
>
> No hay `express-rate-limit` ni similar. Para producción real: añadir limit por IP en endpoints públicos (login, refresh, verificar-2fa).

## E — Elevation of privilege

| Amenaza | Vector | Mitigación |
|---------|--------|-----------|
| Cliente accede a `/admin` | Manipulación del frontend | Backend valida `verificarRol('admin')` en cada endpoint admin |
| Crear admin vía `POST /api/entrenadores` | Pasar `rol: 'admin'` en body | `verificarRolBody('entrenador')` exige `req.body.rol === 'entrenador'` |
| Listar admins vía `?rol=admin` en `/api/entrenadores` | Query manipulada | `forzarRolQuery('entrenador')` sobrescribe `req.query.rol` |
| Editar cliente desde ruta de entrenador | `PUT /api/entrenadores/:id` con id de cliente | 403 si el target es cliente |
| Reactivar admin con cuenta de entrenador | `PATCH /api/administradores/:id/alta` | `verificarRol('admin')` exigido |

## Threat checklist por endpoint

| Endpoint | Riesgo principal | Mitigación |
|----------|------------------|-----------|
| `POST /api/auth/login` | Brute force | bcrypt costoso, 2FA, sin rate limit (TODO) |
| `POST /api/auth/refresh` | Robo refresh | `httpOnly` + `secure` + `sameSite` + 7d |
| `POST /api/pagos/generar-cron` | Llamada no autorizada | `x-cron-secret` |
| `POST /api/clientes` | Spam | Restringido a admin/entrenador |
| `PATCH /api/auth/resetear-password/:id` | Reset masivo | Restringido a admin |

## Lecturas relacionadas

- [Tokens JWT y refresh](./tokens.md)
- [Cookies](./cookies.md)
- [2FA](./2fa.md)
- [bcrypt](./bcrypt.md)
- [Arquitectura → Modelo de roles](../arquitectura/modelo-roles.md)
