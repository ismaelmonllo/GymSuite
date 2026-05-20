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
| Token robado | XSS o filtración cookie no-httpOnly | Refresh token httpOnly; JWT acceso vive 15m; cookie `2fa_verificado` httpOnly, 7 días, firmada con HMAC sobre `id_usuario + hash(User-Agent)` — copiarla a otro navegador la invalida |
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
| Filtrar emails / DNIs vía respuestas | Mensajes de error verbosos | Login devuelve 401 `"Credenciales incorrectas"` genérico para correo inexistente o contraseña mala, y compara siempre contra `HASH_DUMMY` (bcrypt precalculado) si el correo no existe para igualar la latencia |
| Cliente ve datos de otro cliente | Llamar a `/api/clientes/perfil` con IDs ajenos | El controller lee `req.usuario.id`, ignora params |
| Cliente lee mediciones de otro cliente | `GET /api/mediciones/:id` iterando ObjectIds | `obtenerMedicion` compara `medicion.cliente_id === req.usuario.id` cuando el rol es cliente, 403 si no coincide |
| Entrenador edita/borra trabajo de otro entrenador | `PUT`/`DELETE /api/mediciones/:id` con id ajeno | Ownership en controller: `medicion.entrenador_id === req.usuario.id`; 403 si no |
| Contraseñas en logs | `console.log` en controllers | Nunca loguear `req.body` completo en endpoints de auth |
| Tráfico interceptado | HTTP plano | HTTPS obligatorio en prod (Vercel) |
| `process.env` filtrado en cliente | Bundle Vite | Vite solo expone vars que empiezan por `VITE_` |
| CORS abierto | Origen `*` o `true` con credentials | En prod, `cors({ origin: [FRONTEND_URL], credentials: true })`. Si `FRONTEND_URL` falta en `NODE_ENV=production`, la función aborta al arrancar (fail-closed) — nunca cae a `origin: true` por accidente |
| Clickjacking / MIME sniffing / leakage de Referer | Sin headers de seguridad | `helmet` añade `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security` y CSP |

## D — Denial of service

| Amenaza | Vector | Mitigación |
|---------|--------|-----------|
| Spam de login | Probar contraseñas | `limiteAuth` (5 req / 15 min por IP, compartido con `/verificar-2fa`); bcrypt 10 rounds añade coste por intento; 2FA mete latencia adicional |
| Spam de creación de cuentas | Crear usuarios masivos | Solo admin/entrenador pueden crear |
| Spam OTP | Pedir OTPs masivos | `findOneAndUpdate({ correo }, ..., upsert)` sobrescribe el anterior — no acumula |
| Brute force del OTP | Probar las 10⁶ combinaciones en la ventana de 5 min | `Otp.intentos` se incrementa con `$inc` en cada fallo; al 5º intento `verificar2FA` borra el OTP y devuelve 429 obligando a relogin |
| Generar cuotas masivas | POST `/generar` repetido | El controller filtra clientes con pago del mes existente (`distinct + Set`) — idempotente |
| Vercel timeout | Función > 10s | Generación con muchos clientes podría exceder. Monitorizar |

> ℹ️ **Rate limiting**
>
> `express-rate-limit` con tres limitadores: `limiteGlobal` (300 req / 15 min) a toda la API, `limiteAuth` (5 req / 15 min) en login y verificar-2fa, `limiteRefresh` (30 req / 15 min) en refresh. Store en memoria; en Vercel serverless no se comparte entre cold starts — para garantía completa contra brute force distribuido, mover store a Redis (Upstash). Detalle: [Auth flujo § Rate limiting](../backend/auth-flujo.md#rate-limiting).

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
| `POST /api/auth/login` | Brute force | `limiteAuth` (5 req / 15 min), bcrypt costoso, 2FA |
| `POST /api/auth/refresh` | Robo refresh | `httpOnly` + `secure` + `sameSite` + 7d |
| `POST /api/pagos/generar-cron` | Llamada no autorizada | `x-cron-secret` |
| `POST /api/clientes` | Spam | Restringido a admin/entrenador |
| `PATCH /api/auth/resetear-password/:id` | Reset masivo | Restringido a admin |
| `GET /api/mediciones/:id` | IDOR cliente → cliente | Ownership: cliente solo ve `cliente_id === req.usuario.id` |
| `PUT`/`DELETE /api/mediciones/:id` | Entrenador edita/borra mediciones ajenas | Ownership: `entrenador_id === req.usuario.id` |

## Lecturas relacionadas

- [Tokens JWT y refresh](./tokens.md)
- [Cookies](./cookies.md)
- [2FA](./2fa.md)
- [bcrypt](./bcrypt.md)
- [Arquitectura → Modelo de roles](../arquitectura/modelo-roles.md)
