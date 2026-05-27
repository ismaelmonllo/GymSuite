---
title: Endpoints de Entrenadores y Admins
sidebar_position: 4
sidebar_label: Entrenadores + Admins
description: Operaciones REST sobre empleados (entrenadores y administradores).
tags: [backend, api, empleados]
---

Endpoints bajo `/api/entrenadores/*` y `/api/administradores/*`. Comparten controller (`usuarioController.js`) y lógica. Se mantienen separados para divergencia futura por rol — **no unificar**.

## Estructura común

| Concepto | Entrenadores | Admins |
|----------|--------------|--------|
| Ruta listado | `/api/entrenadores` | `/api/administradores` |
| Middleware filtro | `forzarRolQuery('entrenador')` | `forzarRolQuery('admin')` |
| Middleware body | `verificarRolBody('entrenador')` | `verificarRolBody('admin')` |
| `verificarPropioOAdmin` en `:id` | sí (entrenador ve solo su perfil) | **no** (admin no se restringe) |
| Quién puede listar | `admin` | `admin` |
| Quién puede crear | `admin` | `admin` |
| Quién puede editar | `admin` | `admin` |

## Entrenadores

<a id="get-apientrenadores"></a>

### `GET /api/entrenadores`

Lista entrenadores activos.

**Permisos:** `verificarToken` + `verificarRol('admin')` + `forzarRolQuery('entrenador')`.

**Query:** `activo` (`'true'` \| `'false'`).

**200:** `{ empleados: [...] }`.

<a id="get-apientrenadoresid"></a>

### `GET /api/entrenadores/:id`

Detalle de un entrenador. Un entrenador solo puede ver **su propio** perfil (`verificarPropioOAdmin`).

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')` + `verificarPropioOAdmin`.

**200:** `{ empleado }`.

**400/404** como en clientes.

<a id="post-apientrenadores"></a>

### `POST /api/entrenadores`

Crea entrenador. Sin campo contraseña (la genera el backend).

**Permisos:** `verificarToken` + `verificarRol('admin')` + `verificarRolBody('entrenador')`.

**Body:**

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `nombre` | string | sí |
| `apellidos` | string | sí |
| `correo` | string | sí |
| `telefono` | string | no |
| `direccion` | string | no |
| `fecha_nacimiento` | string ISO | sí |
| `DNI` | string | sí |
| `rol` | `"entrenador"` | sí (validado por `verificarRolBody`) |

**201:** `{ mensaje, empleado }`. Email de bienvenida con contraseña temporal. `forzar_cambio_password=true`.

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | `{ errores }` o duplicado |
| 409 | `{ inactivos: [...] }` candidatos a reactivar |

<a id="put-apientrenadoresid"></a>

### `PUT /api/entrenadores/:id`

Edita entrenador. Solo pasan al `$set` los campos de la whitelist `CAMPOS_EDITABLES_EMPLEADO`: `nombre`, `apellidos`, `correo`, `telefono`, `direccion`, `fecha_nacimiento`, `DNI`, `sexo`. Cualquier otro campo del body (`activo`, `forzar_cambio_password`, `rol`, `nivel`, `tipo_cuota`, etc.) es ignorado.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**200:** `{ mensaje, empleado }`.

**403:** el target es un cliente (no se puede editar por esta ruta).

<a id="patch-apientrenadoresidbaja"></a>

### `PATCH /api/entrenadores/:id/baja`

**Permisos:** `verificarToken` + `verificarRol('admin')`. **200:** `{ mensaje, usuario }`. Setea `activo: false`; el usuario deja de pasar `login` (403) y `refresh` (401). Detalle: [Auth flujo § Gotchas](../auth-flujo.md#gotchas).

<a id="patch-apientrenadoresidalta"></a>

### `PATCH /api/entrenadores/:id/alta`

**Permisos:** `verificarToken` + `verificarRol('admin')`. **200:** `{ mensaje, usuario }`. Resetea `fecha_alta`.

<a id="delete-apientrenadoresid"></a>

### `DELETE /api/entrenadores/:id`

Borrado físico del entrenador. Para baja lógica usar `PATCH /:id/baja`.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**200:** `{ mensaje, usuario }`. Registra evento `eliminar_usuario` en `audit_logs`.

**Errores:** 400 si el ID no es ObjectId, 404 si no existe.

> ⚠️ **Borrado irreversible**
>
> `findByIdAndDelete` elimina el documento. Las mediciones registradas por el entrenador conservan su `entrenador_id` apuntando a un usuario que ya no existe (referencia rota). Para preservar trazabilidad, preferir la baja lógica.

<a id="administradores"></a>

## Administradores

Idénticos a entrenadores cambiando `forzarRolQuery('admin')` y `verificarRolBody('admin')`. No hay `verificarPropioOAdmin` en `/:id` (a diferencia de entrenadores).

### `GET /api/administradores`

**Permisos:** `verificarToken` + `verificarRol('admin')` + `forzarRolQuery('admin')`. **200:** `{ empleados: [...] }`.

### `GET /api/administradores/:id`

**Permisos:** `verificarToken` + `verificarRol('admin')`. **Sin** `verificarPropioOAdmin`. **200:** `{ empleado }`.

### `POST /api/administradores`

**Permisos:** `verificarToken` + `verificarRol('admin')` + `verificarRolBody('admin')`. Body como entrenador con `rol: "admin"`.

### `PUT /api/administradores/:id`, `PATCH /:id/baja`, `PATCH /:id/alta`

**Permisos:** `verificarToken` + `verificarRol('admin')`.

### `DELETE /api/administradores/:id`

Borrado físico de un administrador. Para baja lógica usar `PATCH /:id/baja`.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**200:** `{ mensaje, usuario }`. Registra evento `eliminar_usuario` en `audit_logs`.

**Errores:** 400 si el ID no es ObjectId, 404 si no existe.

> ⚠️ **Sin protección anti-autoeliminación**
>
> El endpoint no comprueba si el admin que ejecuta el borrado es el mismo que está siendo eliminado. Un administrador puede borrar su propia cuenta. Si esto preocupa, añadir una guarda `if (req.params.id === req.usuario.id) return res.status(403)...`.

## Helpers internos del controller

`server/controllers/usuarioController.js` define dos helpers no exportados:

| Helper | Descripción |
|--------|-------------|
| `detectarDuplicadosAlCrear(DNI, correo, rolNuevo)` | Busca colisiones por DNI (mismo rol) y por correo (global). Devuelve `{ bloqueo }` para 400 o `{ inactivos }` para 409 |
| `proyectarInactivo(usuario)` | Reduce a `{ _id, nombre, apellidos, fecha_nacimiento, DNI, correo, rol }` para `ModalReactivar` |
