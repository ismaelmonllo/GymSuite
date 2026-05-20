---
title: Visión general de la API
sidebar_position: 1
sidebar_label: Visión general
description: Tabla maestra de todos los endpoints disponibles.
tags: [backend, api, endpoints]
---

Tabla canónica de todos los endpoints. Prefijo común: `/api`. Todas las rutas autenticadas esperan header `Authorization: Bearer <jwt>` salvo que se indique otra cosa.

## Convenciones

- **Respuestas de error:** `{ mensaje: string }` o `{ errores: [{ campo, error }] }` para validación.
- **Permisos:** combinación de middlewares — `verificarToken` exige JWT; `verificarRol(...)` exige rol; `verificarCronSecret` exige header.
- **Importes** siempre en céntimos. Ver [Decisiones](../../arquitectura/decisiones.md#centimos).
- **Rate limit:** todas las rutas pasan por `limiteGlobal` (300 req / 15 min por IP). Las rutas de auth tienen limitadores más estrictos (ver [Auth flujo § Rate limiting](../auth-flujo.md#rate-limiting)). Superar el tope devuelve **429** con `{ mensaje }` y headers `RateLimit-*`.

## Tabla maestra

| Método | Ruta | Rol mínimo | Descripción | Detalle |
|--------|------|------------|-------------|---------|
| POST | `/api/auth/login` | público | Login con email + password + tab | [Auth](./auth.md#post-apiauthlogin) |
| POST | `/api/auth/verificar-2fa` | público | Verifica OTP de 6 dígitos | [Auth](./auth.md#post-apiauthverificar-2fa) |
| POST | `/api/auth/refresh` | público (cookie) | Renueva JWT | [Auth](./auth.md#post-apiauthrefresh) |
| POST | `/api/auth/logout` | público | Cierra sesión | [Auth](./auth.md#post-apiauthlogout) |
| PATCH | `/api/auth/cambiar-contrasena` | autenticado | Cambia propia contraseña | [Auth](./auth.md#patch-apiauthcambiar-contrasena) |
| PATCH | `/api/auth/resetear-password/:id` | admin | Resetea contraseña de otro usuario | [Auth](./auth.md#patch-apiauthresetear-passwordid) |
| GET | `/api/clientes` | admin, entrenador | Lista clientes | [Clientes](./clientes.md#get-apiclientes) |
| GET | `/api/clientes/perfil` | cliente | Perfil propio | [Clientes](./clientes.md#get-apiclientesperfil) |
| GET | `/api/clientes/:id` | admin, entrenador | Detalle cliente | [Clientes](./clientes.md#get-apiclientesid) |
| POST | `/api/clientes` | admin, entrenador | Crea cliente | [Clientes](./clientes.md#post-apiclientes) |
| PUT | `/api/clientes/:id` | admin, entrenador | Edita cliente | [Clientes](./clientes.md#put-apiclientesid) |
| PATCH | `/api/clientes/:id/baja` | admin, entrenador | Baja lógica | [Clientes](./clientes.md#patch-apiclientesidbaja) |
| PATCH | `/api/clientes/:id/alta` | admin, entrenador | Reactiva | [Clientes](./clientes.md#patch-apiclientesidalta) |
| PATCH | `/api/clientes/:id/cuota` | admin, entrenador | Cambia tipo de cuota | [Clientes](./clientes.md#patch-apiclientesidcuota) |
| GET | `/api/entrenadores` | admin | Lista entrenadores | [Usuarios](./usuarios.md#get-apientrenadores) |
| GET | `/api/entrenadores/:id` | admin / propio | Detalle entrenador | [Usuarios](./usuarios.md#get-apientrenadoresid) |
| POST | `/api/entrenadores` | admin | Crea entrenador | [Usuarios](./usuarios.md#post-apientrenadores) |
| PUT | `/api/entrenadores/:id` | admin | Edita entrenador | [Usuarios](./usuarios.md#put-apientrenadoresid) |
| PATCH | `/api/entrenadores/:id/baja\|alta` | admin | Baja/alta | [Usuarios](./usuarios.md) |
| GET/POST/PUT/PATCH | `/api/administradores/*` | admin | Igual que entrenadores | [Usuarios](./usuarios.md#administradores) |
| GET | `/api/mediciones` | cliente | Propias mediciones | [Mediciones](./mediciones.md#get-apimediciones) |
| GET | `/api/mediciones/cliente/:id` | entrenador | Mediciones de un cliente | [Mediciones](./mediciones.md#get-apimedicionesclienteid) |
| GET | `/api/mediciones/:id` | cliente, entrenador | Detalle medición | [Mediciones](./mediciones.md#get-apimedicionesid) |
| POST | `/api/mediciones` | entrenador | Crea medición | [Mediciones](./mediciones.md#post-apimediciones) |
| PUT | `/api/mediciones/:id` | entrenador | Edita medición | [Mediciones](./mediciones.md#put-apimedicionesid) |
| DELETE | `/api/mediciones/:id` | entrenador | Borra medición | [Mediciones](./mediciones.md#delete-apimedicionesid) |
| GET | `/api/pagos/cliente/:id` | admin, entrenador | Historial cliente | [Pagos](./pagos.md#get-apipagosclienteid) |
| GET | `/api/pagos/mis-pagos` | cliente | Pagos propios | [Pagos](./pagos.md#get-apipagosmis-pagos) |
| POST | `/api/pagos/generar` | admin, entrenador | Genera pagos del mes | [Pagos](./pagos.md#post-apipagosgenerar) |
| POST | `/api/pagos/generar-cron` | cron-secret | Cron mensual | [Pagos](./pagos.md#post-apipagosgenerar-cron) |
| POST | `/api/pagos/registrar` | admin, entrenador | Confirma grupo de pago | [Pagos](./pagos.md#post-apipagosregistrar) |
| GET | `/api/cuotas` | admin, entrenador | Lista tipos cuota | [Tipos cuota](./tipos-cuota.md#get-apicuotas) |
| POST | `/api/cuotas` | admin | Crea tipo cuota | [Tipos cuota](./tipos-cuota.md#post-apicuotas) |
| PUT | `/api/cuotas/:id` | admin | Edita tipo cuota | [Tipos cuota](./tipos-cuota.md#put-apicuotasid) |
| DELETE | `/api/cuotas/:id` | admin | Borra tipo cuota | [Tipos cuota](./tipos-cuota.md#delete-apicuotasid) |
| GET | `/api/stats/mes` | admin | Facturación del mes | [Stats](./stats.md#get-apistatsmes) |
| GET | `/api/stats/anual` | admin | Facturación últimos 12 meses | [Stats](./stats.md#get-apistatsanual) |
| GET | `/api/stats/mes-pagados` | admin | Nº pagos confirmados del mes | [Stats](./stats.md#get-apistatsmes-pagados) |
| GET | `/api/stats/mes-pendientes` | admin | Nº pagos pendientes del mes | [Stats](./stats.md#get-apistatsmes-pendientes) |
| GET | `/api/stats/total-clientes` | admin | Clientes activos | [Stats](./stats.md#get-apistatstotal-clientes) |
| GET | `/api/stats/total-trabajadores` | admin | Empleados activos | [Stats](./stats.md#get-apistatstotal-trabajadores) |
| GET | `/api/stats/altas-mensuales` | admin | Altas mes/año | [Stats](./stats.md#get-apistatsaltas-mensuales) |
| GET | `/api/stats/ultimo-pago` | admin, entrenador | Mapa último pago por cliente | [Stats](./stats.md#get-apistatsultimo-pago) |
| GET | `/api/health` | público | Estado servidor + Mongo | — |
| GET | `/api/docs` | público | Swagger UI | — |
| GET | `/api/docs/spec` | público | JSON OpenAPI | — |

## Códigos HTTP comunes

| Código | Significado en el proyecto |
|--------|-----------------------------|
| 200 | OK |
| 201 | Recurso creado |
| 400 | Validación falló (`{ errores }`) o ID malformado |
| 401 | Sin token, token inválido o credenciales mal |
| 403 | Token válido pero rol insuficiente |
| 404 | Recurso no encontrado |
| 409 | Duplicado / candidato a reactivar (`{ inactivos: [...] }`) |
| 500 | Error inesperado del servidor |
| 503 | Backend up pero Mongo no conectado (`/api/health`) |

Detalle: [Errores del backend](../errores.md).
