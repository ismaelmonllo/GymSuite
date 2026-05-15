---
title: Modelo de roles
sidebar_position: 4
description: Permisos de Admin, Entrenador y Cliente sobre cada recurso.
tags: [arquitectura, roles, autorización]
---

GymSuite usa tres roles definidos en la colección `usuarios` por el campo `rol`. La autorización se aplica con dos middlewares: `verificarToken` (token válido) y `verificarRol(...roles)` (uno de los listados).

## Roles

| Rol | Identificador (`rol`) | Cómo se crea |
|-----|------------------------|--------------|
| Administrador | `admin` | `POST /api/administradores` (solo admin) |
| Entrenador | `entrenador` | `POST /api/entrenadores` (solo admin) |
| Cliente | `cliente` | `POST /api/clientes` (admin o entrenador) |

## Matriz de permisos por recurso

Leyenda: ✅ permitido · ⛔ denegado · 🟡 condicional (ver nota).

### Usuarios

| Operación | Admin | Entrenador | Cliente |
|-----------|:-----:|:----------:|:-------:|
| GET `/api/clientes` (listar) | ✅ | ✅ | ⛔ |
| GET `/api/clientes/perfil` (propio) | ⛔ | ⛔ | ✅ |
| GET `/api/clientes/:id` | ✅ | ✅ | ⛔ |
| POST `/api/clientes` | ✅ | ✅ | ⛔ |
| PUT `/api/clientes/:id` | ✅ | ✅ | ⛔ |
| PATCH `/api/clientes/:id/baja\|alta` | ✅ | ✅ | ⛔ |
| PATCH `/api/clientes/:id/cuota` | ✅ | ✅ | ⛔ |
| GET `/api/entrenadores` | ✅ | ⛔ | ⛔ |
| GET `/api/entrenadores/:id` | ✅ | 🟡 propio | ⛔ |
| POST/PUT/PATCH `/api/entrenadores/*` | ✅ | ⛔ | ⛔ |
| `/api/administradores/*` | ✅ | ⛔ | ⛔ |

🟡 Un entrenador solo puede ver/editar **su propio** perfil (middleware `verificarPropioOAdmin`).

### Mediciones

| Operación | Admin | Entrenador | Cliente |
|-----------|:-----:|:----------:|:-------:|
| GET `/api/mediciones` (propias) | ⛔ | ⛔ | ✅ |
| GET `/api/mediciones/cliente/:id` | ⛔ | ✅ | ⛔ |
| GET `/api/mediciones/:id` | ⛔ | ✅ | ✅ |
| POST `/api/mediciones` | ⛔ | ✅ | ⛔ |
| PUT `/api/mediciones/:id` | ⛔ | ✅ | ⛔ |
| DELETE `/api/mediciones/:id` | ⛔ | ✅ | ⛔ |

> ℹ️ **Admin no toca mediciones**
>
> Es **intencional**: el admin gestiona negocio y empleados, no datos de entrenamiento. Solo entrenadores miden a sus clientes.

### Pagos

| Operación | Admin | Entrenador | Cliente |
|-----------|:-----:|:----------:|:-------:|
| GET `/api/pagos/cliente/:id` | ✅ | ✅ | ⛔ |
| GET `/api/pagos/mis-pagos` | ⛔ | ⛔ | ✅ |
| POST `/api/pagos/generar` | ✅ | ✅ | ⛔ |
| POST `/api/pagos/generar-cron` | 🟡 cron | 🟡 cron | 🟡 cron |
| POST `/api/pagos/registrar` | ✅ | ✅ | ⛔ |

🟡 `/generar-cron` no usa JWT — autenticación por header `x-cron-secret`. Ver [Operaciones → Cron](../operaciones/cron-pagos.md).

### Tipos de cuota

| Operación | Admin | Entrenador | Cliente |
|-----------|:-----:|:----------:|:-------:|
| GET `/api/cuotas` | ✅ | ✅ | ⛔ |
| POST/PUT/DELETE `/api/cuotas/*` | ✅ | ⛔ | ⛔ |

### Estadísticas

| Operación | Admin | Entrenador | Cliente |
|-----------|:-----:|:----------:|:-------:|
| GET `/api/stats/*` | ✅ | ⛔ | ⛔ |
| GET `/api/stats/ultimo-pago` | ✅ | ✅ | ⛔ |

<a id="middlewares-de-autorizacion"></a>

## Middlewares de autorización

| Middleware | Uso | Detalle |
|------------|-----|---------|
| `verificarToken` | Todas las rutas privadas | Lee `Authorization: Bearer`, decodifica y asigna `req.usuario` |
| `verificarRol(...roles)` | Restringir por rol | 403 si rol no listado |
| `verificarPropioOAdmin` | Entrenador ve/edita su propio perfil | Admin pasa libre; otro solo si `req.usuario.id === req.params.id` |
| `verificarRolBody(rol)` | Evitar crear admin por ruta de entrenador | Exige `req.body.rol === rolEsperado` |
| `forzarRolQuery(rol)` | Listado de empleados | Sobrescribe `req.query.rol` para filtrar |
| `verificarCronSecret` | `/generar-cron` | Solo header `x-cron-secret` |

Detalle: [Backend → Auth flujo](../backend/auth-flujo.md#middlewares).

## Validación de pestaña en login

El frontend muestra dos pestañas (`Cliente` / `Trabajador`). El backend valida que el rol del usuario corresponde con la pestaña elegida antes de emitir el OTP:

| Pestaña | Roles aceptados |
|---------|------------------|
| `cliente` | `cliente` |
| `trabajador` | `admin`, `entrenador` |

Si no encajan: 403 con mensaje específico. Defensa en profundidad: el frontend también re-valida tras decodificar el JWT (`completarLogin` en `LoginPage`).

## Lecturas relacionadas

- [Backend → Auth flujo](../backend/auth-flujo.md)
- [Frontend → Rutas protegidas](../frontend/rutas-protegidas.md)
- [Seguridad → Tokens](../seguridad/tokens.md)
