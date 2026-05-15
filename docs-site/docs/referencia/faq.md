---
title: Preguntas frecuentes
sidebar_position: 2
description: Respuestas rápidas a dudas comunes.
tags: [referencia, faq]
---

Preguntas que aparecen una y otra vez al trabajar con GymSuite.

## ¿Por qué los importes están en céntimos y no en euros?

Para evitar errores de coma flotante al repartir un importe total entre N meses. `0.1 + 0.2 !== 0.3` en JavaScript — sumas acumuladas divergen del total. Con enteros (céntimos) `Math.floor(importe / meses)` + último mes con resto = suma exacta.

Detalle: [ADR-002](../arquitectura/decisiones.md#centimos).

## ¿Cómo desactivo el 2FA en desarrollo?

Setea en `server/.env`:

```env
DISABLE_2FA=true
```

Reinicia backend. El login emite token directo sin pedir OTP por email.

**Nunca en prod.** Ver [2FA](../seguridad/2fa.md#how-to-desactivar-2fa-en-desarrollo).

## ¿Por qué `bcrypt@5.1.1` y no la última?

La versión `^6.0.0` que algún ejemplo online sugiere **no existe en npm** y rompe el `npm install` en Vercel. Las versiones 5.1.x son estables y mantenidas.

Detalle: [ADR-001](../arquitectura/decisiones.md#bcrypt-510).

## ¿Qué pasa si MongoDB Atlas se cae?

`server/config/db.js` intenta `MONGODB_URI_BACKUP` antes de rendirse. Si ambas caen, el backend responde 500. `/api/health` reporta el estado.

Detalle: [Backup MongoDB](../operaciones/backup-mongo.md).

## ¿El cron pide auth?

Sí, pero **no con JWT**. El endpoint `POST /api/pagos/generar-cron` usa middleware `verificarCronSecret` que comprueba el header `x-cron-secret` contra `process.env.CRON_SECRET`. Cron-job.org se autentica así porque no puede gestionar tokens JWT.

Detalle: [Cron de pagos](../operaciones/cron-pagos.md).

## ¿Puede un cliente ver datos de otro cliente?

No. El backend usa **`req.usuario.id` del JWT**, no el id del request. Endpoints como `/api/clientes/perfil`, `/api/pagos/mis-pagos`, `/api/mediciones` solo devuelven datos del usuario autenticado.

Los endpoints con `:id` (como `/api/clientes/:id`) están restringidos a `admin` o `entrenador` por middleware `verificarRol`.

## ¿Por qué hay rutas separadas `/api/entrenadores` y `/api/administradores` si comparten código?

Para permitir **divergencia futura por rol** sin refactor masivo. Si mañana los admins tienen una operación específica (ej: ver logs), añade el endpoint en `administradoresRoutes.js` sin tocar entrenadores. Coste: pequeña duplicación.

## ¿Por qué la cookie `token` es accesible por JS si los tokens deberían ser httpOnly?

Trade-off intencional. El frontend necesita leer el JWT de `document.cookie` para inyectarlo como `Authorization: Bearer` (estándar industria). Si fuera httpOnly, el backend tendría que leerlo de cookie en lugar de header — refactor grande de todos los controllers.

El **refresh token** (más sensible) sí está en `httpOnly`. Robar el JWT acceso da 2h de impacto máximo, no permanente.

Detalle: [ADR-007](../arquitectura/decisiones.md#jwt-js).

## ¿Por qué `validarLogin` no valida formato de contraseña?

Para no bloquear usuarios con contraseñas antiguas. Si subimos la política (ej: de 8 a 12 caracteres mínimos) y validamos en login, los usuarios viejos se quedarían fuera. En login se acepta cualquier cadena no vacía y la comparación la hace bcrypt.

Detalle: [Validadores](../backend/validadores.md).

## ¿Por qué el DNI / teléfono no coincide con los reales?

Validadores mockeados: DNI `% 19` (oficial: 23), teléfono prefijo `5` (oficial: 6/7/8/9). Razón: proyecto académico — datos de prueba no deben coincidir con personas reales.

Volver a producción: cambiar divisor a 23 y prefijo a 6/7/8/9 en `validarCampos.js`. Ningún otro código depende del valor concreto.

Detalle: [ADR-005](../arquitectura/decisiones.md#mocking-dni).

## ¿Qué pasa si cambio la cuota de un cliente a mitad de mes?

`PATCH /api/clientes/:id/cuota`:
1. Actualiza `cliente.tipo_cuota`.
2. **Elimina** los pagos pendientes del cliente (`deleteMany({ cliente_id, pendiente: true })`).
3. Los pagos **confirmados** se conservan.

Al siguiente `generarPagos`, se crean con la nueva cuota.

Detalle: [Pagos lógica](../backend/pagos-logica.md).

## ¿Cómo testeo en local sin afectar a Atlas de prod?

Usa un cluster Atlas distinto para dev (gratis con M0). `MONGODB_URI` apunta al cluster de dev en `server/.env`; Vercel apunta al cluster de prod.

Para datos de ejemplo: `node seed.js` en `server/`.

## ¿Cómo añado un nuevo endpoint?

1. Crear / extender el controller en `server/controllers/`.
2. Validador (atómico + compuesto) en `server/validators/`.
3. Ruta + middlewares en `server/routes/<dominio>Routes.js`.
4. Comentarios `@swagger` para que aparezca en `/api/docs`.
5. Documentar en `docs-site/docs/backend/endpoints/<dominio>.md`.

Detalle: [Estructura del backend](../backend/estructura.md).

## ¿Cómo reseteo la contraseña de un usuario?

Como admin: `PATCH /api/auth/resetear-password/:id`. Genera contraseña temporal, hashea con bcrypt, envía por email, marca `forzar_cambio_password=true`.

El usuario afectado verá el modal forzoso en su próximo login.

Como usuario propio: `PATCH /api/auth/cambiar-contrasena` con `contrasenaActual` + `contrasenaNueva`.
